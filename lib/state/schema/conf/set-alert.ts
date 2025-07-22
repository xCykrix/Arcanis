import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ChannelTypes } from '@discordeno';
import type { ChatInputArgs, ChatInputCommandJSON } from '../../../generic/leafs.ts';

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

async function handler(_passthrough: {
  args: SchemaConf;
}): Promise<void> {
}

export default {
  schema,
  handler,
};
