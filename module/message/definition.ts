import { ApplicationCommandOptionTypes, ChannelTypes, type CreateSlashApplicationCommand } from '@discordeno';
import type { CommandOptions } from '../../lib/builder/group.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

const definition = {
  name: 'message',
  description: 'Message Utilities Module',
  options: [
    {
      name: 'reaction',
      description: 'Manage reactions with the message module.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'set',
          description: 'Update the specified reaction type for the channel.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to apply auto reactions.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
            {
              name: 'type',
              description: 'The message type to react to.',
              type: ApplicationCommandOptionTypes.String,
              choices: [
                { name: 'All Messages (Exclusive)', value: 'a' },
                { name: 'Embed Only (Priority 4)', value: 'e' },
                { name: 'Media Only (Priority 3)', value: 'm' },
                { name: 'URL Only (Priority 2)', value: 'u' },
                { name: 'Text Only (Priority 1)', value: 't' },
              ],
              required: true,
            },
            {
              name: 'reactions',
              description: 'The list of reactions.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 255,
              required: true,
            },
            {
              name: 'self',
              description: 'Should I react to myself?',
              type: ApplicationCommandOptionTypes.Boolean,
              required: false,
            },
          ] as const,
        },
        {
          name: 'delete',
          description: 'Delete the specified reaction type for the channel.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to apply auto reactions.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
            {
              name: 'type',
              description: 'The message type to react to.',
              type: ApplicationCommandOptionTypes.String,
              choices: [
                { name: 'All Messages (Exclusive)', value: 'a' },
                { name: 'Embed Only (Priority 4)', value: 'e' },
                { name: 'Media Only (Priority 3)', value: 'm' },
                { name: 'URL Only (Priority 2)', value: 'u' },
                { name: 'Text Only (Priority 1)', value: 't' },
              ],
              required: true,
            },
          ] as const,
        },
        {
          name: 'exclude',
          description: 'Exclude specific users or roles from reactions.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to apply auto reactions.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },

          ] as const,
        },
        {
          name: 'list',
          description: 'List the configured auto reactions in a channel.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to apply auto reactions.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ] as const,
        },
      ] as const,
    },
  ] as const,
} satisfies CreateSlashApplicationCommand;
export type MessageDefinition = CommandOptions<typeof definition.options>;

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.guildChatInputInteraction.add(definition);
  }
}
