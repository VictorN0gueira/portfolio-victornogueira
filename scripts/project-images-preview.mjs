// The original screenshot with the regions to blur outlined in red: a way to check coordinates before generating.
import sharp from 'sharp';

function outlineSvg(region) {
  const stroke = 'fill="none" stroke="#ff0033" stroke-width="2"';
  if (region.shape === 'circle') return `<circle cx="${region.cx}" cy="${region.cy}" r="${region.r}" ${stroke}/>`;
  const radius = region.radius ?? region.h / 2;
  return `<rect x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" rx="${radius}" ${stroke}/>`;
}

/** PNG bytes of the original with every region outlined. */
export async function drawPreview(bytes, regions) {
  const { width, height } = await sharp(bytes).metadata();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${regions.map(outlineSvg).join('')}</svg>`);
  return sharp(bytes).composite([{ input: svg }]).png().toBuffer();
}
