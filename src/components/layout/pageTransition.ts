import { EASE_OUT } from '../../lib/motion';

/** Opacity only: the page fades out, the next one fades in. Shared by the layout and the blog route. */
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE_OUT },
};
