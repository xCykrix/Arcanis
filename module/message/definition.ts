import { ApplicationCommandOptionTypes, ChannelTypes, type CreateSlashApplicationCommand } from '@discordeno';
import type { CommandOptions } from '../../lib/builder/group.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

const definition = {
  name: 'message',
  description: 'Message Utilities Module',
  options: [
    {
      name: 'forward',
      description: 'Manage forwarders with the message module.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'add',
          description: 'Create a forwarder for the specified channels.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'from',
              description: 'The source channel to forward based on reactions.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
            {
              name: 'to',
              description: 'The channel to receive forwarded messages.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
            {
              name: 'reaction',
              description: 'The reaction to forward based on.',
              type: ApplicationCommandOptionTypes.String,
              minValue: 1,
              maxValue: 64,
              required: true,
            },
            {
              name: 'threshold',
              description: 'The amount of reactions required to forward, excluding of the initial reaction of the bot.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 1,
              maxValue: 65535,
              required: true,
            },
            {
              name: 'within',
              description: 'The amount of time, in seconds, before a message can no longer be forwarded.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 5,
              maxValue: 1800,
              required: true,
            },
            {
              name: 'alert',
              description: 'The message to send as an alert to the channel with the forwarded message.',
              type: ApplicationCommandOptionTypes.String,
              minValue: 1,
              maxValue: 1250,
            },
          ],
        },
        {
          name: 'delete',
          description: 'Delete the specified forwarder based on the from channel and reaction.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'from',
              description: 'The channel being forwarded from.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
            {
              name: 'reaction',
              description: 'The forwarder reaction to remove.',
              type: ApplicationCommandOptionTypes.String,
              minValue: 1,
              maxValue: 64,
              required: true,
            },
          ],
        },
        {
          name: 'list',
          description: 'Lists the configured forwarders to or from a specified channel.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel being forwarded to or from.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'pin',
      description: 'Manage following pinned message with the message module.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'set',
          description: 'Set the pinned message in a channel.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to set the pinned message.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
            {
              name: 'every',
              description: 'The number of sent messages before immediately sending the pinned message.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 3,
              maxValue: 256,
              required: true,
            },
            {
              name: 'within',
              description: 'The time, in seconds, before sending the pinned message again if at least one message was sent.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 15,
              maxValue: 86400,
              required: true,
              autocomplete: true,
            },
            {
              name: 'template',
              description: 'If provided, set a saved template message instead of using the message builder modal.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: false,
              autocomplete: true,
            },
          ],
        },
        {
          name: 'delete',
          description: 'Delete the pinned message in a channel.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to delete the pinned message.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ],
        },
        {
          name: 'list',
          description: 'Lists the configured pinned messages.',
          type: ApplicationCommandOptionTypes.SubCommand,
        },
      ],
    },
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
          ],
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
          ],
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
          ],
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
          ],
        },
      ],
    },
  ],
} as const satisfies CreateSlashApplicationCommand;
export type MessageDefinition = CommandOptions<typeof definition.options>;

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.guildChatInputInteraction.add(definition);
  }
}
