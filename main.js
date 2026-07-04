#!/usr/bin/env node
//yooo dyno comeback??

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { banner, log, c } from "./lib/log.js";
import { parsePlaylist, splitArtistTitle, buildQuery } from "./lib/input.js";
import { fetchMetadata, tagFile, hasFfmpeg } from "./lib/metadata.js";
import { Scraper } from "./lib/scraper.js";
import { Progress } from "./lib/progress.js";

const USAGE = `
${c.bold("Dyno")} – batch music downloader with metadata tagging

${c.bold("Usage:")}
  dyno <playlist.csv | playlist.m3u> [options]
  dyno --song "Artist - Title" [--song "..."] [options]

${c.bold("Options:")}
  -o, --output <dir>   Where to save songs        ${c.dim("(default: ./songs)")}
  -s, --song <text>    Add an inline track; repeatable
      --source <url>   Source site URL            ${c.dim("(or set DYNO_SOURCE)")}
      --visible        Show the browser window     ${c.dim("(default: headless)")}
      --skip-tag       Skip metadata / cover-art tagging
      --overwrite      Re-download tracks already in the manifest
  -h, --help           Show this help

${c.bold("Playlist formats:")}
  CSV  Columns title,artist,album (header optional). A single column is
       read as "Artist - Title".
  M3U  Extended playlists: #EXTINF:<sec>,Artist - Title

${c.bold("Examples:")}
  dyno my-playlist.csv
  dyno favourites.m3u -o ~/Music/Dyno
  dyno --song "Radiohead - Weird Fishes" --visible
`;

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

function loadManifest(dir) {
  const file = path.join(dir, ".dyno-done.json");
  try {
    return { file, data: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { file, data: {} };
  }
}

function saveManifest(manifest) {
  try {
    fs.writeFileSync(manifest.file, JSON.stringify(manifest.data, null, 2));
  } catch {
    /* non-fatal */
  }
}

function displayName(track) {
  if (track.title && track.artist) return `${track.title} — ${track.artist}`;
  return track.title || track.artist || track.query;
}

async function main() {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        output: { type: "string", short: "o", default: "songs" },
        song: { type: "string", short: "s", multiple: true },
        source: { type: "string" },
        visible: { type: "boolean", default: false },
        "skip-tag": { type: "boolean", default: false },
        overwrite: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    }));
  } catch (err) {
    banner();
    log.err(err.message);
    console.log(USAGE);
    process.exit(1);
  }

  banner();

  if (values.help) {
    console.log(USAGE);
    return;
  }

  // Assemble the track list from inline --song flags and/or a playlist file.
  const tracks = [];
  for (const s of values.song || []) {
    const parsed = splitArtistTitle(s);
    tracks.push({ ...parsed, album: "", query: buildQuery(parsed) });
  }
  const inputFile = positionals[0];
  if (inputFile) {
    try {
      tracks.push(...parsePlaylist(inputFile));
    } catch (err) {
      log.err(err.message);
      process.exit(1);
    }
  }

  if (tracks.length === 0) {
    log.warn("No tracks to download.");
    console.log(USAGE);
    process.exit(1);
  }

  // Tagging support.
  let doTag = !values["skip-tag"];
  if (doTag && !(await hasFfmpeg())) {
    log.warn(
      "ffmpeg not found on PATH — metadata tagging disabled. " +
        "Install it (e.g. `brew install ffmpeg`) to embed tags & cover art."
    );
    doTag = false;
  }

  const outputDir = path.resolve(values.output);
  fs.mkdirSync(outputDir, { recursive: true });
  const manifest = loadManifest(outputDir);

  log.info(`${c.bold(String(tracks.length))} track(s) queued`);
  log.info(`Saving to ${c.cyan(outputDir)}`);
  log.info(`Tagging: ${doTag ? c.green("on") : c.yellow("off")}`);
  log.plain();

  const source = values.source || process.env.DYNO_SOURCE;
  const scraper = new Scraper({ headless: !values.visible, mainLink: source });
  try {
    await scraper.launch();
  } catch (err) {
    log.err(err.message);
    process.exit(1);
  }

  const results = { done: 0, skipped: 0, failed: [] };
  const progress = new Progress(tracks.length);

  const cleanup = async () => {
    progress.stop();
    await scraper.close();
  };
  process.on("SIGINT", async () => {
    await cleanup();
    log.warn("Interrupted.");
    process.exit(130);
  });

  progress.start();

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const name = displayName(track);
    progress.setSong(i + 1, name);

    const key = norm(track.query);
    if (!values.overwrite && manifest.data[key]) {
      progress.print(`${c.yellow("↷")} ${c.dim("skip")} ${name} ${c.dim("(already downloaded)")}`);
      results.skipped++;
      progress.completeSong();
      continue;
    }

    try {
      const { filePath, filename } = await scraper.downloadTrack(
        track.query,
        outputDir,
        (phase) => progress.setPhase(phase)
      );

      let tagNote = "";
      if (doTag) {
        progress.setPhase("fetching metadata");
        const meta = await fetchMetadata(track);
        if (meta) {
          progress.setPhase("tagging");
          try {
            const { cover } = await tagFile(filePath, meta);
            tagNote = cover ? c.dim(" +tags +cover") : c.dim(" +tags");
          } catch (err) {
            tagNote = c.yellow(" (tagging failed)");
          }
        } else {
          tagNote = c.yellow(" (no metadata found)");
        }
      }

      progress.print(`${c.green("✓")} ${name} ${c.dim("→ " + filename)}${tagNote}`);
      manifest.data[key] = filename;
      saveManifest(manifest);
      results.done++;
    } catch (err) {
      const msg = (err?.message || String(err)).split("\n")[0];
      progress.print(`${c.red("✗")} ${name} ${c.dim("— " + msg)}`);
      results.failed.push({ name, msg });
    }

    progress.completeSong();
  }

  progress.stop();
  await scraper.close();

  // Summary.
  log.plain();
  log.ok(`${results.done} downloaded`);
  if (results.skipped) log.info(`${results.skipped} skipped`);
  if (results.failed.length) {
    log.err(`${results.failed.length} failed:`);
    for (const f of results.failed) log.plain(`    ${c.red("•")} ${f.name} ${c.dim("— " + f.msg)}`);
  }
  log.plain(c.dim("Done."));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
