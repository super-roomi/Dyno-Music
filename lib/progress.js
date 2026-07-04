//some bullshit that took way too long
//looks ass btw

import { c } from "./log.js";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BAR_WIDTH = 24;

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
function truncate(str, max) {
  if (max <= 1) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export class Progress {
  constructor(total) {
    this.total = total;
    this.done = 0;
    this.songIndex = 0;
    this.songName = "";
    this.phase = "";
    this.frame = 0;
    this.rendered = false;
    this.timer = null;
    this.tty = Boolean(process.stdout.isTTY);
  }

  start() {
    if (!this.tty) return;
    process.stdout.write("\x1b[?25l"); // hide cursor
    this._render();
    this.timer = setInterval(() => {
      this.frame++;
      this._render();
    }, 120);
    this.timer.unref?.();
  }

  setSong(index, name) {
    this.songIndex = index;
    this.songName = name || "";
    this.phase = "";
    if (!this.tty) console.log(`\n[${index}/${this.total}] ${this.songName}`);
    else this._render();
  }

  setPhase(text) {
    this.phase = text;
    if (!this.tty) console.log(`   ${text}`);
    else this._render();
  }

  completeSong() {
    this.done = Math.min(this.done + 1, this.total);
    if (this.tty) this._render();
  }

  print(line) {
    if (!this.tty) {
      console.log(line);
      return;
    }
    this._clear();
    process.stdout.write(line + "\n");
    this._render();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (!this.tty) return;
    this._clear();
    process.stdout.write(this._barLine() + "\n"); // leave a final static bar
    process.stdout.write("\x1b[?25h"); // show cursor
    this.rendered = false;
  }
  

  _clear() {
    if (!this.rendered) return;
    // Cursor sits at end of line 2; move up to line 1 and clear downward.
    process.stdout.write("\x1b[1A\r\x1b[0J");
    this.rendered = false;
  }

  _render() {
    if (!this.tty) return;
    this._clear();
    process.stdout.write(this._songLine() + "\n" + this._barLine());
    this.rendered = true;
  }

  _songLine() {
    const cols = process.stdout.columns || 80;
    const sp = c.cyan(SPINNER[this.frame % SPINNER.length]);
    const idx = c.dim(`${this.songIndex}/${this.total}`);
    const phase = this.phase ? c.gray(` · ${this.phase}`) : "";
    const budget = cols - stripAnsi(`${sp} ${idx} ${phase}`).length - 2;
    const name = c.bold(truncate(this.songName || "…", Math.max(4, budget)));
    return `${sp} ${idx} ${name}${phase}`;
  }

  //DYNO GOES NOM NOM NOM
  _barLine() {
    const ratio = this.total ? this.done / this.total : 0;
    const eaten = Math.round(ratio * BAR_WIDTH);
    let foodCount = BAR_WIDTH - eaten;

    const trail = c.gray("·".repeat(Math.max(0, eaten)));
    // Chomp animation: bite off the leading food block on alternating frames.
    let food = "█".repeat(Math.max(0, foodCount));
    if (this.frame % 2 === 0 && foodCount > 0) {
      food = " " + "█".repeat(foodCount - 1);
    }


    const dino = "🦖";
    const pct = Math.floor(ratio * 100);
    return (
      `${c.dim("[")}${trail}${dino}${c.green(food)}${c.dim("]")} ` +
      `${c.bold(String(pct).padStart(3) + "%")} ` +
      `${c.dim(`(${this.done}/${this.total})`)}`
    );
  }
}
