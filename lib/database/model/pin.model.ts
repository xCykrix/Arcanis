/** The Pin Model Module. */
export type PinModuleConfiguration = {
  // Options
  guid: string;
  guildId: string;
  channelId: string;
  message: string;
  every?: number;
  within?: number;
  // Stateful Controls
  lastMessageId?: string;
  lastMessageAt?: number;
};
