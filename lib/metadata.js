//metadata core, jesus fucking christ this killed me

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import axios from "axios";

const execFileP = promisify(execFile);
const DEEZER = "https://api.deezer.com";

const norm = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

// Score how well a Deezer search result matches what we asked for.
function scoreMatch(result, wantTitle, wantArtist) {
  const rTitle = norm(result.title_short || result.title);
  const rArtist = norm(result.artist?.name);
  const wTitle = norm(wantTitle);
  const wArtist = norm(wantArtist);
  let score = 0;
  if (wTitle && rTitle === wTitle) score += 5;
  else if (wTitle && (rTitle.includes(wTitle) || wTitle.includes(rTitle)))
    score += 3;
  if (wArtist && rArtist === wArtist) score += 4;
  else if (wArtist && (rArtist.includes(wArtist) || wArtist.includes(rArtist)))
    score += 2;
  // Prefer more popular tracks as a tie-breaker.
  score += Math.min((result.rank || 0) / 1_000_000, 0.9);
  return score;
}

async function getJson(url) {
  const { data } = await axios.get(url, { timeout: 15_000 });
  return data;
}

// Look up a track on Deezer and return a normalised metadata object,
// or null if nothing usable was found.
export async function fetchMetadata({ title, artist, query }) {
  const q =
    title && artist
      ? `artist:"${artist}" track:"${title}"`
      : query || title || "";
  if (!q) return null;

  let results;
  try {
    const data = await getJson(`${DEEZER}/search?q=${encodeURIComponent(q)}`);
    results = data?.data || [];
    // Fall back to a looser search if the structured query found nothing.
    if (results.length === 0 && (title || artist)) {
      const loose = await getJson(
        `${DEEZER}/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`
      );
      results = loose?.data || [];
    }
  } catch (err) {
    return null;
  }
  if (!results || results.length === 0) return null;

  const best = results
    .map((r) => ({ r, s: scoreMatch(r, title, artist) }))
    .sort((a, b) => b.s - a.s)[0].r;

  const meta = {
    title: best.title || title || "",
    artist: best.artist?.name || artist || "",
    albumArtist: best.artist?.name || "",
    album: best.album?.title || "",
    cover: best.album?.cover_xl || best.album?.cover_big || "",
    year: "",
    trackNumber: "",
    discNumber: "",
    genre: "",
  };

  // Enrich with track- and album-level details (best-effort).
  try {
    if (best.id) {
      const track = await getJson(`${DEEZER}/track/${best.id}`);
      if (track && !track.error) {
        if (track.track_position) meta.trackNumber = String(track.track_position);
        if (track.disk_number) meta.discNumber = String(track.disk_number);
        if (track.release_date) meta.year = track.release_date.slice(0, 4);
        if (track.contributors?.length)
          meta.albumArtist = track.contributors[0].name;
      }
    }
  } catch {}

  try {
    if (best.album?.id) {
      const album = await getJson(`${DEEZER}/album/${best.album.id}`);
      if (album && !album.error) {
        if (!meta.year && album.release_date)
          meta.year = album.release_date.slice(0, 4);
        if (album.genres?.data?.length) meta.genre = album.genres.data[0].name;
        if (album.artist?.name) meta.albumArtist = album.artist.name;
        if (album.cover_xl) meta.cover = album.cover_xl;
      }
    }
  } catch {}

  return meta;
}

async function downloadCover(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20_000,
    });
    const tmp = path.join(
      os.tmpdir(),
      `dyno-cover-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    );
    fs.writeFileSync(tmp, Buffer.from(res.data));
    return tmp;
  } catch {
    return null;
  }
}

// Embed metadata (and cover art if available) into `filePath` in place.
// Returns { tagged: boolean, cover: boolean }.
export async function tagFile(filePath, meta) {
  if (!meta) return { tagged: false, cover: false };

  const ext = path.extname(filePath) || ".flac";
  const tmpOut = filePath.replace(/(\.[^.]+)$/, `.dyno-tmp${ext}`);
  const coverPath = await downloadCover(meta.cover);

  const args = ["-y", "-i", filePath];
  if (coverPath) args.push("-i", coverPath);

  // Map audio from input 0; map the cover (input 1) as an attached picture.
  args.push("-map", "0:a");
  if (coverPath) {
    args.push("-map", "1:v", "-disposition:v", "attached_pic");
  }
  args.push("-c", "copy");
  if (ext.toLowerCase() === ".mp3") args.push("-id3v2_version", "3");

  const metaPairs = {
    title: meta.title,
    artist: meta.artist,
    album_artist: meta.albumArtist,
    album: meta.album,
    date: meta.year,
    track: meta.trackNumber,
    disc: meta.discNumber,
    genre: meta.genre,
  };
  for (const [k, v] of Object.entries(metaPairs)) {
    if (v) args.push("-metadata", `${k}=${v}`);
  }
  args.push(tmpOut);

  try {
    await execFileP("ffmpeg", args, { timeout: 120_000 });
    fs.renameSync(tmpOut, filePath); // atomic replace on same filesystem
    return { tagged: true, cover: Boolean(coverPath) };
  } catch (err) {
    if (fs.existsSync(tmpOut)) fs.rmSync(tmpOut, { force: true });
    throw err;
  } finally {
    if (coverPath) fs.rmSync(coverPath, { force: true });
  }
}

// Verify ffmpeg is available on PATH.
export async function hasFfmpeg() {
  try {
    await execFileP("ffmpeg", ["-version"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
