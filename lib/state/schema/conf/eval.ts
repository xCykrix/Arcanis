import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ChannelTypes } from '@discordeno';
import type { ChatInputArgs, ChatInputCommandJSON, HandlerOptions, HandlerPassthrough } from '../../../generic/leafs.ts';

/** */
export const schema = {
  name: 'conf',
  description: 'Update guild or system configuration options.',
  type: ApplicationCommandTypes.ChatInput,
  options: [
    {
      name: 'eval',
      description: 'Execute TS/JS code at runtime.  This is restricted to the developers.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'code',
          description: 'The code to execute.',
          type: ApplicationCommandOptionTypes.String,
          required: true,
        },
      ],
    },
  ],
} as const satisfies ChatInputCommandJSON;
export type SchemaConf = ChatInputArgs<typeof schema>;

/** */
export const options: HandlerOptions = {
  guildRequired: false,
  developerRequired: true,
  callbackAuthorMatchRequired: true,
  channelTypesRequired: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.DM],
  botRequiredGuildPermissions: [],
  botRequiredChannelPermissions: [],
  userRequiredGuildPermissions: [],
  userRequiredChannelPermissions: [],
};

/** */
async function handler({ interaction, args }: HandlerPassthrough<typeof schema>): Promise<void> {
  // console.info(args?.eval?.code);
}

export default {
  schema,
  options,
  handler,
};
