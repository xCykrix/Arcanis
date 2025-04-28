import type { ReactionType } from '../../../module/reaction/share/types.ts';

/** The Reaction Module Model. */
export type ReactionModuleConfiguration = {
  guid: GlobalReactionModuleReactionID;
  guildId: string;
  channelId: string;
  reaction: string[];
  type: ReactionType;
  exclusion?: {
    user?: string[];
    role?: string[];
  };
};

/** The Global Reaction Module Identifier. */
type GlobalReactionModuleReactionID = `${string}/${string}/${ReactionType}`;

/** Make a Global Reaction Module Identifier. */
export function makeGlobalReactionModuleReactionID(guildId: string, channelId: string, type: ReactionType): GlobalReactionModuleReactionID {
  return `${guildId}/${channelId}/${type}`;
}
