import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  HEADER_HEIGHT,
  HEADER_HEIGHT_LANDSCAPE,
  HEADER_LANDSCAPE_LIFT,
  HEADER_TOP_OFFSET,
} from '../../components/layout/headerMetrics';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Kicker } from '../../components/ui/Kicker';
import { ScanGrid } from '../../components/ui/ScanGrid';
import { Section } from '../../components/ui/Section';
import type { HeroTaskId } from '../../data/heroFlows';
import { homeCopy } from '../../data/homeCopy';
import { AutomationPanel } from './AutomationPanel';
import { HeroAnnotation, HeroFinePrint, HeroSentence } from './HeroSentence';

const DEFAULT_TASK: HeroTaskId = 'planilha-whatsapp';

// The content starts below the fixed header, with room to breathe (a little more on wide screens).
// The header's own numbers come from Header.tsx, in rem, so this follows a larger font and the notch like it does.
// A phone held sideways has a shorter header that sits 0.5rem higher, so it gets its own offset.
const BREATHING_ROOM = 'clamp(2rem, 1rem + 4vw, 5rem)';
const CONTENT_TOP_VARS = {
  '--hero-top': `calc(${HEADER_TOP_OFFSET} + ${HEADER_HEIGHT} + ${BREATHING_ROOM})`,
  '--hero-top-landscape': `calc(${HEADER_TOP_OFFSET} - ${HEADER_LANDSCAPE_LIFT} + ${HEADER_HEIGHT_LANDSCAPE} + ${BREATHING_ROOM})`,
} as CSSProperties;
const CONTENT_TOP_CLASSES = 'pt-[var(--hero-top)] [@media(max-height:480px)]:pt-[var(--hero-top-landscape)]';

// The panel lies flat in the reading position, so this is the column the sentence and the panel live in.
const COLUMN_CLASSES = 'w-full max-w-5xl';

/**
 * The first screen of the home: an inset cream card with the scan grid behind it, the interactive sentence, the
 * note about its numbers, the promise, the two calls to action, and the live automation panel.
 * The task chosen in the sentence is the task the panel shows, so the state lives here.
 * The card clips its own overflow (rounded corners, the grid, and the few pixels the tilted panel may lean out by)
 * and has no minimum height, so on a phone held sideways the panel sits right under the sentence.
 */
export function HeroSection() {
  const [task, setTask] = useState<HeroTaskId>(DEFAULT_TASK);
  const { kicker, sub, ctaPrimary, ctaSecondary } = homeCopy.hero;

  return (
    <Section
      tone="cream"
      className="mx-2 mt-2 overflow-hidden rounded-[clamp(24px,4vw,40px)] border border-vn-gray-light py-0 min-[360px]:mx-3 min-[360px]:mt-3 md:mx-6 md:mt-6"
    >
      <ScanGrid />
      <div style={CONTENT_TOP_VARS} className={`${CONTENT_TOP_CLASSES} pb-[clamp(2rem,1rem+4vw,5rem)]`}>
        <Container className="flex flex-col items-center text-center">
          <Kicker className="items-center">{kicker}</Kicker>
          <div className={`${COLUMN_CLASSES} mt-6`}>
            <HeroSentence task={task} onTaskChange={setTask} />
          </div>
          {/* Under the sentence, at its right side, so the arrow of the note rises to the numbers in it. */}
          <div className={`${COLUMN_CLASSES} lg:flex lg:justify-end`}>
            <HeroAnnotation />
          </div>
          <p className="mt-6 max-w-2xl text-pretty text-base text-vn-gray-dark md:text-lg">{sub}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to={ctaPrimary.to}>{ctaPrimary.label}</Link>
            </Button>
            <Button asChild size="lg" intent="secondary">
              <Link to={ctaSecondary.to}>{ctaSecondary.label}</Link>
            </Button>
          </div>
          <div className="mt-5">
            <HeroFinePrint />
          </div>
          <div className={`${COLUMN_CLASSES} mt-10 md:mt-14`}>
            <AutomationPanel task={task} />
          </div>
        </Container>
      </div>
    </Section>
  );
}
