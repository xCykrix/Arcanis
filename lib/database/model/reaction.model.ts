/** The Reaction Module Model. */
export type ReactionModuleConfiguration = {
  guild: string;
  channel: string;
  reaction: string[];
  type: 'all' | 'embed-only' | 'media-only' | 'url-only' | 'text-only';
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
