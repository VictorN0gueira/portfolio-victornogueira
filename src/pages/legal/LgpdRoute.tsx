import LgpdPage from '../LgpdPage';
import { LegalFrame } from './LegalFrame';

/** /lgpd: the frozen page inside the editorial frame. Loaded with import() by App. */
export default function LgpdRoute() {
  return (
    <LegalFrame>
      <LgpdPage />
    </LegalFrame>
  );
}
