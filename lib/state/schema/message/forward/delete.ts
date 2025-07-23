import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ChannelTypes } from '@discordeno';
import type { ChatInputArgs, ChatInputCommandJSON, DynamicInjectedHandler, HandlerOptions, HandlerPassthrough } from '../../../../generic/leafs.ts';

export const schema = {
  name: 'message',
  description: 'Update guild or system configuration options.',
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: 'forward',
      description: 'Manage message forwarding from one channel to another.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'delete',
          description: 'abc',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'destination',
              description: 'The channel to forward messages to.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ],
        },
      ],
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
