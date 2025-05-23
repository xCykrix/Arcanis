/** The Reaction Module Model. */
export type ReactionModuleConfiguration = {
  guid: string;
  guildId: string;
  channelId: string;

  reaction: string[];
  type: ReactionType;

  self?: boolean;
};

/** The Reaction Module Model. */
export type ReactionModuleExclusionConfiguration = {
  guildId: string;
  channelId: string;

  exclusion: {
    user: string[];
    role: string[];
  };
};

/** The Reaction Type Indicator. */
export type ReactionType = 'a' | 'e' | 'm' | 'u' | 't';
