import { projectImageManifest } from '../data/projectImages';
import { assetUrl } from './asset';
import { SITE } from './site';

/** A self-hosted project screenshot, ready to spread on an img: every size is known before it loads. */
export interface ProjectImage {
  /** The widest WebP. Browsers that read srcset pick from there; this one is the fallback. */
  readonly src: string;
  readonly srcSet: string;
  /** The narrowest WebP, for decoration such as a blurred backdrop. */
  readonly thumbSrc: string;
  /** Pixel size of the widest file: the aspect ratio the img reserves, so nothing shifts. */
  readonly width: number;
  readonly height: number;
  /** Absolute URL of the JPEG made for social sharing. Only the cover of a project has one. */
  readonly shareUrl?: string;
}

const PROJECTS_PATH = '/projects';

function webpPath(key: string, width: number): string {
  return assetUrl(`${PROJECTS_PATH}/${key}-${width}.webp`);
}

/**
 * The files of one screenshot. The key is "<project slug>/<name>", as listed in the generated manifest
 * (src/data/projectImages.ts). An unknown key throws, so a typo fails the first test instead of a visitor.
 */
export function projectImage(key: string): ProjectImage {
  const entry = projectImageManifest[key];
  if (!entry) throw new Error(`Unknown project image "${key}". Run scripts/process-project-images.mjs.`);
  const widths = [...entry.widths].sort((a, b) => a - b);

  return {
    src: webpPath(key, widths[widths.length - 1]),
    srcSet: widths.map((width) => `${webpPath(key, width)} ${width}w`).join(', '),
    thumbSrc: webpPath(key, widths[0]),
    width: entry.width,
    height: entry.height,
    shareUrl: entry.hasShare ? `${SITE.url}${PROJECTS_PATH}/${key}-share.jpg` : undefined,
  };
}
