// Crops applied to an original after it is blurred and before it is resized. A crop only cuts: no pixel is
// painted, moved or redrawn.
//
// The key is "<project slug>/<file name without extension>", lower case. The entry lists the pixel size of the
// original the numbers were measured on (another size is refused) and the images made from it. An original with
// an entry here is NOT written as itself: only the crops are, each under its own name.
//
// Why: three screenshots of the AI Playlist Maker, Travel IA and Hub081 carry things that do not belong on the
// site. The Spotify embed behind the AI Playlist Maker page printed "this content is not available" across the
// title, so the desktop shot is reduced to the form card (the notice is hidden behind the card) and the phone
// shot to its top, above the notice. The Hub081 login keeps only its dark form half (the other half is a white
// block with the logo). The Travel IA phone shot stops above the form card so it does not end in the middle of a
// field.

export const CROPS = Object.freeze({
  'ai-playlist-maker/cover': {
    size: { width: 1915, height: 908 },
    images: [{ name: 'formulario', left: 1196, top: 100, width: 504, height: 710 }],
  },
  'ai-playlist-maker/tela-mobile': {
    size: { width: 1170, height: 1992 },
    images: [{ name: 'tela-mobile', left: 0, top: 0, width: 1170, height: 735 }],
  },
  'travel-ia/tela-mobile': {
    size: { width: 1170, height: 1992 },
    images: [{ name: 'tela-mobile', left: 0, top: 0, width: 1170, height: 1290 }],
  },
  'hub081/login': {
    size: { width: 1918, height: 911 },
    images: [{ name: 'login', left: 0, top: 165, width: 975, height: 580 }],
  },
});

/** The crops of one original (null when it has none), after checking that the original is the size they were measured on. */
export function cropsFor(key, { width, height }) {
  const entry = CROPS[key.toLowerCase()];
  if (!entry) return null;
  if (entry.size.width !== width || entry.size.height !== height) {
    throw new Error(`${key}: the crops were measured on ${entry.size.width}x${entry.size.height}, this file is ${width}x${height}`);
  }
  return entry.images;
}
