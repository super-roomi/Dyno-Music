//downloader core, be warned selectors everywhere

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const MAIN_LINK = "https://saavn.squid.wtf/";

//defaults init
const SEARCH_PLACEHOLDER = "Search songs or albums";
const RESULT_ROW = "button.group"; // each song result is a button.group.*
const MAX_QUALITY_TEXT = "320 kbps"; // JioSaavn top tier (MAX)

//wait D:
const T = {
  afterLoad: 3_000,
  afterSearch: 4_000,
  afterResult: 3_500,
  afterQuality: 1_500,
  find: 30_000,
  download: 120_000,
};

export class Scraper {
  constructor({ headless = true, mainLink = MAIN_LINK } = {}) {
    this.headless = headless;
    this.mainLink = mainLink;
  }

  async launch() {
    try {
      this.browser = await chromium.launch({ headless: this.headless });
    } catch (err) {
      if (/Executable doesn't exist|please run the following/i.test(err.message)) {
        throw new Error(
          "Playwright's browser is not installed. Run:\n    npx playwright install chromium"
        );
      }
      throw err;
    }
    this.context = await this.browser.newContext({ acceptDownloads: true });
    this.page = await this.context.newPage();
  }

  async close() {
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
  }

  // search query, dump the top result to `outputDir`.
  // `onPhase(text)` is called as the flow advances.
  // Returns { filePath, filename }. Throws on failure.
  async downloadTrack(query, outputDir, onPhase = () => {}) {
    const page = this.page;

    // 1. Load site + search for "song artist".
    onPhase("searching");
    await page.goto(this.mainLink, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(T.afterLoad);

    const searchBox = page.getByPlaceholder(SEARCH_PLACEHOLDER, { exact: false });
    await searchBox.waitFor({ state: "visible", timeout: T.find });
    await searchBox.click();
    await searchBox.fill(query);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForTimeout(T.afterSearch);

    // 2. Open the first result.
    const firstResult = page.locator(RESULT_ROW).first();
    await firstResult.waitFor({ state: "visible", timeout: T.find });
    await firstResult.click();
    await page.waitForTimeout(T.afterResult);

    // hell yea best quality available
    const maxQuality = page
      .locator("button", { hasText: MAX_QUALITY_TEXT })
      .filter({ hasText: "MAX" })
      .first();
    if (await maxQuality.count()) {
      await maxQuality.click().catch(() => {});
      await page.waitForTimeout(T.afterQuality);
    }
    
    onPhase("downloading");
    const dlButton = page.getByRole("button", { name: /^Download/ }).first();
    await dlButton.waitFor({ state: "visible", timeout: T.find });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: T.download }),
      dlButton.click(),
    ]);

    const filename = sanitizeName(download.suggestedFilename());
    const filePath = path.join(outputDir, filename);
    await download.saveAs(filePath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      throw new Error("download produced an empty file");
    }
    return { filePath, filename };
  }
}

// cleancleanclean
function sanitizeName(name) {
  const safe = (name || "track").replace(/[\/\\:*?"<>|]/g, "_").trim();
  return safe || "track";
}
