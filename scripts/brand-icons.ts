// Generates the PNG icons of the logo «Celda de anuario» (BRAND.md,
// REQ-BRAND-021, REQ-BRAND-026, REQ-BRAND-034): favicon.png (32 x 32),
// favicon-16.png (16 x 16) and apple-touch-icon.png (180 x 180, opaque).
//
// Run from the repository root:
//   node scripts/brand-icons.ts [<output-dir>]
// The output directory defaults to apps/web/public.
//
// Node.js built-in modules only; erasable TypeScript syntax only, so Node.js
// runs it directly with type stripping. The output is deterministic: the same
// geometry always gives the same bytes.

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";

type Rgb = readonly [number, number, number];
type Rect = readonly [x: number, y: number, width: number, height: number];

type Form = {
  outlineStroke: number;
  inkBar: Rect | null;
  track: Rect | null;
  valueFill: Rect;
};

type Icon = {
  file: string;
  size: number;
  form: Form;
  // Placement of the 48-unit isotype grid in pixels.
  scale: number;
  offset: number;
  // Opaque ground color, or null for a transparent ground.
  ground: Rgb | null;
};

// Light colors of REQ-BRAND-026 (token values of REQ-BRAND-006).
const INK: Rgb = [0x14, 0x14, 0x14];
const TRACK: Rgb = [0xe4, 0xe7, 0xea];
const FILL: Rgb = [0x0e, 0x6e, 0x6e];
const WHITE: Rgb = [0xff, 0xff, 0xff];

// Isotype geometry on the 48-unit grid (REQ-BRAND-021).
const GRID = 48;
const OUTLINE: Rect = [3, 3, 42, 42];

const APP_ICON_FORM: Form = {
  outlineStroke: 3,
  inkBar: [10, 12, 14, 5],
  track: [10, 28, 28, 8],
  valueFill: [10, 28, 19, 8],
};

const FAVICON_32_FORM: Form = {
  outlineStroke: 4,
  inkBar: null,
  track: [10, 26, 28, 12],
  valueFill: [10, 26, 19, 12],
};

const FAVICON_16_FORM: Form = {
  outlineStroke: 6,
  inkBar: null,
  track: null,
  valueFill: [10, 22, 20, 16],
};

// App-icon proportion (REQ-BRAND-026): the isotype spans 76/112 of the tile
// side, offset 18/112 from the top and left.
const APP_ICON_TILE = 112;
const APP_ICON_ISOTYPE = 76;
const APP_ICON_OFFSET = 18;
const APPLE_TOUCH_SIZE = 180;

const ICONS: readonly Icon[] = [
  {
    file: "favicon.png",
    size: 32,
    form: FAVICON_32_FORM,
    scale: 32 / GRID,
    offset: 0,
    ground: null,
  },
  {
    file: "favicon-16.png",
    size: 16,
    form: FAVICON_16_FORM,
    scale: 16 / GRID,
    offset: 0,
    ground: null,
  },
  {
    file: "apple-touch-icon.png",
    size: APPLE_TOUCH_SIZE,
    form: APP_ICON_FORM,
    scale: (APPLE_TOUCH_SIZE * APP_ICON_ISOTYPE) / APP_ICON_TILE / GRID,
    offset: (APPLE_TOUCH_SIZE * APP_ICON_OFFSET) / APP_ICON_TILE,
    ground: WHITE,
  },
];

const DEFAULT_OUTPUT_DIR = "apps/web/public";

// The outline stroke is centered on the outline's edge, drawn as four
// non-overlapping rectangles: top and bottom span the full outer width, left
// and right fill the height between them.
function outlineRects(stroke: number): Rect[] {
  const [x, y, w, h] = OUTLINE;
  const half = stroke / 2;
  const outerX = x - half;
  const outerY = y - half;
  const outerW = w + stroke;
  const innerH = h - stroke;
  return [
    [outerX, outerY, outerW, stroke],
    [outerX, y + h - half, outerW, stroke],
    [outerX, y + half, stroke, innerH],
    [x + w - half, y + half, stroke, innerH],
  ];
}

// Exact area of the pixel (px, py) covered by a rectangle in pixel space.
function coverage(rect: Rect, px: number, py: number): number {
  const [x, y, w, h] = rect;
  const cx = Math.min(x + w, px + 1) - Math.max(x, px);
  const cy = Math.min(y + h, py + 1) - Math.max(y, py);
  return cx > 0 && cy > 0 ? cx * cy : 0;
}

function toPixels(rect: Rect, scale: number, offset: number): Rect {
  const [x, y, w, h] = rect;
  return [offset + x * scale, offset + y * scale, w * scale, h * scale];
}

// Paints the icon into straight-alpha RGBA bytes. Layers are composited with
// the "over" operator in the order track, value fill, ink shapes.
function render(icon: Icon): Buffer {
  const { size, form, scale, offset, ground } = icon;

  const layers: { color: Rgb; rects: Rect[] }[] = [];
  if (form.track) layers.push({ color: TRACK, rects: [form.track] });
  layers.push({ color: FILL, rects: [form.valueFill] });
  const inkRects = outlineRects(form.outlineStroke);
  if (form.inkBar) inkRects.push(form.inkBar);
  layers.push({ color: INK, rects: inkRects });

  const pixelLayers = layers.map((layer) => ({
    color: layer.color,
    rects: layer.rects.map((r) => toPixels(r, scale, offset)),
  }));

  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Premultiplied accumulation, channels in 0..255.
      let a = ground ? 1 : 0;
      let r = ground ? ground[0] : 0;
      let g = ground ? ground[1] : 0;
      let b = ground ? ground[2] : 0;
      for (const layer of pixelLayers) {
        let cov = 0;
        for (const rect of layer.rects) cov += coverage(rect, px, py);
        if (cov <= 0) continue;
        if (cov > 1) cov = 1;
        r = layer.color[0] * cov + r * (1 - cov);
        g = layer.color[1] * cov + g * (1 - cov);
        b = layer.color[2] * cov + b * (1 - cov);
        a = cov + a * (1 - cov);
      }
      const i = (py * size + px) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
        rgba[i + 3] = Math.round(a * 255);
      }
    }
  }
  return rgba;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

// 8-bit RGBA PNG with only the IHDR, IDAT and IEND chunks.
function encodePng(size: number, rgba: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  // Each scanline starts with filter type 0 (none).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function main(): void {
  const outputDir = resolve(process.argv[2] ?? DEFAULT_OUTPUT_DIR);
  let failed = false;
  for (const icon of ICONS) {
    const path = join(outputDir, icon.file);
    try {
      writeFileSync(path, encodePng(icon.size, render(icon)));
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`brand-icons: could not write ${path}: ${message}\n`);
    }
  }
  if (failed) process.exitCode = 1;
}

main();
