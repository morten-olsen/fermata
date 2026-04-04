import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = resolve(__dirname, "../assets/images");

const conversions = [
  { input: "icon.svg", output: "icon.png", size: 1024 },
  { input: "splash-icon.svg", output: "splash-icon.png", size: 512 },
  { input: "adaptive-icon.svg", output: "adaptive-icon.png", size: 1024 },
  { input: "icon.svg", output: "favicon.png", size: 48 },
];

for (const { input, output, size } of conversions) {
  const svg = readFileSync(resolve(assets, input));
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(resolve(assets, output));
  console.log(`${input} → ${output} (${size}x${size})`);
}
