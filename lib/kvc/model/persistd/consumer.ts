type ConsumerKeys =
  | 'global.addReactionToMessage'
  | 'global.scheduleDeleteMessage'
  | 'dev.alert.immediateMessage';

export type Consumer = {
  queueTaskConsume: ConsumerKeys;
  parameter: Map<string, string>;
  _failedConsumeAttempts?: number;
};
