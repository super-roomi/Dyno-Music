# Dyno Music

A terminal music downloader. Feed it a **CSV or M3U playlist** and it downloads
each track, embeds full metadata **and cover art**, and shows progress as a
T-Rex eating its way through a bar.

```
   _____  ___  ______
  / _ \ \/ / |/ / __ \
 / // /\  /    / /_/ /
/____/ /_/_/|_/\____/   music downloader
```

## Heads up

This script can make mistakes when downloading music: sometimes the scraped
site doesn't return the exact song you wanted — it may be unavailable, or a
different track with a matching name comes back instead. Testing with 100 songs
from my library gave ~11 incorrect downloads. Your mileage will vary. Work will
continue to mitigate this, but expect the occasional wrong song.

## Features

- **Playlist input** — point it at a `.csv` or `.m3u`/`.m3u8` file instead of
  typing songs by hand.
- **Full metadata tagging** — title, artist, album, album artist, year, track &
  disc number, and genre are looked up on Deezer and written into each file.
- **Embedded cover art** — high-resolution artwork is baked into every FLAC/MP3
  (no more loose `.jpg` files).
- **Dinosaur progress bar** — see the current song, its phase (searching →
  downloading → tagging), and overall progress as a 🦖 eats through the bar.
- **Resumable** — a manifest records finished tracks, so re-running skips what's
  already downloaded.

## Requirements

- **Node.js** ≥ 18 — https://nodejs.org
- **ffmpeg** (for tagging & cover art) — `brew install ffmpeg`.
  Without it, downloads still work but tagging is skipped.

## Install

```bash
git clone https://github.com/super-roomi/Dyno-Music.git
cd Dyno-Music
npm install
npx playwright install chromium
```

## Usage

```bash
node main.js <playlist.csv | playlist.m3u> [options]
```

### Options

| Option | Description |
| --- | --- |
| `-o, --output <dir>` | Where to save songs (default `./songs`) |
| `-s, --song <text>` | Add an inline track (`"Artist - Title"`); repeatable |
| `--source <url>` | Source site to scrape (or set `DYNO_SOURCE`) |
| `--visible` | Show the browser window instead of running headless |
| `--skip-tag` | Skip metadata / cover-art tagging |
| `--overwrite` | Re-download tracks already in the manifest |
| `-h, --help` | Show help |

### Examples

```bash
node main.js my-playlist.csv
node main.js favourites.m3u -o ~/Music/Dyno
node main.js --song "Radiohead - Weird Fishes" --visible
```

## Playlist formats

**CSV** — columns `title,artist,album` (a header row is optional and columns are
matched by name when present). A single-column row is read as `Artist - Title`.

```csv
title,artist,album
Weird Fishes,Radiohead,In Rainbows
No One Noticed,The Marías,
```

**M3U** — extended playlists using `#EXTINF`:

```m3u
#EXTM3U
#EXTINF:257,Radiohead - Weird Fishes
#EXTINF:200,The Marías - No One Noticed
```

## How it works

1. Each track is searched on the source site and the top result is downloaded.
2. Metadata is fetched from the Deezer API and matched to the track.
3. ffmpeg embeds the tags and cover art directly into the audio file.

> You are responsible for having the rights to any music you download.

## Note on the source site

The default source (`saavn.squid.wtf`) is a community mirror and these move or go
offline often. If a run fails at the "searching" step with a timeout, the site
is probably down or has moved — point Dyno at the current mirror with:

```bash
node main.js my-playlist.csv --source https://the-current-mirror.example/
# or
DYNO_SOURCE=https://the-current-mirror.example/ node main.js my-playlist.csv
```

The scraper expects the same search → download layout as `saavn.squid.wtf`; a mirror
with a different page structure may need the selectors in
[`lib/scraper.js`](lib/scraper.js) adjusted.

## Authors

- [@super-roomi](https://www.github.com/super-roomi)
