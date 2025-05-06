/** The Reaction Module Model. */
export type ReactionModuleConfiguration = {
  guid: string;
  guildId: string;
  channelId: string;
  reaction: string[];
  type: ReactionType;
  exclusion?: {
    user?: string[];
    role?: string[];
  };
  self?: boolean;
};

/** The Reaction Type Indicator. */
export type ReactionType = 'all' | 'embed-only' | 'media-only' | 'url-only' | 'text-only';
