import { ArrowLeft } from 'lucide-react';
import { m } from 'motion/react';
import { useId, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMotionAllowed } from '../hooks/useMotionAllowed';
import { useScramble } from '../hooks/useScramble';
import { splitLastWord } from '../sections/shared/splitLastWord';
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

// DRAFT copy, for the owner to review.
const NOT_FOUND_COPY = {
  title: 'Página não encontrada',
  body: 'A página que você procura não existe ou foi movida para outro endereço.',
  back: 'Voltar ao início',
} as const;

// The content starts below the floating header (the same top as the PageHero) and the block is centred in what is left.
const BREATHING_ROOM = '1.5rem';
const CONTENT_VARS = {
  '--nf-top': `calc(${HEADER_TOP_OFFSET} + ${HEADER_HEIGHT} + ${BREATHING_ROOM})`,
  '--nf-top-landscape': `calc(${HEADER_TOP_OFFSET} - ${HEADER_LANDSCAPE_LIFT} + ${HEADER_HEIGHT_LANDSCAPE} + ${BREATHING_ROOM})`,
} as CSSProperties;
const CONTENT_CLASSES = 'w-full pt-[var(--nf-top)] pb-12 vn-landscape:pt-[var(--nf-top-landscape)]';

const ENTRANCE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
} as const;

/**
 * The title for the eye (the scramble, then the real text) and for assistive technology (the real text, steady). The
 * accent cursor is the one accent of the section and stays with the last word, so it never sits alone on a line.
 */
function ScrambledTitle({ text }: { text: string }) {
  const { head, last } = splitLastWord(useScramble(text));

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" data-title-display="">
        {head}
        <span className="whitespace-nowrap">
          {last}
          <Cursor tone="accent" className="ml-[0.2em]" />
        </span>
      </span>
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
            <Heading as="h1" size="l" id={headingId} className="mt-6">
              <ScrambledTitle text={NOT_FOUND_COPY.title} />
            </Heading>
            <p className="mt-6 max-w-md text-pretty text-base text-vn-gray-light md:text-lg">{NOT_FOUND_COPY.body}</p>
            <Button asChild tone="dark" size="lg" className="mt-10">
              <Link to="/">
                <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
                {NOT_FOUND_COPY.back}
              </Link>
            </Button>
            <p className="mt-12 font-mono text-xs uppercase tracking-[.18em] text-vn-gray-light">
              &copy; {new Date().getFullYear()} VN One
            </p>
          </m.div>
        </Container>
      </div>
    </Section>
  );
}
