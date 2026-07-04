# Dyno Music

A terminal-based playwright app that allows you to batch download music using a .csv or .m3u file.

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

Start the server

```bash
  node ./main.js
```

```bash
  node main.js path/to/ur/csv/m3u
```

## Authors

- [@super-roomi](https://www.github.com/super-roomi)
