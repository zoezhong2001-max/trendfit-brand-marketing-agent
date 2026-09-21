import { Bookmark, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTIONS, type Action, type Opportunity } from '@/lib/data';

export function FeedbackActions({
  opportunity,
  onSelect,
}: {
  opportunity: Opportunity;
  onSelect: (opportunity: Opportunity, action: Action) => void;
}) {
  return (
    <div className="actions">
      {(['keep', 'reject', 'request_evidence'] as Action[]).map((action) => (
        <Button
          key={action}
          className="secondary"
          onClick={() => onSelect(opportunity, action)}
        >
          {action === 'keep' ? (
            <Bookmark size={15} />
          ) : action === 'reject' ? (
            <X size={15} />
          ) : (
            <Search size={15} />
          )}{' '}
          {ACTIONS[action]}
        </Button>
      ))}
    </div>
  );
}
