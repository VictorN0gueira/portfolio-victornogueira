import { Search, X } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
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
  /** Nothing to filter yet (loading, error, no article): the band stays, with every control off, so the page does not move. */
  isDisabled: boolean;
  /** The search field. The controls that disappear when they are used give the focus back to it. */
  searchRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (query: string) => void;
  onLangChange: (filter: LangFilter) => void;
  onCatChange: (filter: CatFilter) => void;
  onClear: () => void;
}

// A chip is a plain button of at least 44px. The rows wrap, so nothing scrolls sideways and no ring is cut by an ancestor.
const CHIP_BASE =
  'inline-flex min-h-11 items-center rounded-full border px-4 font-mono text-xs font-medium uppercase tracking-[.12em] vn-focus-ring-ink disabled:cursor-not-allowed disabled:opacity-50';
const CHIP_ON = 'border-vn-ink bg-vn-ink text-vn-white';
const CHIP_OFF = 'border-vn-gray-light bg-vn-white text-vn-ink enabled:hover:border-vn-ink';
const ROW_CLASSES = 'flex flex-wrap gap-2';

const LANG_FILTERS = Object.keys(LANG_LABELS) as LangFilter[];
const CAT_FILTERS = Object.keys(CAT_LABELS) as CatFilter[];

interface SearchFieldProps {
  query: string;
  isDisabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (query: string) => void;
}

function SearchField({ query, isDisabled, inputRef, onChange }: SearchFieldProps) {
  // The clear button goes away with the query: the focus goes to the field, or it would drop to the body (WCAG 2.4.3).
  const clearSearch = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div role="search" className="relative max-w-md">
      <label htmlFor="search" className="sr-only">
        {blogCopy.filters.searchLabel}
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-vn-gray-dark" />
      <input
        id="search"
        ref={inputRef}
        value={query}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={blogCopy.filters.searchPlaceholder}
        className="h-12 w-full rounded-full border border-vn-gray-light bg-vn-white pl-11 pr-12 text-base text-vn-ink placeholder:text-vn-gray-dark vn-focus-ring-ink disabled:cursor-not-allowed disabled:opacity-50"
      />
      {query && (
        <button
          type="button"
          aria-label={blogCopy.filters.clearSearch}
          disabled={isDisabled}
          onClick={clearSearch}
          className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-vn-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-vn-ink disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

interface ChipRowProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T;
  isDisabled: boolean;
  onSelect: (option: T) => void;
  renderLabel: (option: T) => ReactNode;
}

function ChipRow<T extends string>({ label, options, selected, isDisabled, onSelect, renderLabel }: ChipRowProps<T>) {
  return (
    <div role="group" aria-label={label} className={ROW_CLASSES}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={selected === option}
          disabled={isDisabled}
          onClick={() => onSelect(option)}
          className={cn(CHIP_BASE, selected === option ? CHIP_ON : CHIP_OFF)}
        >
          {renderLabel(option)}
        </button>
      ))}
    </div>
  );
}

function renderLanguage(filter: LangFilter) {
  const { flag, text, lang } = LANG_LABELS[filter];
  return (
    <>
      {flag && <span aria-hidden="true">{flag}&nbsp;</span>}
      <span lang={lang}>{text}</span>
    </>
  );
}

/**
 * The search, the two rows of chips and the count, on a white band under the hero. The count is a polite status region that
 * is in the page before any filter is used, so the number is announced when it appears and when it changes. It is the only
 * announcement of the results (the empty block of the list is plain text). When nothing matches, the empty block has the
 * Limpar filtros button, so the band does not show a second one.
 */
export function BlogFilters(props: BlogFiltersProps) {
  const { searchQuery, langFilter, catFilter, resultCount, hasActiveFilters, isDisabled, searchRef } = props;
  const hasClearButton = hasActiveFilters && resultCount > 0;
  // The button goes away with the filters: the focus goes to the search field, or it would drop to the body (WCAG 2.4.3).
  const clearFilters = () => {
    props.onClear();
    searchRef.current?.focus();
  };

  return (
    <Section tone="white" className="border-b border-vn-gray-light py-[clamp(1.5rem,1rem+2vw,2.5rem)]">
      <Container>
        <div className="flex flex-col gap-4" aria-busy={isDisabled}>
          <SearchField
            query={searchQuery}
            isDisabled={isDisabled}
            inputRef={searchRef}
            onChange={props.onSearchChange}
          />
          <ChipRow
            label={blogCopy.filters.languageGroup}
            options={LANG_FILTERS}
            selected={langFilter}
            isDisabled={isDisabled}
            onSelect={props.onLangChange}
            renderLabel={renderLanguage}
          />
          <ChipRow
            label={blogCopy.filters.topicGroup}
            options={CAT_FILTERS}
            selected={catFilter}
            isDisabled={isDisabled}
            onSelect={props.onCatChange}
            renderLabel={(filter) => CAT_LABELS[filter]}
          />
          <div className="flex flex-wrap items-center gap-x-4 has-[p:empty]:-mt-4">
            <p role="status" className="font-mono text-xs uppercase tracking-[.12em] text-vn-gray-dark">
              {hasActiveFilters && countLabel(resultCount)}
            </p>
            {hasClearButton && (
              <button
                type="button"
                disabled={isDisabled}
                onClick={clearFilters}
                className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[.12em] text-vn-ink underline underline-offset-4 vn-focus-ring-ink disabled:opacity-50"
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
