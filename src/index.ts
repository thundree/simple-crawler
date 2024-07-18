import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";

import {
  mkdirRecursive,
  getFormattedTimestamp,
  generateFilename,
  logResult,
  createScreenshotDir,
} from "./utils";
import {
  acceptCookies,
  scrollPageToBottom,
  checkForErrorMessage,
  clickMoreLinks,
  getHeadersContent,
  normalizeUrl,
} from "./pageUtils";
import { validateOgImage } from "./ogImageValidator";

const rootUrls: string[] = [];

const allLinks: Set<string> = new Set();
const visitedLinks: Set<string> = new Set();

const processPage = async (
  browser: Browser,
  url: string,
  screenshotDirRoot: string,
  logBaseDir: string,
  validateOgImages: boolean,
  validateHeaderTags: boolean = false,
  takeScreenshots: boolean = false
): Promise<void> => {
  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const status: number = response?.status() ?? 0;

  await acceptCookies(page);

  if (takeScreenshots) {
    await scrollPageToBottom(page);

    const screenshotDir = createScreenshotDir(url, screenshotDirRoot);
    const screenshotPath = path.join(
      screenshotDir,
      generateFilename("index", "webp")
    );

    console.log(`Screenshot: ${url}`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: "webp",
      quality: 70,
    });
  }

  if (validateHeaderTags) {
    const headersContent = await getHeadersContent(page);
    let logMessage: string[] = [];

    Object.keys(headersContent).forEach((header, index) => {
      logMessage.push(
        headersContent?.[header]
          ? `"${header}" Encontrado`
          : `"${header}" Não encontrado`
      );
    });

    logResult(
      `${logBaseDir}/tags`,
      "headings.txt",
      `${url} - ${logMessage.join(", ")}`
    );
  }

  if (validateOgImages) {
    const ogImageInfo = await validateOgImage(page);
    const ogLogFile = ogImageInfo.valid ? "success.txt" : "error.txt";
    const reason = ogImageInfo.reason ? ` - ${ogImageInfo.reason}` : "";
    const logMessage = `${url} - ${ogImageInfo.url} - ${ogImageInfo.width}x${ogImageInfo.height}px r: ${ogImageInfo.ratio}${reason}`;

    logResult(`${logBaseDir}/og_images`, ogLogFile, logMessage);
  }

  // Clicar no botão "ver mais" até que desapareça
  await clickMoreLinks(page, 'a[href*="/feed-page-"] button');

  const isError = await checkForErrorMessage(page);

  if (status >= 200 && status < 300 && !isError) {
    logResult(logBaseDir, "success.txt", `${url}`);
    console.log(`Link acessível: ${url}\n`);

    const visitedLinksArray = Array.from(visitedLinks);

    const previousTotal = allLinks.size;

    const seenLinks: string[] = [];
    const links: string[] = await page.$$eval(
      'a[rel="follow"]',
      (anchors, props) =>
        anchors
          .filter((anchor) => {
            const haveSeenItem = props.seenLinks.includes(anchor.href);
            if (!haveSeenItem) props.seenLinks.push(anchor.href);
            return (
              !props.visitedLinksArray.includes(anchor.href) && !haveSeenItem
            );
          })
          .map((anchor) => anchor.href),
      { visitedLinksArray, seenLinks }
    );

    links.forEach((link) => allLinks.add(link));

    const linkDiff = allLinks.size - previousTotal;

    if (linkDiff) {
      console.log(
        `Encontrados ${linkDiff} links únicos [rel="follow"] em ${url}\nTotalizando ${allLinks.size} links\n`
      );
    }
  } else {
    const errorMessage = isError
      ? `(Página inacessível | Status ${status})`
      : `(Status ${status})`;
    logResult(logBaseDir, "error.txt", `${url} - ${errorMessage}`);
    console.log(`Erro em ${url}: ${errorMessage}\n`);
  }

  logResult(logBaseDir, "complete.txt", `${url}`);

  await page.close();
};

const main = async (
  validateOgImages: boolean = false,
  validateHeaderTags: boolean = false,
  takeScreenshots: boolean = false
): Promise<void> => {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const sessionTimestamp: string = getFormattedTimestamp();

  const logBaseDir: string = path.resolve(
    __dirname,
    "../logs",
    sessionTimestamp
  );
  mkdirRecursive(logBaseDir);

  const screenshotDirRoot: string = path.resolve(logBaseDir, "screenshots");
  mkdirRecursive(screenshotDirRoot);

  const ogImageDir: string = path.resolve(logBaseDir, "og_images");
  mkdirRecursive(ogImageDir);

  const h1LogDir = path.resolve(logBaseDir, "tags");
  mkdirRecursive(h1LogDir);

  console.log(`Início da execução às ${sessionTimestamp}`);

  for (const url of rootUrls) {
    const normalizedUrl = normalizeUrl(url);
    visitedLinks.add(normalizedUrl);
    try {
      await processPage(
        browser,
        normalizedUrl,
        screenshotDirRoot,
        logBaseDir,
        validateOgImages,
        validateHeaderTags,
        takeScreenshots
      );
    } catch (error) {
      logResult(
        logBaseDir,
        "error.txt",
        `${normalizedUrl} (${(error as Error).message})`
      );
      console.log(`Erro em ${normalizedUrl}: ${(error as Error).message}`);
    }
  }

  let pendingLinks = Array.from(allLinks);

  while (pendingLinks.length > visitedLinks.size) {
    for (const link of pendingLinks) {
      const normalizedLink = normalizeUrl(link);
      if (!visitedLinks.has(normalizedLink)) {
        console.log(
          `Visitando link ${visitedLinks.size + 1} de ${
            allLinks.size + 1
          }:\n${normalizedLink}\n`
        );

        visitedLinks.add(normalizedLink);

        try {
          await processPage(
            browser,
            normalizedLink,
            screenshotDirRoot,
            logBaseDir,
            validateOgImages,
            validateHeaderTags,
            takeScreenshots
          );
        } catch (linkError) {
          logResult(
            logBaseDir,
            "error.txt",
            `${normalizedLink} - ${(linkError as Error).message}`
          );
          console.log(
            `Link inacessível: ${normalizedLink} - ${
              (linkError as Error).message
            }`
          );
        }
      }
    }

    pendingLinks = Array.from(allLinks);
  }

  await browser.close();
};

const args = process.argv.slice(2);
const validateOgImages = args.includes("--validate-og-images");
const validateHeaderTags = args.includes("--validate-heading-tags");
const takeScreenshots = args.includes("--take-screenshots");

main(validateOgImages, validateHeaderTags, takeScreenshots)
  .catch((error) => {
    const errorLogDir = path.resolve(__dirname, "../logs/error");
    mkdirRecursive(errorLogDir);
    logResult(
      errorLogDir,
      "error.txt",
      `Erro ao executar o script: ${(error as Error).message}`
    );
    console.error(error);
  })
  .finally(() => {
    const completeLogDir = path.resolve(__dirname, "../logs/complete");
    mkdirRecursive(completeLogDir);
    const finishedTimestamp = getFormattedTimestamp();
    logResult(
      completeLogDir,
      "complete.txt",
      `Fim da execução às ${finishedTimestamp}`
    );
    console.log(`Fim da execução às ${finishedTimestamp}`);
  });
