import type { ReactionType } from '../../../module/reaction/share/reactionType.ts';

/** The Reaction Module Model. */
export type ReactionModuleConfiguration = {
  guild: string;
  channel: string;
  reaction: string[];
  type: ReactionType;
  exclusion?: {
    user?: string[];
    role?: string[];
  };
};

/** The Reaction Forwarder Module Model */
export type ReactionModuleForwardConfiguration = {
  guild: string;
  from: string;
  to: string;
  reaction: string;
  within: number;
  alert?: string;
};
