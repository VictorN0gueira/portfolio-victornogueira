import PrivacyPage from '../PrivacyPage';
import { LegalFrame } from './LegalFrame';

/** /privacidade: the frozen page inside the editorial frame. Loaded with import() by App. */
export default function PrivacyRoute() {
  return (
    <LegalFrame>
      <PrivacyPage />
    </LegalFrame>
  );
}
