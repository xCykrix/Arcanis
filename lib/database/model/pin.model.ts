/** The Pin Model Module. */
export type PinModuleConfiguration = {
  // Options
  guid: string;
  guildId: string;
  channelId: string;
  message: string;
  messages?: number;
  minutes?: number;
  // Stateful Controls
  lastMessageId?: string;
};
