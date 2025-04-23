import type { ReactionType } from '../../../module/reaction/share/reactionType.ts';

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

/** The Reaction Forwarder Module Model. */
export type ReactionModuleForwardConfiguration = {
  guid: GlobalReactionModuleForwardID;
  guildId: string;
  fromChannelId: string;
  toChannelId: string;
  reaction: string;
  threshold: number;
  within: number;
  alert?: string;
};

/** The Global Reaction Module Forwarder Identifier. */
type GlobalReactionModuleForwardID = `${string}/${string}/${string}`;

/** Make a Global Reaction Module Forwarder Identifier. */
export function makeGlobalReactionModuleForwardID(guildId: string, fromChannelId: string, reaction: string): GlobalReactionModuleForwardID {
  return `${guildId}/${fromChannelId}/${reaction}` as GlobalReactionModuleForwardID;
}
