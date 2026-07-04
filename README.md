# Dyno Music

A terminal-based playwright app that allows you to batch download music using a .csv or .m3u file.

# Heads Up

This script can make mistakes when downloading music, in the sense that the website being scraped just doesn't give you the song you wanted outright, due to it being unavailable or just the names matching. After testing it with 100 songs from my library, I had about 11 incorrect downloads. Your milage will vary. Work will be done to mitigate this as much as possible, but yeah, expect wrong songs to appear as u download ur music.

## Features

- Download tracks from a .csv file.
- Download track from a .m3u playlist file.

## Tech Stack

**Scraping**: playwright, JavaScript, Node.js
**Track Tagging**: ffmpeg


## Pre-requisites
**Node.js Runtime**: https://nodejs.org/en

## Run Locally

Clone the project

```bash
  git clone https://github.com/super-roomi/Dyno-Music.git
```

Go to the project directory

```bash
  cd Dyno-Music
```

Install dependencies

```bash
  npm install
```

Install a browser
```bash
  npx playwright install
```

Select your .csv/.m3u file and start downloading
```bash
  node main.js path/to/ur/csv/m3u
```

## Authors

- [@super-roomi](https://www.github.com/super-roomi)
