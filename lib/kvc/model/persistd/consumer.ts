export type Consumer = {
  queueTaskConsume: string;
  parameter: Map<string, string>;
  _failedConsumeAttempts?: number;
};
