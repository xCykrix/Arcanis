type ConsumerKeys =
  | 'global.addReactionToMessage'
  | 'global.scheduleDeleteMessage'
  | 'global.dispatchAlertMessage';

export type Consumer = {
  queueTaskConsume: ConsumerKeys;
  parameter: Map<string, string>;
  _failedConsumeAttempts?: number;
};
