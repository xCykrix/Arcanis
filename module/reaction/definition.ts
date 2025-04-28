import { ApplicationCommandOptionTypes, ChannelTypes } from '@discordeno';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

export class Definition extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.interaction.add({
      name: 'reaction',
      description: 'Reaction Management Module',
      options: [
        {
          name: 'auto',
          description: 'Auto Reaction Module Management',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'set',
              description: 'Set auto reactions for a channel for the specified type.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'The channel to apply this auto reaction.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'reactions',
                  description: 'Please use Discord Emoji Picker. Please ensure a space is between each reaction.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                },
                {
                  name: 'type',
                  description: 'The type filters to apply to this auto reaction.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                  choices: [
                    {
                      name: 'All Messages',
                      value: 'all',
                    },
                    {
                      name: 'Messages with Embed',
                      value: 'embed-only',
                    },
                    {
                      name: 'Messages with Attachments',
                      value: 'media-only',
                    },
                    {
                      name: 'Messages with URL',
                      value: 'url-only',
                    },
                    {
                      name: 'Messages with Text',
                      value: 'text-only',
                    },
                  ],
                },
              ],
            },
            {
              name: 'remove',
              description: 'Remove auto reactions from a channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'The channel to apply this auto reaction.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'type',
                  description: 'The type filters to apply to this auto reaction.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                  choices: [
                    {
                      name: 'All Messages',
                      value: 'all',
                    },
                    {
                      name: 'Messages with Embed',
                      value: 'embed-only',
                    },
                    {
                      name: 'Messages with Attachments',
                      value: 'media-only',
                    },
                    {
                      name: 'Messages with URL',
                      value: 'url-only',
                    },
                    {
                      name: 'Messages with Text',
                      value: 'text-only',
                    },
                  ],
                },
              ],
            },
            {
              name: 'exclude',
              description: 'Set the excluded users and roles for a channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'The channel to specify this action for.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'type',
                  description: 'The type filters to apply to this auto reaction.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                  choices: [
                    {
                      name: 'All Messages',
                      value: 'all',
                    },
                    {
                      name: 'Messages with Embed',
                      value: 'embed-only',
                    },
                    {
                      name: 'Messages with Attachments',
                      value: 'media-only',
                    },
                    {
                      name: 'Messages with URL',
                      value: 'url-only',
                    },
                    {
                      name: 'Messages with Text',
                      value: 'text-only',
                    },
                  ],
                },
              ],
            },
            {
              name: 'list',
              description: 'List the configured auto reactions.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'A channel to search.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'forward',
          description: 'Reaction Forward Module Management',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'add',
              description: 'Add auto forwarding for a channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'from',
                  description: 'The channel to monitor for reactions.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'to',
                  description: 'The channel to send messages to.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'reaction',
                  description: 'Please use Discord Emoji Picker. Select one reaction.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                },
                {
                  name: 'threshold',
                  description: 'The threshold of Reactions to trigger the Forwarder.',
                  type: ApplicationCommandOptionTypes.Integer,
                  required: true,
                  minValue: 1,
                  maxValue: 100000,
                },
                {
                  name: 'within',
                  description: 'The maximum age of the message to be elible to forward, in seconds. Defaults to no limit.',
                  type: ApplicationCommandOptionTypes.Integer,
                  required: true,
                  minValue: 1,
                  maxValue: 604800,
                },
                {
                  name: 'alert',
                  description: 'The alert message to send with the forwarded message. Useful for mentions or context details.',
                  type: ApplicationCommandOptionTypes.String,
                  required: false,
                  minValue: 1,
                  maxValue: 1000,
                },
              ],
            },
            {
              name: 'remove',
              description: 'Remove a Forwarder from a Channel',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'from',
                  description: 'The channel to specify this action for.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'reaction',
                  description: 'The Emoji to remove from the Forwarder. Use the Discord Emoji Picker. Pick 1 at a time.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                },
              ],
            },
            {
              name: 'list',
              description: 'List the configured auto forwarders.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'A channel to search. Supports to and from forwarding.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    });
  }
}
