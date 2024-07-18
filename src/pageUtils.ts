import { ElementHandle, Page } from "puppeteer";

export const normalizeUrl = (url: string): string => {
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

// Função para adicionar um atraso
export const delay = (timeout: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

// Verifica se existe um elemento <h1> na página e retorna o conteúdo de texto
export const getHeadersContent = async (
  page: Page
): Promise<{ [key: string]: boolean }> => {
  const headersContent = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const h2 = document.querySelector("h2");
    const h3 = document.querySelector("h3");
    const h4 = document.querySelector("h4");
    const h5 = document.querySelector("h5");
    return {
      h1: !!h1?.textContent,
      h2: !!h2?.textContent,
      h3: !!h3?.textContent,
      h4: !!h4?.textContent,
      h5: !!h5?.textContent,
    };
  });

  return headersContent;
};

// Função para aceitar cookies
export const acceptCookies = async (page: Page): Promise<void> => {
  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", {
      timeout: 5000,
    });
    await page.click("#onetrust-accept-btn-handler");
    console.log("Cookies aceitos.\n");
  } catch (error) {}
};

// Função para rolar a página até o final
export const scrollPageToBottom = async (
  page: Page,
  scrollDelay: number = 25,
  distance: number = 300 // distância a rolar em pixels
): Promise<void> => {
  while (
    await page.evaluate(
      () =>
        document?.scrollingElement?.scrollTop! + window.innerHeight <
        document?.scrollingElement?.scrollHeight!
    )
  ) {
    await page.evaluate((y) => {
      window.scrollBy(0, y);
    }, distance!);

    await delay(scrollDelay);
  }
};

// Função para verificar se a página contém mensagem de erro
export const checkForErrorMessage = async (page: Page): Promise<boolean> => {
  const errorMessage = await page.evaluate(() => {
    const errorText = (document?.body?.innerText || "").toLocaleLowerCase();
    return errorText.includes("error") || !errorText;
  });
  return errorMessage;
};

// Função para clicar no botão "ver mais" até que não tenha mais links novos
let seenLinks: string[] = [];
let moreLinksClicked = 0;
const MAX_CLICKS = 20;
export const clickMoreLinks = async (
  page: Page,
  buttonSelector: string
): Promise<boolean> => {
  try {
    const buttonMoreLinks: ElementHandle<Element> | null = await page.$(
      buttonSelector
    );

    if (buttonMoreLinks) {
      console.log('Botão "ver mais" encontrado.');

      const initialLinkCount = seenLinks.length;
      const newLinks: string[] = await page.$$eval(
        'a[rel="follow"]',
        (anchors) => anchors.map((anchor) => anchor.href)
      );

      const uniqueNewLinks = newLinks.filter(
        (link) => !seenLinks.includes(normalizeUrl(link))
      );

      if (moreLinksClicked < MAX_CLICKS) {
        await buttonMoreLinks?.click();
        moreLinksClicked++;

        seenLinks = seenLinks.concat(uniqueNewLinks.map(normalizeUrl));

        await delay(850); // Espera 750ms para carregar mais links

        // Verifica se novos links foram adicionados
        const currentLinkCount = seenLinks.length;
        if (currentLinkCount > initialLinkCount) {
          return clickMoreLinks(page, buttonSelector);
        }
      }
    } else {
      console.log(`Botão "ver mais" não encontrado.`);
    }
  } catch (error) {
    console.log('Erro ao clicar no botão "ver mais":', error);
  }

  seenLinks = [];
  return false;
};
