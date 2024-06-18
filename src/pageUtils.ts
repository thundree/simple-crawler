import { Page } from "puppeteer";

// Verifica se existe um elemento <h1> na página e retorna o conteúdo de texto
export const getH1Content = async (page: Page): Promise<string | null> => {
  const h1Content = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    return h1 ? h1.textContent : null;
  });

  return h1Content;
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

// Função para adicionar um atraso
export const delay = (timeout: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
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
    return errorText.includes("application error") || !errorText;
  });

  return errorMessage;
};
