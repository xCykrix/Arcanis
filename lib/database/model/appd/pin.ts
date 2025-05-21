/** The Pin Model Module. */
export type PinModuleConfiguration = {
  guid: string;
  guildId: string;
  channelId: string;
  message: string;
  every?: number;
  within?: number;

  lastMessageId?: string;
  lastMessageAt?: number;
};

export type PinModuleTemplate = {
  guid: string;
  guildId: string;
  message: string;
};
