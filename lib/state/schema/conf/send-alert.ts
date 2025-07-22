import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from '@discordeno';
import type { ChatInputArgs, ChatInputCommandJSON } from '../../../generic/leafs.ts';

export const schema = {
  name: 'conf',
  description: 'Update guild or system configuration options.',
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: 'send-alert',
      description: 'Sends an alert to all tenants with an alerting channel. This is restricted to the developers.',
      type: ApplicationCommandOptionTypes.SubCommand,
    },
  ],
} as const satisfies ChatInputCommandJSON;
export type SchemaConf = ChatInputArgs<typeof schema>;

async function handler(_passthrough: {
  args: SchemaConf;
}): Promise<void> {
}

export default {
  schema,
  handler,
};
