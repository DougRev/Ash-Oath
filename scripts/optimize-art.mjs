import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'design', 'source-art');
const output = path.join(root, 'public', 'art');
await mkdir(output, { recursive: true });
const files = (await readdir(source)).filter((file) => file.endsWith('.png'));
let original = 0;
let optimized = 0;
await Promise.all(
  files.map(async (file) => {
    const from = path.join(source, file);
    const to = path.join(output, file.replace(/\.png$/, '.webp'));
    const result = await sharp(from).webp({ quality: 86, effort: 6 }).toFile(to);
    const sourceStats = await stat(from);
    original += sourceStats.size;
    optimized += result.size;
  }),
);
console.log(
  `${files.length} artworks: ${(original / 1048576).toFixed(2)} MB → ${(optimized / 1048576).toFixed(2)} MB (${Math.round((1 - optimized / original) * 100)}% smaller).`,
);
