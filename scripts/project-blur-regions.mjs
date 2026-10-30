// Which regions of which original screenshot are blurred before the image is resized.
// The key is "<project slug>/<file name without extension>", lower case: the extension and its case never matter
// (hub081/conversas.PNG, .jpg and .jpeg all find the same entry). Coordinates are pixels of the ORIGINAL
// screenshot, so the same values work whatever the output size is.
//
//   size         the pixel sizes the coordinates were measured on. A screenshot of another size is refused
//                (the numbers would blur the wrong pixels and the run would still look fine).
//   regions      always blurred: contact photos and phone numbers, the owner's name, e-mail and photo,
//                credential looking names, private links, photos of people
//   nameRegions  names of people (leads). Blurred by default; the script only keeps them readable with
//                --keep-names.
//
// Fail closed: every original of every project must be listed here (with at least one region) or in
// ALLOWED_UNBLURRED (judged by hand to show no private data). Anything else stops the run, so a new
// screenshot cannot reach public/ without somebody looking at it.
//
// How the numbers were measured: open the original at 100 percent in an image viewer and read the box of the
// element in pixels (x, y from the top left corner). Run the script with --preview=<folder> to get each original
// back with its regions outlined in red, and check them before generating anything.

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
/** A rounded rectangle with its own corner radius. */
const panel = (x, y, w, h, radius, feather) => ({ shape: 'rect', x, y, w, h, radius, ...(feather ? { feather } : {}) });

/** Thin grey text is diluted by a strong blur until nothing is left, so single lines use the low end of the range. */
const TEXT_SIGMA = 8;

// ---------------------------------------------------------------------------------------------
// Hub081 (1918 or 1919 by 911, dark interface)
// ---------------------------------------------------------------------------------------------
const HUB_ROW_COUNT = 5;
const HUB_ROW_STEP = 134;
/** The widths of the name lines of the five visible conversations. */
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
  'hub081/conversas': {
    sizes: [{ width: 1919, height: 911 }],
    regions: [...hubContactPhotos, ...hubContactPhones, ...hubOwner(0)],
    nameRegions: hubContactNames,
  },
  'hub081/dashboards': {
    sizes: [{ width: 1918, height: 911 }],
    regions: hubOwner(-1),
    nameRegions: [],
  },
  'dizpara/lista-de-leads': {
    sizes: [{ width: 1920, height: 889 }],
    regions: [pill(1186, 729, 140, 20, 4, TEXT_SIGMA), pill(1186, 815, 140, 20, 4, TEXT_SIGMA), dizparaOwnerPhoto],
    nameRegions: [],
  },
  'dizpara/captura-de-leads': {
    sizes: [{ width: 1920, height: 889 }],
    regions: [dizparaOwnerPhoto],
    nameRegions: [],
  },
  'dizpara/nova-campanha': {
    sizes: [{ width: 1920, height: 889 }],
    regions: [dizparaOwnerPhoto],
    nameRegions: [],
  },
  // "Olá, Admin2026" reads like a user name and password pattern.
  'diagnostico-empresarial/dashboard': {
    sizes: [{ width: 1919, height: 913 }],
    regions: [pill(160, 53, 192, 46, 4)],
    nameRegions: [],
  },
  // The name of the person credited at the top right of the landing page.
  'diagnostico-empresarial/cover': {
    sizes: [{ width: 1919, height: 910 }],
    regions: [pill(1359, 20, 156, 22, 3, TEXT_SIGMA)],
    nameRegions: [],
  },
  // The red link of a note in the flow, "acessar painel de clientes".
  'dashboard-consumo-crm/fluxo-resumocliente': {
    sizes: [{ width: 1880, height: 853 }],
    regions: [pill(175, 621, 138, 13, 2, TEXT_SIGMA)],
    nameRegions: [],
  },
  // The playlist link printed under the button of the e-mail.
  'ai-playlist-maker/tela-email': {
    sizes: [{ width: 1661, height: 761 }],
    regions: [pill(732, 618, 250, 17, 2, TEXT_SIGMA)],
    nameRegions: [],
  },
  // The photo of a person in the collection carousel (the arrow buttons stay).
  'portal-link-in-bio/karlaalvares': {
    sizes: [{ width: 1920, height: 912 }],
    regions: [{ ...panel(799, 527, 322, 225, 18, 6), sigma: 14 }],
    nameRegions: [],
  },
});

/**
 * Screenshots judged by hand to show nothing private: product interface, brand pages of clients that are
 * published as clients on this site, forms with empty fields. A new screenshot must be added here or above.
 */
export const ALLOWED_UNBLURRED = Object.freeze([
  'hub081/login',
  'diagnostico-empresarial/login',
  'dashboard-consumo-crm/site2-resumocliente',
  'dashboard-consumo-crm/cover',
  'portal-link-in-bio/cover',
  'portal-link-in-bio/irmaocruz',
  'travel-ia/cover',
  'travel-ia/tela-email',
  'travel-ia/tela-mobile',
  'ai-playlist-maker/cover',
  'ai-playlist-maker/tela-mobile',
]);

/** The lower case key of an original: "<slug>/<name>", without extension. */
export function blurKey(slug, fileName) {
  const stem = fileName.replace(/\.[^./\\]+$/, '');
  return `${slug}/${stem}`.toLowerCase();
}

/** The regions to blur for one original (names included unless keepNames); an unknown key has none. */
export function regionsFor(key, { keepNames = false } = {}) {
  const source = BLUR_SOURCES[key.toLowerCase()];
  if (!source) return [];
  return keepNames ? [...source.regions] : [...source.regions, ...source.nameRegions];
}

/**
 * The reason a screenshot cannot be processed, or null when it can: not listed anywhere, listed without any
 * region, or measured on another pixel size.
 */
export function blurProblem(key, { width, height }) {
  const lower = key.toLowerCase();
  const source = BLUR_SOURCES[lower];
  if (!source) {
    return ALLOWED_UNBLURRED.includes(lower)
      ? null
      : `${key}: not listed in scripts/project-blur-regions.mjs (add it to BLUR_SOURCES or to ALLOWED_UNBLURRED after looking at it)`;
  }
  if (source.regions.length + source.nameRegions.length === 0) return `${key}: listed with no region to blur`;
  if (!source.sizes.some((size) => size.width === width && size.height === height)) {
    const wanted = source.sizes.map((size) => `${size.width}x${size.height}`).join(' or ');
    return `${key}: the blur regions were measured on ${wanted}, this file is ${width}x${height}`;
  }
  return null;
}
