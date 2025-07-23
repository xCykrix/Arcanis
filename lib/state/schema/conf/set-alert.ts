import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ChannelTypes } from '@discordeno';
import type { ChatInputArgs, ChatInputCommandJSON, DynamicInjectedHandler, HandlerOptions, HandlerPassthrough } from '../../../generic/leafs.ts';

/** */
export const schema = {
  name: 'conf',
  description: 'Update guild or system configuration options.',
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: 'set-alert',
      description: 'Set the channel used to receive developer alerts.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'channel',
          description: 'The channel to recieve messages or alerts.',
          type: ApplicationCommandOptionTypes.Channel,
          channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          required: true,
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
