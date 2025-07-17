import fs from "node:fs/promises";
import axios from "axios";

let cover_art_url;
let songMetaData;

const searchSong = async (song, artist) => {
  await axios
    .get(
      metadataLink +
        "artist:" +
        '"' +
        artist +
        '"' +
        " " +
        "track:" +
        '"' +
        song +
        '"'
    )
    .then((response) => {
      songMetaData = response.data.data;
      cover_art_url = songMetaData[0].album.cover_big;
      downloadCoverArt();
    })
    .catch((error) => {
      console.error("An error occured fetching metadata: " + error);
    });
};

const downloadCoverArt = async () => {
  await axios.get(cover_art_url).then((response) => {
    try {
      fs.createWriteStream(response);
    } catch (error) {
      console.error("There was an error writing to disk: " + error);
    }
  });
};

module.exports = searchSong;
