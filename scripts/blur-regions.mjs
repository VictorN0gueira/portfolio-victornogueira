// Blurs chosen regions of a screenshot so that private details (faces, phone numbers, names, e-mails)
// are not recoverable, and leaves every other pixel exactly as it was.
//
// How one region is made, so that the blurred patch melts into the interface:
//   1. the pixels inside the region are cut out and set on a flat patch of the local background colour,
//      so that bright neighbours (a name above a phone number) cannot bleed into the blur;
//   2. that patch gets a strong gaussian blur (sigma about 10 px: digits and faces cannot be read back);
//   3. it is laid over the screenshot through a feathered mask (a soft circle or a soft rounded rectangle),
//      so there is no hard edge and no halo.
// Nothing outside the region plus its feather is touched: the patches are composited over the untouched
// pixels and are fully transparent beyond the feather.
//
// A region is { shape: 'circle', cx, cy, r } or { shape: 'rect', x, y, w, h, radius }, in source pixels,
// with an optional sigma and feather of its own. The shape must cover everything to hide: the blur is
// fully opaque over the shape and fades out over `feather` px beyond it.
import sharp from 'sharp';

export const DEFAULT_SIGMA = 10;
export const DEFAULT_FEATHER = 5;
/** The source pixels are kept this far beyond the shape; farther out they are replaced by the background. */
const CLIP_GROW = 2;
/** The ring of pixels used to estimate the background colour starts this far beyond the shape. */
const BACKGROUND_GROW = 6;
const CHANNELS = 3;

/** The smallest axis aligned box around a region, in source pixels. */
export function regionBounds(region) {
  if (region.shape === 'circle') {
    return { left: region.cx - region.r, top: region.cy - region.r, width: region.r * 2, height: region.r * 2 };
  }
  return { left: region.x, top: region.y, width: region.w, height: region.h };
}

/** How far a region's patch reaches beyond its bounds: the blur spread plus the feather tail. */
export function regionReach(region, defaults = {}) {
  const sigma = region.sigma ?? defaults.sigma ?? DEFAULT_SIGMA;
  const feather = region.feather ?? defaults.feather ?? DEFAULT_FEATHER;
  return Math.ceil(3 * sigma) + Math.ceil(3 * feather);
}

function patchBox(region, reach, imageWidth, imageHeight) {
  const bounds = regionBounds(region);
  const left = Math.max(0, Math.floor(bounds.left - reach));
  const top = Math.max(0, Math.floor(bounds.top - reach));
  const right = Math.min(imageWidth, Math.ceil(bounds.left + bounds.width + reach));
  const bottom = Math.min(imageHeight, Math.ceil(bounds.top + bounds.height + reach));
  return { left, top, width: right - left, height: bottom - top };
}

/** SVG of the region shape, white on black, drawn in the coordinates of the patch box. */
function shapeSvg(region, box, grow) {
  const shape =
    region.shape === 'circle'
      ? `<circle cx="${region.cx - box.left}" cy="${region.cy - box.top}" r="${region.r + grow}" fill="#fff"/>`
      : `<rect x="${region.x - box.left - grow}" y="${region.y - box.top - grow}" width="${region.w + grow * 2}" height="${region.h + grow * 2}" rx="${(region.radius ?? region.h / 2) + grow}" fill="#fff"/>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><rect width="100%" height="100%" fill="#000"/>${shape}</svg>`,
  );
}

/** A greyscale mask of the shape grown by `grow` px and softened by a gaussian of `softness` px (0 keeps it hard). */
async function grayMask(region, box, grow, softness) {
  let mask = sharp(shapeSvg(region, box, grow), { density: 72 }).greyscale();
  if (softness > 0) mask = mask.blur(softness);
  return mask.raw().toBuffer();
}

function median(values) {
  const sorted = Uint8Array.from(values).sort();
  return sorted[Math.floor(sorted.length / 2)];
}

/** The local background colour: the median colour of the pixels well outside the shape. */
function backgroundColour(pixels, hardOutside, pixelCount) {
  const samples = [[], [], []];
  for (let index = 0; index < pixelCount; index += 1) {
    if (hardOutside[index] > 8) continue;
    for (let channel = 0; channel < CHANNELS; channel += 1) samples[channel].push(pixels[index * CHANNELS + channel]);
  }
  if (samples[0].length === 0) throw new Error('a blur region covers its whole patch: there is no background left to measure');
  return samples.map(median);
}

/** The patch pixels: the source inside the clip shape, the flat background everywhere else. */
function clippedSource(pixels, clip, background, pixelCount) {
  const out = Buffer.alloc(pixelCount * CHANNELS);
  for (let index = 0; index < pixelCount; index += 1) {
    const inside = clip[index] > 127;
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      const offset = index * CHANNELS + channel;
      out[offset] = inside ? pixels[offset] : background[channel];
    }
  }
  return out;
}

async function buildPatch(source, region, defaults, imageWidth, imageHeight) {
  const sigma = region.sigma ?? defaults.sigma ?? DEFAULT_SIGMA;
  const feather = region.feather ?? defaults.feather ?? DEFAULT_FEATHER;
  const box = patchBox(region, regionReach(region, defaults), imageWidth, imageHeight);
  const pixelCount = box.width * box.height;
  const pixels = await sharp(source).extract(box).removeAlpha().raw().toBuffer();
  const clip = await grayMask(region, box, CLIP_GROW, 0);
  const farClip = await grayMask(region, box, BACKGROUND_GROW, 0);
  const background = backgroundColour(pixels, farClip, pixelCount);
  const flat = clippedSource(pixels, clip, background, pixelCount);
  const rawOptions = { raw: { width: box.width, height: box.height, channels: CHANNELS } };
  const blurred = await sharp(flat, rawOptions).blur(sigma).raw().toBuffer();
  // The mask is grown by the feather and softened by half of it: it is fully opaque (98 percent or more)
  // over the whole shape, so nothing of the original shows through, and fades out within the feather band.
  const mask = await grayMask(region, box, feather, feather / 2);
  const input = await sharp(blurred, rawOptions)
    .joinChannel(mask, { raw: { width: box.width, height: box.height, channels: 1 } })
    .png({ compressionLevel: 1 })
    .toBuffer();
  return { input, left: box.left, top: box.top };
}

/**
 * Blurs the regions of a screenshot. Takes encoded image bytes, returns a PNG buffer (lossless, so the
 * later resize and WebP encode are the first and only lossy steps). Pixels outside every region plus its
 * reach are identical to the input.
 */
export async function applyBlurRegions(input, regions, defaults = {}) {
  if (regions.length === 0) return input;
  const { width, height } = await sharp(input).metadata();
  const patches = [];
  for (const region of regions) patches.push(await buildPatch(input, region, defaults, width, height));
  return sharp(input).composite(patches).png({ compressionLevel: 6 }).toBuffer();
}
