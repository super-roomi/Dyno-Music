const { chromium } = require("playwright");
const prompt = require("prompt-sync")();
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();

  const page = await context.newPage();

  const songsPrompt = prompt("please input your comma-separated songs:");

  const songList = songsPrompt.split(",").map((s) => s.trim()); // trim whitespace

  for (let index = 0; index < songList.length; index++) {
    const context = await browser.newContext();
    await page.goto("https://dab.yeet.su/");

    const song = songList[index];
    await page.waitForTimeout(2000);

    await page.getByRole("textbox", { name: "Search query" }).click();
    await page.getByRole("textbox", { name: "Search query" }).fill(song);
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForTimeout(2000);
    await page
      .locator(".flex.items-center.gap-2 > button:nth-child(4)")
      .first()
      .click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .locator(".flex.items-center.gap-2 > button:nth-child(4)")
        .first()
        .click(),
    ]);
    await download.saveAs(`./songs/${download.suggestedFilename()}`);
  }
  await context.close();
  await browser.close();
})();

// import { test, expect } from "@playwright/test";

// test("test", async ({ page }) => {
//   let songList = [];

//   console.log(
//     "Welcome to Dyno! Type the names of the songs you want to download, separate them by comma please!"
//   );

//   const songs = prompt("fuck");
//   console.log(songs);
//   await page.goto("https://dab.yeet.su/");

//   for (let index = 0; index < array.length; index++) {
//     const element = array[index];
//   }

//   await page.getByRole("textbox", { name: "Search query" }).click();
//   await page.getByRole("textbox", { name: "Search query" }).click();
//   await page.getByRole("textbox", { name: "Search query" }).fill("Hello");
//   await page.getByRole("button", { name: "Search", exact: true }).click();
//   await page
//     .getByRole("heading", { name: "You Can't Hurry Love (2016" })
//     .click();
//   await page
//     .getByRole("heading", { name: "You Can't Hurry Love (2016" })
//     .click();
//   await page
//     .getByRole("heading", { name: "You Can't Hurry Love (2016" })
//     .dblclick();
//   await page
//     .getByRole("heading", { name: "You Can't Hurry Love (2016" })
//     .click();
//   await page.locator(".h-20").first().click();
//   await page.locator(".flex.gap-4").first().click();
//   await page
//     .locator("div:nth-child(2) > .p-4 > .flex.gap-4 > .flex-1 > div")
//     .first()
//     .click();
//   await page
//     .locator(
//       "div:nth-child(2) > .p-4 > .flex.gap-4 > .flex-1 > div > .font-medium.text-white\\/90"
//     )
//     .click();
//   await page.getByRole("img", { name: "25" }).first().click();
//   await page
//     .locator("div:nth-child(2) > .p-4 > .flex.gap-4 > .relative > .inline-flex")
//     .click();
//   await page.getByLabel("Play", { exact: true }).click();
//   const downloadPromise = page.waitForEvent("download");
//   await page
//     .locator(
//       ".rounded-lg.border.text-card-foreground.bg-zinc-800\\/40.backdrop-blur-md.transition-all.duration-300.hover\\:bg-zinc-800\\/60.border-emerald-500\\/70 > .p-4 > .flex.gap-4 > .flex-1 > div:nth-child(5) > button:nth-child(4)"
//     )
//     .click();
//   const download = await downloadPromise;
//   await page.getByRole("button", { name: "Pause" }).click();
// });
