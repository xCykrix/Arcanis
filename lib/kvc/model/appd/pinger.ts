export type PingerSetup = {
  guildId: string;
  serverChannelIds: string[];
  personalChannelIds: string[];
};

export type PingerSetupRole = {
  guildId: string;
  roleId: string;
  channelLimit: -1 | number;
  keywordLimit: -1 | number;
  pingerLimit: -1 | number;
};

export type PingerChannelMap = {
  channelId: string;
  guidOfPinger: string;
};

export type ServerPinger = {
  guid: string;
  guildId: string;
  name: string;
  keywords: string;
};

export type PersonalPinger = {
  guid: string;
  guildId: string;
  name: string;
  userId: string;
  keywords: string;
};
