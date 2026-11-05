import { projects } from '../data/projects';
import { Container } from './ui/Container';
import { RevealGroup, RevealItem } from './ui/Reveal';
import { Section } from './ui/Section';
import { FeaturedProjectCard } from './FeaturedProjectCard';
import { ProjectCard } from './ProjectCard';
import { cardLayout } from './projectGrid';

const featuredProjects = projects.filter((project) => project.featured);
const regularProjects = projects.filter((project) => !project.featured);

const FEATURED_LIST_CLASSES = 'grid list-none gap-6 p-0 md:gap-10';
const REGULAR_LIST_CLASSES =
  'mt-12 grid list-none gap-x-6 gap-y-8 p-0 md:mt-16 md:grid-cols-2 md:gap-x-8 lg:grid-cols-6 lg:gap-x-10 lg:gap-y-10';

/**
 * The list of projects of /projetos, on a white section: the two featured ones on black, then the five regular ones in a
 * grid. The h1 is the one of the PageHero above. Each list reveals as one group (one observer), and the h2 of every card
 * follows the h1 with no level skipped.
 */
export function Projects() {
  return (
    <Section tone="white">
      <Container>
        <RevealGroup as="ul" className={FEATURED_LIST_CLASSES}>
          {featuredProjects.map((project, index) => (
            <li key={project.slug} className="min-w-0">
              <RevealItem>
                <FeaturedProjectCard project={project} priority={index === 0} />
              </RevealItem>
            </li>
          ))}
        </RevealGroup>

        <RevealGroup as="ul" className={REGULAR_LIST_CLASSES}>
          {regularProjects.map((project, index) => {
            const { cellClassName, imageSizes } = cardLayout(index, regularProjects.length);
            return (
              <li key={project.slug} className={`min-w-0 ${cellClassName}`}>
                <RevealItem className="h-full">
                  <ProjectCard project={project} imageSizes={imageSizes} />
                </RevealItem>
              </li>
            );
          })}
        </RevealGroup>
      </Container>
    </Section>
  );
}
