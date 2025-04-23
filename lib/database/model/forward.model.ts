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
