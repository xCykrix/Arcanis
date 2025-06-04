export type PingerSetup = {
  guildId: string;
  serverChannelIds: string[];
  personalChannelIds: string[];
};

export type PingerSetupRoles = {
  guildId: string;
  roleId: string;
  channelLimit: -1 | number;
  keywordLimit: -1 | number;
  pingerLimit: -1 | number;
}

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
