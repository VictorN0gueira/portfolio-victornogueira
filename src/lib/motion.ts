/**
 * The one easing of the site, as the four points of a cubic bezier that motion expects. It is the `--ease-out` token of
 * src/styles/tokens.css (a unit test keeps the two equal), so a CSS transition and a motion animation feel the same.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
