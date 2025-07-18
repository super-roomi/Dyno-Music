import searchSong from "./metadataHandler.js";
import { chromium } from "playwright";
import promptSync from "prompt-sync";
import cliProgress from "cli-progress";

const prompt = promptSync();
const mainLink = "https://dab.yeet.su/";
const fallbackLink = "https://us.qobuz.squid.wtf/";

(async () => {
  console.log(`
   _____  ___  ______ 
  / _ \\ \\/ / |/ / __ \\
 / // /\\  /    / /_/ /
/____/ /_/_/|_/\\____/ 
`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();

  const page = await context.newPage();

  const songsPrompt = prompt("please input your comma-separated songs:");

  const songList = songsPrompt.split(",").map((s) => s.trim());

  const bar1 = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  bar1.start(songList.length, 0);

  for (let index = 0; index < songList.length; index++) {
    await page.goto(mainLink);

    const song = songList[index];
    await page.waitForTimeout(2000);

    const songNameAndArtist = song.split("-").map((s) => s.trim());
    const songArtist = songNameAndArtist[0];
    const songName = songNameAndArtist[1];

    console.log(" 🔍 Searching for: " + songName + " by " + songArtist);
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

    console.log(" Downloading: " + songList[index]);
    await download.saveAs(`./songs/${download.suggestedFilename()}`);

    //Search for the metadata of the dong
    console.log("🔍 Searching and downloading relevant metadata");
    await searchSong(songName, songArtist);

    bar1.increment(1);
  }
  console.log(" finished all downloads!");
  await context.close();
  await browser.close();
})();
