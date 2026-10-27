import { useState } from 'react';
import { Link } from 'react-router-dom';
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

// The header is fixed at max(12px, notch inset) from the top and is about 58px tall (44px controls, 6px padding
// and a 1px border on each side). The content starts below it with room to breathe, a little more on wide screens.
const CONTENT_TOP_PADDING = 'calc(max(12px, env(safe-area-inset-top)) + 58px + clamp(2rem, 1rem + 4vw, 5rem))';

// The panel lies flat in the reading position, so this is the column everything under the kicker lives in.
const COLUMN_CLASSES = 'w-full max-w-5xl';

/**
 * The first screen of the home: an inset cream card with the scan grid behind it, the interactive sentence, the
 * promise under it, the two calls to action, and the live automation panel. The task chosen in the sentence is
 * the task the panel shows, so the state lives here. The card clips its own overflow (rounded corners, the
 * grid, and the few pixels the tilted panel may lean out by) and has no minimum height, so on a phone held
 * sideways the panel sits right under the sentence.
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
      <div style={{ paddingTop: CONTENT_TOP_PADDING }} className="pb-[clamp(2rem,1rem+4vw,5rem)]">
        <Container className="flex flex-col items-center text-center">
          <Kicker className="items-center">{kicker}</Kicker>
          <div className={`${COLUMN_CLASSES} mt-6`}>
            <HeroSentence task={task} onTaskChange={setTask} />
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
          <div className={`${COLUMN_CLASSES} relative mt-10 md:mt-14 lg:mt-16`}>
            {/* The note stands above the panel at the right and its arrow, flipped to point down, lands on it. */}
            <div className="absolute right-[8%] bottom-full z-10 mb-1 [&_svg]:scale-y-[-1]">
              <HeroAnnotation />
            </div>
            <AutomationPanel task={task} />
          </div>
        </Container>
      </div>
    </Section>
  );
}

export default HeroSection;
