import fs from "fs";
import axios from "axios";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const metadataLink = "https://api.deezer.com/search?q=";
let songMetaData;

const searchSong = async (recievedSong, recievedArtist) => {
  await axios
    .get(
      metadataLink +
        "artist:" +
        '"' +
        recievedArtist +
        '"' +
        " " +
        "track:" +
        '"' +
        recievedSong +
        '"'
    )
    .then((response) => {
      songMetaData = response.data.data;
      let cover_art_url = songMetaData[0].album.cover_big;
      downloadCoverArt(cover_art_url, recievedArtist, recievedSong);
    })
    .catch((error) => {
      console.error("An error occured fetching metadata: " + error);
    });
};

const downloadCoverArt = async (url, artist, song) => {
  await axios
    .get(String(url), { method: "get", responseType: "stream" })
    .then((response) => {
      const writer = fs.createWriteStream(
        path.join(__dirname, "art", artist + " - " + song + ".jpg")
      );

      response.data.pipe(writer);

      writer.on("finish", () => {
        console.log("Cover art saved successfully");
      });

      writer.on("error", () => {
        console.log("Error occured saving the cover image :(");
      });
    });
};

export default searchSong;
