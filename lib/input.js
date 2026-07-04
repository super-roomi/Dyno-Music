// weird csv logic idk

import fs from "node:fs";
import path from "node:path";

const clean = (s) => (s ?? "").toString().trim();

// Split "Artist - Title" style text into { artist, title }.
function splitArtistTitle(text) {
  const t = clean(text);
  const m = t.split(/\s+-\s+/); // require spaces around dash to avoid "Jay-Z"
  if (m.length >= 2) {
    return { artist: clean(m[0]), title: clean(m.slice(1).join(" - ")) };
  }
  return { artist: "", title: t };
}

function buildQuery({ title, artist }) {
  return [title, artist].map(clean).filter(Boolean).join(" ").trim();
}

// --- CSV -------------------------------------------------------

// Parse one CSV/TSV line respecting double-quoted fields ("" = escaped quote).
function parseCsvLine(line, delim) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map(clean);
}

//some filtering bs
function detectDelimiter(headerLine) {
  if (headerLine.includes("\t")) return "\t";
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

//trim trim
const normHeader = (h) =>
  h
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

//based on 2 spotify export tools i found lol
//need some algo to detect or idk "search" rows based on data needed
function classifyHeaders(cells) {
  const idx = { title: -1, artist: -1, album: -1 };
  cells.forEach((raw, i) => {
    const h = normHeader(raw);
    const isUri = h.includes("uri") || h.includes(" id") || h.endsWith("id");
    const isAlbumArtist = h.includes("album artist");

    if (
      idx.title < 0 &&
      !isUri &&
      (h === "title" ||
        h === "song" ||
        h === "name" ||
        h === "track name" ||
        h === "song name")
    ) {
      idx.title = i;
    } else if (
      idx.artist < 0 &&
      !isUri &&
      !isAlbumArtist &&
      (h === "artist" || h.includes("artist name"))
    ) {
      idx.artist = i;
    } else if (
      idx.album < 0 &&
      !isUri &&
      !isAlbumArtist &&
      !h.includes("release") &&
      !h.includes("image") &&
      (h === "album" || h === "album name")
    ) {
      idx.album = i;
    }
  });
  return idx;
}

function parseCsv(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length === 0) return [];

  const delim = detectDelimiter(lines[0]);
  const firstCells = parseCsvLine(lines[0], delim);
  const headerIdx = classifyHeaders(firstCells);
  const hasHeader = headerIdx.title >= 0 || headerIdx.artist >= 0;

  const idx = hasHeader ? headerIdx : { title: 0, artist: 1, album: 2 };
  const start = hasHeader ? 1 : 0;

  const tracks = [];
  for (let i = start; i < lines.length; i++) {
    //some rails to catch weird artist/song names
    const cols = parseCsvLine(lines[i], delim);
    let title = idx.title >= 0 ? clean(cols[idx.title]) : "";
    let artist = idx.artist >= 0 ? clean(cols[idx.artist]) : "";
    if (artist) artist = clean(artist.split(/[,;]/)[0]);
    const album = idx.album >= 0 ? clean(cols[idx.album]) : "";

    const populated = cols.filter(Boolean);
    if (!hasHeader && populated.length === 1) {
      const parsed = splitArtistTitle(populated[0]);
      title = parsed.title;
      artist = parsed.artist;
    }

    if (!title && !artist) continue;
    tracks.push({ title, artist, album, query: buildQuery({ title, artist }) });
  }
  return tracks;
}

// --- M3U---------------------------------

function parseM3u(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const tracks = [];
  let pending = null; // metadata from a preceding #EXTINF line

  const push = (info) => {
    if (!info || (!info.title && !info.artist)) return;
    tracks.push({
      title: info.title,
      artist: info.artist,
      album: "",
      query: buildQuery(info),
    });
  };

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      //toilet flush noises
      push(pending);
      const comma = line.indexOf(",");
      pending = splitArtistTitle(comma >= 0 ? line.slice(comma + 1) : "");
    } else if (line.startsWith("#")) {
      continue;
    } else {
      let info = pending;
      if (!info || !info.title) {
        const base = path.basename(line).replace(/\.[^.]+$/, "");
        info = splitArtistTitle(base.replace(/_/g, " "));
      }
      pending = null;
      push(info);
    }
  }
  push(pending);
  return tracks;
}

// --- public API ------------

export function parsePlaylist(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Input file not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf8");
  const ext = path.extname(abs).toLowerCase();

  let tracks;
  if (ext === ".m3u" || ext === ".m3u8") tracks = parseM3u(raw);
  else if (ext === ".csv") tracks = parseCsv(raw);
  else if (raw.includes("#EXTM3U")) tracks = parseM3u(raw);
  else tracks = parseCsv(raw); // best-effort for .txt and friends

  return tracks.filter((t) => t.query.length > 0);
}

export { splitArtistTitle, buildQuery };
