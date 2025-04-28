/** The Pin Model Module. */
export type PinModuleConfiguration = {
  guid: GlobalPinModuleConfigurationID;
  guildId: string;
  channelId: string;
  message: string;
};

/** The Global Pin Module Identifier. */
type GlobalPinModuleConfigurationID = `${string}/${string}`;

/** Make a Global Reaction Module Identifier. */
export function makeGlobalPinModuleConfigurationId(guildId: string, channelId: string): GlobalPinModuleConfigurationID {
  return `${guildId}/${channelId}`;
}
