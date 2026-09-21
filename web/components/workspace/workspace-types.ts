import type {
  Action,
  Brand,
  Brief,
  BrandDraft,
  BriefDraft,
  Opportunity,
} from '@/lib/data';

export type Editor =
  | { kind: 'brand'; target: Brand; draft: BrandDraft; initial: BrandDraft }
  | { kind: 'brief'; target: Brief; draft: BriefDraft; initial: BriefDraft };

export type WorkspaceMove = { route: string; brand?: string };

export type FeedbackDraft = { a: Opportunity; action: Action };
