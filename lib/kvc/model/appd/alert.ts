/** The Alert Configuration for Dev Module Modal. */
export type AlertConfiguration = {
  guildId: string;
  toChannelId: string;
};

export type DispatchedAlert = {
  dispatchEventId: string;
  message: string;
};

export type ConsumedDispatchAlert = {
  guildId: string;
  dispatchEventId: string;
};
