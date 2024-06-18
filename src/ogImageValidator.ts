import { Page } from "puppeteer";

interface OgImageInfo {
  url: string | null;
  width: number | null;
  height: number | null;
  ratio: number;
  valid: boolean;
  reason?: string;
}

// Função para validar as imagens OG
export const validateOgImage = async (page: Page): Promise<OgImageInfo> => {
  const ogImageUrl = await page.evaluate(() => {
    const ogImageElement = document.querySelector('meta[property="og:image"]');
    return ogImageElement ? (ogImageElement as HTMLMetaElement).content : null;
  });

  if (ogImageUrl) {
    const imgPage = await page.browser().newPage();
    await imgPage.goto(ogImageUrl);

    const dimensions = await imgPage.evaluate(() => {
      const img = document.querySelector("img");
      return img
        ? { width: img.naturalWidth, height: img.naturalHeight }
        : null;
    });

    await imgPage.close();

    const acceptableRatio = 1.9;
    const tolerance = 0.2; // Aumentando a tolerância para 0.2
    let aspectRatio = 0;

    if (dimensions) {
      const { width, height } = dimensions;
      aspectRatio = width / height;

      const validDimensions = width >= 200 && height >= 200;
      const validSize = width * height <= 8 * 1024 * 1024;
      const validAspectRatio =
        Math.abs(aspectRatio - acceptableRatio) < tolerance;
      const highResolution = width >= 1200 && height >= 630;
      const standardResolution = width >= 600 && height >= 315;

      if (!validDimensions) {
        return {
          url: ogImageUrl,
          width,
          height,
          valid: false,
          ratio: aspectRatio,
          reason: "Dimensions below minimum size (200x200)",
        };
      }

      if (!validSize) {
        return {
          url: ogImageUrl,
          width,
          height,
          valid: false,
          ratio: aspectRatio,
          reason: "Size exceeds maximum allowed (8 MB)",
        };
      }

      if (!validAspectRatio) {
        return {
          url: ogImageUrl,
          width,
          height,
          valid: false,
          ratio: aspectRatio,
          reason: "Invalid aspect ratio",
        };
      }

      if (!highResolution && !standardResolution) {
        return {
          url: ogImageUrl,
          width,
          height,
          valid: false,
          ratio: aspectRatio,
          reason: "Resolution below minimum standards",
        };
      }

      return {
        url: ogImageUrl,
        width,
        height,
        valid: true,
        ratio: aspectRatio,
      };
    } else {
      return {
        url: ogImageUrl,
        width: null,
        height: null,
        valid: false,
        ratio: aspectRatio,
        reason: "Failed to load image",
      };
    }
  } else {
    return {
      url: null,
      width: null,
      height: null,
      valid: false,
      ratio: 0,
      reason: "No OG image found",
    };
  }
};
