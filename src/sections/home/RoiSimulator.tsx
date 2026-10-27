import { useId, useState } from 'react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';
import {
  DEFAULT_HOURLY_RATE,
  TEAM_OPTIONS,
  annualManualCost,
  annualSavings,
  buildQuoteMessage,
  type RoiInput,
} from '../../lib/roi';
import { RoiControls } from './RoiControls';
import { RoiResults } from './RoiResults';
import { DEFAULT_HOURS, DEFAULT_TEAM_INDEX, parseHourlyRate } from './roiInput';

interface RoiSimulatorProps {
  /** Called with the pre-filled quote message of the current values when the visitor asks for the automation. */
  onQuoteRequest: (message: string) => void;
}

interface RoiHeaderProps {
  headingId: string;
}

/** The kicker, the h2 and the sub line, revealed as one group. */
function RoiHeader({ headingId }: RoiHeaderProps) {
  const { kicker, heading, sub } = homeCopy.roi;

  return (
    <RevealGroup>
      <RevealItem>
        <Kicker tone="dark">{kicker}</Kicker>
      </RevealItem>
      <RevealItem className="mt-6 max-w-4xl">
        <Heading id={headingId} size="l">
          {heading}
        </Heading>
      </RevealItem>
      <RevealItem className="mt-6 max-w-2xl">
        <p className="text-pretty text-base text-vn-gray-light md:text-lg">{sub}</p>
      </RevealItem>
    </RevealGroup>
  );
}

/**
 * The simulator of the home: a black section, inside a rounded wrapper that clips it, where the visitor sets the
 * hours of repetitive work, the people who do it and the hourly rate, and sees the yearly cost and the savings of
 * the shared formula (lib/roi.ts). Controls on the left and results on the right from lg, stacked below it.
 * The wrapper carries the rounded corners and the clipping (overflow-hidden, isolate so Safari clips composited
 * children too). The header and the body are one RevealGroup each. An empty hourly rate counts as 0 and the
 * field keeps what was typed. The button hands the exact quote message of the current values to the parent.
 * Needs AccessibilityProvider above it.
 */
export function RoiSimulator({ onQuoteRequest }: RoiSimulatorProps) {
  const headingId = useId();
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [teamIndex, setTeamIndex] = useState(DEFAULT_TEAM_INDEX);
  const [rateText, setRateText] = useState(String(DEFAULT_HOURLY_RATE));

  const input: RoiInput = {
    hoursPerWeek: hours,
    teamMultiplier: TEAM_OPTIONS[teamIndex].value,
    hourlyRate: parseHourlyRate(rateText),
  };

  return (
    <div className="isolate mx-2 overflow-hidden rounded-[clamp(24px,4vw,40px)] min-[360px]:mx-3 md:mx-6">
      <Section tone="black" labelledBy={headingId}>
        <Container>
          <RoiHeader headingId={headingId} />
          <RevealGroup className="mt-10 grid grid-cols-1 gap-8 md:mt-14 lg:grid-cols-2 lg:gap-12">
            <RevealItem className="min-w-0">
              <RoiControls
                hours={hours}
                onHoursChange={setHours}
                teamIndex={teamIndex}
                onTeamChange={setTeamIndex}
                rateText={rateText}
                onRateTextChange={setRateText}
              />
            </RevealItem>
            <RevealItem className="min-w-0">
              <RoiResults
                cost={annualManualCost(input)}
                savings={annualSavings(input)}
                onQuoteRequest={() => onQuoteRequest(buildQuoteMessage(input))}
              />
            </RevealItem>
          </RevealGroup>
        </Container>
      </Section>
    </div>
  );
}

export default RoiSimulator;
