export type PingerSetup = {
  guildId: string;
  allowedChannelIds: string[];
  roleRestrictions: {
    roleId: string;
    maxChannels: -1 | number;
    maxKeywords: -1 | number;
    maxPingers: -1 | number;
  }[];
};

export type ServerPingerConfiguration = {
  guildId: string;
  channelIds: string[];
  keywords: string;
};

export type PersonalPingerConfiguration = {
  guildId: string;
  userId: string;
  channelIds: string[];
  keywords: string;
};
