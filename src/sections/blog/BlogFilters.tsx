import { Search, X } from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { cn } from '../../lib/utils';
import { CAT_LABELS, LANG_LABELS, blogCopy, countLabel } from './blogCopy';
import type { CatFilter, LangFilter } from './blogMeta';

interface BlogFiltersProps {
  searchQuery: string;
  langFilter: LangFilter;
  catFilter: CatFilter;
  /** How many articles pass the filters: it is read out in the status region once a filter is on. */
  resultCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (query: string) => void;
  onLangChange: (filter: LangFilter) => void;
  onCatChange: (filter: CatFilter) => void;
  onClear: () => void;
}

// A chip is a plain button of at least 44px. The rows wrap, so nothing scrolls sideways and no ring is cut by an ancestor.
const CHIP_BASE =
  'inline-flex min-h-11 items-center rounded-full border px-4 font-mono text-xs font-medium uppercase tracking-[.12em] vn-focus-ring-ink';
const CHIP_ON = 'border-vn-ink bg-vn-ink text-vn-white';
const CHIP_OFF = 'border-vn-gray-light bg-vn-white text-vn-ink hover:border-vn-ink';
const ROW_CLASSES = 'flex flex-wrap gap-2';

const LANG_FILTERS = Object.keys(LANG_LABELS) as LangFilter[];
const CAT_FILTERS = Object.keys(CAT_LABELS) as CatFilter[];

function chipClasses(isOn: boolean): string {
  return cn(CHIP_BASE, isOn ? CHIP_ON : CHIP_OFF);
}

function SearchField({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div role="search" className="relative max-w-md">
      <label htmlFor="search" className="sr-only">
        {blogCopy.filters.searchLabel}
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-vn-gray-dark" />
      <input
        id="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder={blogCopy.filters.searchPlaceholder}
        className="h-12 w-full rounded-full border border-vn-gray-light bg-vn-white pl-11 pr-12 text-base text-vn-ink placeholder:text-vn-gray-dark vn-focus-ring-ink"
      />
      {query && (
        <button
          type="button"
          aria-label={blogCopy.filters.clearSearch}
          onClick={() => onChange('')}
          className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-vn-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-vn-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * The search, the two rows of chips and the count, on a white band under the hero. The count is a polite status region that
 * is in the page before any filter is used, so the number is announced when it appears and when it changes. It is the only
 * announcement of the results (the empty block of the list is plain text).
 */
export function BlogFilters({
  searchQuery,
  langFilter,
  catFilter,
  resultCount,
  hasActiveFilters,
  onSearchChange,
  onLangChange,
  onCatChange,
  onClear,
}: BlogFiltersProps) {
  return (
    <Section tone="white" className="border-b border-vn-gray-light py-[clamp(1.5rem,1rem+2vw,2.5rem)]">
      <Container>
        <div className="flex flex-col gap-4">
          <SearchField query={searchQuery} onChange={onSearchChange} />

          <div role="group" aria-label={blogCopy.filters.languageGroup} className={ROW_CLASSES}>
            {LANG_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={langFilter === filter}
                onClick={() => onLangChange(filter)}
                className={chipClasses(langFilter === filter)}
              >
                {LANG_LABELS[filter].flag && <span aria-hidden="true">{LANG_LABELS[filter].flag}&nbsp;</span>}
                <span lang={LANG_LABELS[filter].lang}>{LANG_LABELS[filter].text}</span>
              </button>
            ))}
          </div>

          <div role="group" aria-label={blogCopy.filters.topicGroup} className={ROW_CLASSES}>
            {CAT_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={catFilter === filter}
                onClick={() => onCatChange(filter)}
                className={chipClasses(catFilter === filter)}
              >
                {CAT_LABELS[filter]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 has-[p:empty]:-mt-4">
            <p role="status" className="font-mono text-xs uppercase tracking-[.12em] text-vn-gray-dark">
              {hasActiveFilters && countLabel(resultCount)}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[.12em] text-vn-ink underline underline-offset-4 vn-focus-ring-ink"
              >
                {blogCopy.filters.clear}
              </button>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
