import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from '@discordeno';
import type { ChatInputArgs, ChatInputCommandJSON, DynamicInjectedHandler, HandlerOptions, HandlerPassthrough } from '../../../generic/leafs.ts';

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

/** */
export const options: HandlerOptions = {};

/** */
const handler: DynamicInjectedHandler<typeof schema> = {
  callback: async ({ interaction, args }: HandlerPassthrough<typeof schema>): Promise<void> => {
    await interaction.respond({ content: 'pong!' });
  },
};

export default {
  schema,
  options,
  handler,
};
