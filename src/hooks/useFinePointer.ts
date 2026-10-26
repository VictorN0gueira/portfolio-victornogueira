import { useMediaQuery } from './useMediaQuery';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/** True on devices whose primary input can hover and point precisely (a mouse or trackpad). */
export function useFinePointer(): boolean {
  return useMediaQuery(FINE_POINTER_QUERY);
}
