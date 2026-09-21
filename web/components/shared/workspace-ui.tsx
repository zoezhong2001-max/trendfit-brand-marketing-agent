import { ScanLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { DECISIONS, type Decision } from '@/lib/data';

export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <span className={'badge decision ' + decision}>{DECISIONS[decision]}</span>
  );
}

export function LineList({ items }: { items: string[] }) {
  return (
    <ul className="lines">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <ScanLine size={30} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
