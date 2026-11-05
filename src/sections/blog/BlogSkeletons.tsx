import { blogCopy } from './blogCopy';

// A block of a skeleton: it pulses (an opacity change) only where motion is welcome, and sits still otherwise.
const BLOCK = 'motion-safe:animate-pulse bg-vn-gray-light';
const DARK_BLOCK = 'motion-safe:animate-pulse bg-vn-gray-dark';
const CARD_COUNT = 6;

function SkeletonCard() {
  return (
    <div data-skeleton="card" className="overflow-hidden rounded-card border border-vn-gray-light bg-vn-white">
      <div className={`aspect-[16/10] ${BLOCK}`} />
      <div className="space-y-4 p-5 md:p-6">
        <div className="flex gap-2">
          <div className={`h-5 w-16 rounded-full ${BLOCK}`} />
          <div className={`h-5 w-20 rounded-full ${BLOCK}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-5 w-full rounded ${BLOCK}`} />
          <div className={`h-5 w-3/4 rounded ${BLOCK}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-3 w-full rounded ${BLOCK}`} />
          <div className={`h-3 w-5/6 rounded ${BLOCK}`} />
        </div>
      </div>
    </div>
  );
}

function SkeletonFeatured() {
  return (
    <div
      data-skeleton="featured"
      className="grid overflow-hidden rounded-card bg-vn-black md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]"
    >
      <div className={`aspect-[16/10] md:aspect-auto md:min-h-80 ${DARK_BLOCK}`} />
      <div className="flex flex-col justify-center space-y-4 p-6 md:p-10">
        <div className={`h-4 w-24 rounded-full ${DARK_BLOCK}`} />
        <div className="space-y-2">
          <div className={`h-7 w-full rounded ${DARK_BLOCK}`} />
          <div className={`h-7 w-3/4 rounded ${DARK_BLOCK}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-3 w-full rounded ${DARK_BLOCK}`} />
          <div className={`h-3 w-5/6 rounded ${DARK_BLOCK}`} />
          <div className={`h-3 w-4/6 rounded ${DARK_BLOCK}`} />
        </div>
      </div>
    </div>
  );
}

/**
 * What the list shows while the sources answer: the featured card and six cards as gray blocks. The picture is hidden from
 * assistive tech, and the status carries the words (a live region announces its content, not its name).
 */
export function BlogSkeletons() {
  return (
    <div role="status" aria-label={blogCopy.loadingLabel}>
      <span className="sr-only">{blogCopy.loadingLabel}</span>
      <div aria-hidden="true" className="space-y-6">
        <SkeletonFeatured />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
