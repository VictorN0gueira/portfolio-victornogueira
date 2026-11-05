import { useId } from 'react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { aboutCopy } from '../../data/aboutCopy';

const { company } = aboutCopy;
const ROW_STAGGER_S = 0.1;
const COLUMNS_CLASSES = 'grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16';

/**
 * What VN One is, right after the founder: the h2 and three short paragraphs made of what the site already says, and
 * beside them (below, on a phone) how the team works, in three rows closed by a 1px line. Two RevealGroups, one
 * observer each.
 */
export function CompanySection() {
  const headingId = useId();

  return (
    <Section tone="white" labelledBy={headingId}>
      <Container>
        <div className={COLUMNS_CLASSES}>
          <RevealGroup className="min-w-0">
            <RevealItem>
              <Kicker>{company.kicker}</Kicker>
            </RevealItem>
            <RevealItem className="mt-6 max-w-4xl">
              <Heading id={headingId} size="l">
                {company.heading}
              </Heading>
            </RevealItem>
            {company.paragraphs.map((paragraph) => (
              <RevealItem key={paragraph} className="mt-6 max-w-2xl">
                <p className="text-pretty text-base text-vn-gray-dark md:text-lg">{paragraph}</p>
              </RevealItem>
            ))}
          </RevealGroup>
          <RevealGroup stagger={ROW_STAGGER_S} className="min-w-0 lg:pt-14">
            <RevealItem>
              <Heading as="h3" size="m">
                {company.howTitle}
              </Heading>
            </RevealItem>
            {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
            <ul role="list" className="mt-6 border-t border-vn-gray-light">
              {company.how.map(({ title, text }) => (
                <li key={title} className="border-b border-vn-gray-light py-5">
                  <RevealItem variant="fade">
                    <p className="font-medium text-vn-ink">{title}</p>
                    <p className="mt-1 text-pretty text-base text-vn-gray-dark">{text}</p>
                  </RevealItem>
                </li>
              ))}
            </ul>
          </RevealGroup>
        </div>
      </Container>
    </Section>
  );
}
