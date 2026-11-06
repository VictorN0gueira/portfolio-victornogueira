import { useId } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { assetUrl } from '../../lib/asset';
import { PageHero } from '../shared/PageHero';
import { FounderPhoto } from './FounderPhoto';
import { founderVoice, type FounderSegment } from './founderVoice';

const CV_URL = assetUrl(founderVoice.cvUrlPath);

function Paragraph({ segments }: { segments: readonly FounderSegment[] }) {
  return (
    <p className="text-pretty text-base text-vn-gray-dark md:text-lg">
      {segments.map(({ text, isStrong }) =>
        isStrong ? (
          <span key={text} className="font-medium text-vn-ink">
            {text}
          </span>
        ) : (
          text
        ),
      )}
    </p>
  );
}

/**
 * The top of /sobre: the hero of the inner pages with the founder's own words. The h1 is "Sobre mim", the place is the
 * kicker, the two paragraphs and the CV button come after it and the photo is the second column from lg. On a phone the
 * photo comes after the text (the order of the DOM).
 */
export function FounderIntro() {
  const newTabHintId = useId();

  return (
    <PageHero kicker={founderVoice.place} title={founderVoice.title} hasCursor aside={<FounderPhoto />}>
      <div className="mt-6 flex max-w-2xl flex-col gap-5">
        {founderVoice.paragraphs.map((segments, i) => (
          <Paragraph key={i} segments={segments} />
        ))}
      </div>
      <NewTabHint id={newTabHintId} />
      <div className="mt-8">
        <Button asChild intent="secondary" size="lg">
          <a
            href={CV_URL}
            download={founderVoice.cvFileName}
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby={newTabHintId}
          >
            <Download aria-hidden="true" className="size-4 shrink-0" />
            {founderVoice.cvLabel}
          </a>
        </Button>
      </div>
    </PageHero>
  );
}
