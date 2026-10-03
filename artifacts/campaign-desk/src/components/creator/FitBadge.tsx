import { Sparkles } from 'lucide-react';
import { FIT_EXPLAINER, fitLabel, fitTone } from './helpers';
import '@/styles/creator.css';

/** "Great fit 88%" with the scoring rules in a tooltip. */
export function FitBadge({ score }: { score: number }) {
  return (
    <span className={`pill t-${fitTone(score)} cr-fit`} title={FIT_EXPLAINER} tabIndex={0} aria-label={`${fitLabel(score)}, ${score} percent. ${FIT_EXPLAINER}`}>
      <Sparkles size={12} />{fitLabel(score)} {score}%
    </span>
  );
}
