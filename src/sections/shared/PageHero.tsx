import { Fragment, useId, type CSSProperties, type ReactNode } from 'react';
import {
  HEADER_HEIGHT,
  HEADER_HEIGHT_LANDSCAPE,
  HEADER_LANDSCAPE_LIFT,
  HEADER_TOP_OFFSET,
} from '../../components/layout/headerMetrics';
import { Container } from '../../components/ui/Container';
import { Cursor } from '../../components/ui/Cursor';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { ScanGrid } from '../../components/ui/ScanGrid';
import { Section } from '../../components/ui/Section';
import { cn } from '../../lib/utils';
import { NoBreakHyphens } from './NoBreakHyphens';
import { splitLastWord } from './splitLastWord';

// The same top as the HeroSection of the home, copied and not shared: the home hero stays closed (and so do the
// skeletons measured from it). The content starts below the fixed header with room to breathe.
const BREATHING_ROOM = 'clamp(2rem, 1rem + 4vw, 5rem)';
const CONTENT_TOP_VARS = {
  '--hero-top': `calc(${HEADER_TOP_OFFSET} + ${HEADER_HEIGHT} + ${BREATHING_ROOM})`,
  '--hero-top-landscape': `calc(${HEADER_TOP_OFFSET} - ${HEADER_LANDSCAPE_LIFT} + ${HEADER_HEIGHT_LANDSCAPE} + ${BREATHING_ROOM})`,
} as CSSProperties;
const CONTENT_TOP_CLASSES = 'pt-[var(--hero-top)] vn-landscape:pt-[var(--hero-top-landscape)]';

const TWO_COLUMNS_CLASSES = 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16';

interface PageHeroProps {
  kicker: string;
  /** The h1. The text keeps its case in the DOM and CSS lowercases it. */
  title: string;
  lead?: string;
  /** A blinking cursor after the last word. It is always ink: the hero is light and never uses the accent. */
  hasCursor?: boolean;
  /** After the lead: actions, paragraphs. */
  children?: ReactNode;
  /** The second column from lg: a photo, the contact channels. */
  aside?: ReactNode;
  id?: string;
}

/** A word with a hyphen never breaks at it, so "Link-in-Bio" is not cut in the middle. */
function Word({ word }: { word: string }) {
  return word.includes('-') ? <span className="whitespace-nowrap">{word}</span> : word;
}

function TitleHead({ head }: { head: string }) {
  const words = head.split(' ').filter((word) => word !== '');

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          <Word word={word} />{' '}
        </Fragment>
      ))}
    </>
  );
}

/** The title with the last word and the cursor in one block that cannot wrap, so the cursor never sits alone. */
function HeroTitle({ title, hasCursor }: { title: string; hasCursor: boolean }) {
  const { head, last } = splitLastWord(title);
  const isNoWrap = hasCursor || last.includes('-');

  return (
    <>
      <TitleHead head={head} />
      {isNoWrap ? (
        <span className="whitespace-nowrap">
          {last}
          {hasCursor && <Cursor tone="ink" className="ml-[0.2em]" />}
        </span>
      ) : (
        last
      )}
    </>
  );
}

/**
 * The top of an inner page: a flat cream band (the inset card is the signature of the home cover) with the light scan
 * grid behind it and a border below. One column, and from lg two when there is an aside.
 */
export function PageHero({ kicker, title, lead, hasCursor = false, children, aside, id }: PageHeroProps) {
  const headingId = useId();

  return (
    <Section id={id} tone="cream" labelledBy={headingId} className="border-b border-vn-gray-light py-0">
      <ScanGrid />
      <div style={CONTENT_TOP_VARS} className={cn(CONTENT_TOP_CLASSES, 'pb-[clamp(3rem,2rem+4vw,6rem)]')}>
        <Container>
          <div data-hero-columns="" className={cn('grid grid-cols-1 gap-10', aside && TWO_COLUMNS_CLASSES)}>
            <div className="min-w-0">
              <Kicker>{kicker}</Kicker>
              <Heading as="h1" size="xl" id={headingId} className="mt-6">
                <HeroTitle title={title} hasCursor={hasCursor} />
              </Heading>
              {lead && (
                <p className="mt-6 max-w-2xl text-pretty text-base text-vn-gray-dark md:text-lg">
                  <NoBreakHyphens text={lead} />
                </p>
              )}
              {children}
            </div>
            {/* A div and not an aside: a complementary landmark inside main is flagged by accessibility checkers. */}
            {aside && (
              <div data-hero-aside="" className="min-w-0">
                {aside}
              </div>
            )}
          </div>
        </Container>
      </div>
    </Section>
  );
}
