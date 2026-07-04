// colors and stuff

const enabled = process.stdout.isTTY && !process.env.NO_COLOR;

const wrap = (code) => (s) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const c = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  magenta: wrap("35"),
  cyan: wrap("36"),
  gray: wrap("90"),
};

export const log = {
  info: (msg) => console.log(`${c.blue("•")} ${msg}`),
  step: (msg) => console.log(`${c.cyan("→")} ${msg}`),
  ok: (msg) => console.log(`${c.green("✓")} ${msg}`),
  warn: (msg) => console.log(`${c.yellow("!")} ${msg}`),
  err: (msg) => console.log(`${c.red("✗")} ${msg}`),
  plain: (msg = "") => console.log(msg),
};

//hehehe
export const banner = () =>
  console.log(
    c.green(`
   _____  ___  ______
  / _ \\ \\/ / |/ / __ \\
 / // /\\  /    / /_/ /
/____/ /_/_/|_/\\____/   ${c.dim("music downloader")}
`)
  );
