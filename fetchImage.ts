import { Buffer } from "buffer";
import fs from "fs";
import type { Page } from "puppeteer";

const chapterImagesList =
  "div.flex.items-center.justify-center div.flex.flex-col.overflow-auto.gap-3";

export async function fetchImage(
  imageNumber: number,
  page: Page,
  chapterFolder: string
) {
  try {
    const image = chapterImagesList + ` div:nth-child(${imageNumber}) img`;
    const imageSrc = await page.evaluate(
      (el) => el.getAttribute("src"),
      await page.locator(image).waitHandle()
    );

    if (!imageSrc) {
      throw new Error(`No src found for image ${imageNumber}`);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const imageResponse = await fetch(imageSrc, {
        signal: controller.signal,
      });

      if (!imageResponse.ok) {
        throw new Error(`HTTP error! status: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();

      if (imageBuffer.byteLength === 0) {
        throw new Error("Received empty image buffer");
      }

      await fs.promises.writeFile(
        `${chapterFolder}/page_${imageNumber}.jpg`,
        Buffer.from(imageBuffer)
      );

      console.log(`Successfully downloaded image ${imageNumber}`);
    } catch (fetchError) {
      if (fetchError instanceof Error)
        console.error(
          `Error downloading image ${imageNumber}: ${fetchError.message}`
        );
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error(`Error processing image ${imageNumber}:`, error);
  }
}
