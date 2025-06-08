/** The Reaction Forwarder Module Model. */
export type ReactionModuleForwardConfiguration = {
  guid: string;
  guildId: string;
  fromChannelId: string;
  toChannelId: string;
  reaction: string;
  threshold: number;
  within: number;
  allowListRoles?: Set<string>;
  alert?: string;
};
