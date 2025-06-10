export type PingerSetup = {
  guildId: string;
  alertMessage: string;
  alertCooldownByProduct: number;
  deleteAlertAfter: number;
  personalChannelIds: Set<string>;
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
  rolesToAlert: Set<string>;
  keywords: string;
};

export type ServerPersonalPingerRoleMap = {
  roleId: string;
  guidOfPinger: string;
};

export type PersonalPinger = {
  guid: string;
  guildId: string;
  userId: string;
  name: string;
  keywords: string;
};
