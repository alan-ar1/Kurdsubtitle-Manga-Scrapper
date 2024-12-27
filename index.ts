import fs from "fs";
import inquirer from "inquirer";
import puppeteer from "puppeteer";
import { fetchImage } from "./fetchImage.js";
const url = "https://kurdsubtitle.net";

const searchInput = "input.relative";
const mangaListButton =
  "button.grow.rounded-sm.py-1.px-2.text-center.transition-all:nth-child(4)";
const mangaButton = "div.custome-scrollbar a.flex:first-child";
const mangaChaptersCheckbox = "div.mantine-Checkbox-inner input";
const lastChapterNumber =
  "div.flex.flex-col.gap-3 div:last-child div.flex.items-center div:nth-child(2) div:first-child";
const numberOfImageDivs = ".text-sm.text-gray-400:nth-child(3)";
const closeChapter = "button.flex.h-10.w-10.items-center";

const urlAsk = await inquirer.prompt({
  type: "input",
  name: "Mange Name",
  message: "Name of manga:",
});

const mangaName = urlAsk["Mange Name"];
const mangaFolder = "manga/" + mangaName;

if (!fs.existsSync(mangaFolder)) {
  fs.mkdirSync(mangaFolder);
}

const browser = await puppeteer.launch({ headless: false });

const page = await browser.newPage();
await page.goto(url);
await page.locator(searchInput).fill(mangaName);
await page.locator(mangaListButton).click();
await page.locator(mangaButton).click();
await page.locator(mangaChaptersCheckbox).click();

const numberOfChapters = await page.evaluate(
  (el) => Number(el.textContent?.substring(1)),
  await page.locator(lastChapterNumber).waitHandle()
);

console.log(`Number of chapters: ${numberOfChapters}`);

for (
  let chapterNumber = 1;
  chapterNumber <= numberOfChapters;
  chapterNumber++
) {
  const chapterFolder = mangaFolder + "/chapter_" + chapterNumber;
  if (!fs.existsSync(chapterFolder)) {
    fs.mkdirSync(chapterFolder);
  }
  console.log(`Chapter ${chapterNumber} downloading...`);
  const chapter = `div.flex.flex-col.gap-3 div:nth-child(${chapterNumber}) div.flex.items-center div:nth-child(2) button:nth-child(2)`;
  await page.waitForNetworkIdle();
  await page.locator(chapter).click();

  await page.waitForFunction(`(document) => {
    const images = Array.from(document.images);
    return images.every((img) => img.complete && img.naturalHeight !== 0);
  }`);

  // Additional check: Wait for any lazy-loaded images
  await page.evaluate(`() => {
  return Promise.all(
    Array.from(document.images)
      .filter(img => !img.complete)
      .map(img => new Promise(resolve => {
        img.onload = img.onerror = resolve;
      }))
  );
}`);

  const numberOfImages = await page.evaluate(
    (el) => Number(el.textContent),
    await page.locator(numberOfImageDivs).waitHandle()
  );

  console.log(`Number of images: ${numberOfImages}`);
  for (let imageNumber = 1; imageNumber <= numberOfImages; imageNumber++) {
    await fetchImage(imageNumber, page, chapterFolder);
  }
  await page.locator(closeChapter).click();
}

page.close();
