// Which regions of which original screenshot are blurred before the image is resized.
// The key is "<project slug>/<file name>" exactly as in the input folder of process-project-images.mjs.
// Coordinates are pixels of the ORIGINAL screenshot, so the same values work whatever the output size is.
//
//   regions      always blurred: contact photos and phone numbers, the owner's name, e-mail and photo,
//                the owner's photo in the top bar
//   nameRegions  contact names. Not blurred by default; they are blurred only when the script is run with
//                --blur-names (the "blurNames" switch), so the owner can turn it on later without
//                re-measuring anything.
//
// Files that are not listed here are processed untouched (the Hub081 login screen shows no private data).

export const BLUR_DEFAULTS = Object.freeze({ sigma: 10, feather: 5 });

const circle = (cx, cy, r, feather) => ({ shape: 'circle', cx, cy, r, ...(feather ? { feather } : {}) });
/** A rounded rectangle with fully round ends. A narrow feather keeps the blur off neighbouring text lines. */
const pill = (x, y, w, h, feather, sigma) => ({
  shape: 'rect',
  x,
  y,
  w,
  h,
  radius: h / 2,
  ...(feather ? { feather } : {}),
  ...(sigma ? { sigma } : {}),
});

// ---------------------------------------------------------------------------------------------
// Hub081 (1918 or 1919 by 911, dark interface)
// ---------------------------------------------------------------------------------------------
/** Thin grey text is diluted by a strong blur until nothing is left, so single lines use the low end of the range. */
const TEXT_SIGMA = 8;
const HUB_ROW_COUNT = 5;
const HUB_ROW_STEP = 134;
/** The widths of the name lines of the five visible conversations (Rodrigo Leitte ... Bonner). */
const HUB_NAME_WIDTHS = [112, 100, 54, 86, 62];

const hubRows = (build) => Array.from({ length: HUB_ROW_COUNT }, (_, row) => build(row * HUB_ROW_STEP, row));

/** The round contact photo, with its small channel badge, of each conversation in the list. */
const hubContactPhotos = hubRows((shift) => circle(267, 263 + shift, 34, 2));
const hubContactPhones = hubRows((shift) => pill(299, 269 + shift, 110, 16, 3, TEXT_SIGMA));
const hubContactNames = hubRows((shift, row) => pill(299, 244 + shift, HUB_NAME_WIDTHS[row], 18, 3, TEXT_SIGMA));

/**
 * The owner block at the bottom of the sidebar (photo, name, e-mail) and the owner photo in the top bar.
 * shiftX is 0 for the conversations screenshot and -1 for the dashboards one, which is one pixel narrower.
 */
const hubOwner = (shiftX) => [
  circle(32 + shiftX, 877, 21, 3),
  pill(51 + shiftX, 860, 108, 19, 3),
  pill(51 + shiftX, 880, 160, 18, 3),
  circle(1880 + shiftX, 32, 21, 3),
];

// ---------------------------------------------------------------------------------------------
// DizPara (1920 by 889, light interface, owner photo in the top bar, business phone numbers)
// ---------------------------------------------------------------------------------------------
const dizparaOwnerPhoto = circle(1880, 30, 21, 3);

export const BLUR_SOURCES = Object.freeze({
  'hub081/conversas.png': {
    regions: [...hubContactPhotos, ...hubContactPhones, ...hubOwner(0)],
    nameRegions: hubContactNames,
  },
  'hub081/dashboards.png': {
    regions: hubOwner(-1),
    nameRegions: [],
  },
  'dizpara/lista-de-leads.png': {
    regions: [pill(1186, 729, 140, 20, 4, TEXT_SIGMA), pill(1186, 815, 140, 20, 4, TEXT_SIGMA), dizparaOwnerPhoto],
    nameRegions: [],
  },
  'dizpara/captura-de-leads.png': {
    regions: [dizparaOwnerPhoto],
    nameRegions: [],
  },
  'dizpara/nova-campanha.png': {
    regions: [dizparaOwnerPhoto],
    nameRegions: [],
  },
});

/** The regions to blur for one original; nameRegions are added only when blurNames is on. */
export function regionsFor(key, { blurNames = false } = {}) {
  const source = BLUR_SOURCES[key];
  if (!source) return [];
  return blurNames ? [...source.regions, ...source.nameRegions] : [...source.regions];
}
