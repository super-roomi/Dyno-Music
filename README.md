# Dyno Music

A terminal-based playwright app that allows you to batch download music from dab.yeet.su

## Features

- Download tracks in batches, with a provided list of comma-separated songs
- Download albums in batches, with a provided list of comma-separated albums

## Tech Stack

**Scraping**: playwright, JavaScript, Node.js

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
Type out your song in the form of a list (song dash artist format)
```bash
  portland-drake, no one noticed-the marias, etc...
```

## Authors

- [@super-roomi](https://www.github.com/super-roomi)
