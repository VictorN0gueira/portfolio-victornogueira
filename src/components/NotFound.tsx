import { ArrowLeft } from 'lucide-react';
import { m } from 'motion/react';
import { useId, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { notFoundCopy } from '../data/notFoundCopy';
import { useMotionAllowed } from '../hooks/useMotionAllowed';
import { useScramble } from '../hooks/useScramble';
import { EASE_OUT } from '../lib/motion';
import { NotFoundGlitch } from './NotFoundGlitch';
import {
  HEADER_HEIGHT,
  HEADER_HEIGHT_LANDSCAPE,
  HEADER_LANDSCAPE_LIFT,
  HEADER_TOP_OFFSET,
} from './layout/headerMetrics';
import { Button } from './ui/Button';
import { Container } from './ui/Container';
import { Cursor } from './ui/Cursor';
import { Heading } from './ui/Heading';
import { ScanGrid } from './ui/ScanGrid';
import { Section } from './ui/Section';

// The content starts below the floating header (the same top as the PageHero) and the block is centred in what is left.
const BREATHING_ROOM = '1.5rem';
const LANDSCAPE_HEADER = `${HEADER_TOP_OFFSET} - ${HEADER_LANDSCAPE_LIFT} + ${HEADER_HEIGHT_LANDSCAPE}`;
const CONTENT_VARS = {
  '--nf-top': `calc(${HEADER_TOP_OFFSET} + ${HEADER_HEIGHT} + ${BREATHING_ROOM})`,
  '--nf-top-landscape': `calc(${LANDSCAPE_HEADER} + ${BREATHING_ROOM})`,
} as CSSProperties;
const BODY_CLASSES =
  'mt-6 max-w-md text-pretty text-base text-vn-gray-light md:text-lg vn-landscape:mt-3 vn-landscape:max-w-2xl';
const CONTENT_CLASSES = 'w-full pt-[var(--nf-top)] pb-12 vn-landscape:pt-[var(--nf-top-landscape)] vn-landscape:pb-6';

const ENTRANCE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE_OUT },
} as const;

/**
 * A word of the title, the one that sizes the line. While `frame` is set its letters are hidden and the frame is drawn
 * over them by `.vn-scramble-word::after` (components.css), which is not part of the text of the page.
 */
function TitleWord({ word, frame }: { word: string; frame: string | undefined }) {
  return (
    <span data-scramble={frame} className="vn-scramble-word">
      <span className={frame === undefined ? undefined : 'opacity-0'}>{word}</span>
    </span>
  );
}

/**
 * The title: its real words are in the flow, so the box (the wrap, the height, the accessible name) is decided by the
 * real text alone and never moves while the scramble runs. The accent cursor is the one accent of the section and stays
 * with the last word, so it never sits alone on a line.
 */
function ScrambledTitle({ text }: { text: string }) {
  const { shown, isScrambling } = useScramble(text);
  const words = text.split(' ');
  const frames = shown.split(' ');
  const lastIndex = words.length - 1;

  return (
    <>
      {words.map((word, index) => {
        const frame = isScrambling ? frames[index] : undefined;
        // The space after a word is part of the word: Chromium drops the space between two inline boxes that carry a
        // generated frame from the name of the heading, and joins the words.
        if (index < lastIndex) return <TitleWord key={`${index}-${word}`} word={`${word} `} frame={frame} />;
        return (
          <span key={`${index}-${word}`} className="whitespace-nowrap">
            <TitleWord word={word} frame={frame} />
            <Cursor tone="accent" className="ml-[0.2em]" />
          </span>
        );
      })}
    </>
  );
}

export default function NotFound() {
  const headingId = useId();
  const isMotionAllowed = useMotionAllowed();

  return (
    <Section tone="black" labelledBy={headingId} className="flex min-h-dvh items-center py-0">
      <ScanGrid tone="dark" />
      <div style={CONTENT_VARS} className={CONTENT_CLASSES}>
        <Container>
          <m.div
            initial={isMotionAllowed ? ENTRANCE.initial : false}
            animate={ENTRANCE.animate}
            transition={ENTRANCE.transition}
            className="mx-auto flex max-w-4xl flex-col items-center text-center"
          >
            <NotFoundGlitch />
            <Heading as="h1" size="l" id={headingId} className="mt-6 vn-landscape:mt-3">
              <ScrambledTitle text={notFoundCopy.title} />
            </Heading>
            <p className={BODY_CLASSES}>{notFoundCopy.description}</p>
            <Button asChild tone="dark" size="lg" className="mt-10 vn-landscape:mt-5 vn-landscape:min-h-11">
              <Link to="/">
                <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
                {notFoundCopy.back}
              </Link>
            </Button>
            <p className="mt-12 font-mono text-xs uppercase tracking-[.18em] text-vn-gray-light vn-landscape:mt-6">
              &copy; {new Date().getFullYear()} VN One
            </p>
          </m.div>
        </Container>
      </div>
    </Section>
  );
}
