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
  getH1Content,
} from "./pageUtils";
import { validateOgImage } from "./ogImageValidator";

const rootUrls: string[] = ["https://google.com"];

const allLinks: Set<string> = new Set();
const visitedLinks: Set<string> = new Set();

const processPage = async (
  browser: Browser,
  url: string,
  screenshotDirRoot: string,
  logBaseDir: string,
  validateOgImages: boolean,
  validateH1Tags: boolean = false,
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

  if (validateH1Tags) {
    const h1Content = await getH1Content(page);

    const logMessage = h1Content ?? "(H1 não encontrado)";
    logResult(
      `${logBaseDir}/tags`,
      h1Content ? "success.txt" : "error.txt",
      `${url} - ${logMessage}`
    );
  }

  if (validateOgImages) {
    const ogImageInfo = await validateOgImage(page);
    const ogLogFile = ogImageInfo.valid ? "success.txt" : "error.txt";
    const reason = ogImageInfo.reason ? ` - ${ogImageInfo.reason}` : "";
    const logMessage = `${url} - ${ogImageInfo.url} - ${ogImageInfo.width}x${ogImageInfo.height}px r: ${ogImageInfo.ratio}${reason}`;

    logResult(`${logBaseDir}/og_images`, ogLogFile, logMessage);
  }

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
  validateH1Tags: boolean = false,
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
    visitedLinks.add(url);
    try {
      await processPage(
        browser,
        url,
        screenshotDirRoot,
        logBaseDir,
        validateOgImages,
        validateH1Tags,
        takeScreenshots
      );
    } catch (error) {
      logResult(
        logBaseDir,
        "error.txt",
        `${url} (${(error as Error).message})`
      );
      console.log(`Erro em ${url}: ${(error as Error).message}`);
    }
  }

  let pendingLinks = Array.from(allLinks);

  while (pendingLinks.length > visitedLinks.size) {
    for (const link of pendingLinks) {
      if (!visitedLinks.has(link)) {
        console.log(
          `Visitando link ${visitedLinks.size + 1} de ${
            allLinks.size + 1
          }:\n${link}\n`
        );

        visitedLinks.add(link);

        try {
          await processPage(
            browser,
            link,
            screenshotDirRoot,
            logBaseDir,
            validateOgImages,
            validateH1Tags,
            takeScreenshots
          );
        } catch (linkError) {
          logResult(
            logBaseDir,
            "error.txt",
            `${link} - ${(linkError as Error).message}`
          );
          console.log(
            `Link inacessível: ${link} - ${(linkError as Error).message}`
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
const validateH1Tags = args.includes("--validate-h1-tags");
const takeScreenshots = args.includes("--take-screenshots");

main(validateOgImages, validateH1Tags, takeScreenshots)
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
