import { ApplicationCommandOptionTypes, ChannelTypes } from '@discordeno';
import type { ReactionType } from '../../lib/database/model/reaction.model.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.guildChatInputInteraction.add({
      name: 'message',
      description: 'Message-based Management Module.',
      defaultMemberPermissions: [
        'MANAGE_MESSAGES',
      ],
      options: [
        {
          name: 'reaction',
          description: 'Auto Reaction Module Management.',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'set',
              description: 'Set a Auto Reactions in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'Target Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'reactions',
                  description: 'List of Reactions from the Discord Emoji Picker.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                },
                {
                  name: 'self',
                  description: 'If I should react to Myself.',
                  type: ApplicationCommandOptionTypes.Boolean,
                  required: true,
                },
                {
                  name: 'type',
                  description: 'The Target Message Type.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                  choices: [
                    {
                      name: 'All Messages (Exclusive)',
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
              name: 'delete',
              description: 'Delete a Auto Reaction from a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'Target Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'type',
                  description: 'The Target Message Type.',
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
              description: 'Exclude User or Roles from Auto Reaction in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'Target Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'type',
                  description: 'The Target Message Type.',
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
              description: 'Get a List of Auto Reactions in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'Target Channel to Search.',
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
          description: 'Reaction Forward Module Management.',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'add',
              description: 'Add a Reaction Forwarder in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'from',
                  description: 'Source Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'to',
                  description: 'Target Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'reaction',
                  description: 'A Reactions from the Discord Emoji Picker.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                },
                {
                  name: 'threshold',
                  description: 'Amount of Reactions required, excluding the Bot, to Forward the Message.',
                  type: ApplicationCommandOptionTypes.Integer,
                  required: true,
                  minValue: 1,
                  maxValue: 100000,
                },
                {
                  name: 'within',
                  description: 'The time, in seconds, to accept Reactions to Forward the Message.',
                  type: ApplicationCommandOptionTypes.Integer,
                  required: true,
                  minValue: 1,
                  maxValue: 604800,
                },
                {
                  name: 'alert',
                  description: 'The alert to include with the Forwarded Message.',
                  type: ApplicationCommandOptionTypes.String,
                  required: false,
                  minValue: 1,
                  maxValue: 1000,
                },
              ],
            },
            {
              name: 'delete',
              description: 'Delete a Reaction Forwarder in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'from',
                  description: 'Source Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'reaction',
                  description: 'A Reactions from the Discord Emoji Picker.',
                  type: ApplicationCommandOptionTypes.String,
                  required: true,
                },
              ],
            },
            {
              name: 'list',
              description: 'Get a List of Auto Forwarders to/from a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'A channel to search. Supports to and from forwarding.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'pin',
          description: 'Pin Module Management.',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'set',
              description: 'Set a Pinned (Sticky) Message in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'Target Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'every',
                  description: 'The number of sent messages before immediately re-sending the Pinned Message.',
                  type: ApplicationCommandOptionTypes.Integer,
                  minValue: 3,
                  maxValue: 15,
                  required: true,
                },
                {
                  name: 'within',
                  description: 'The time, in seconds, before re-sending the Pinned Message if at least one message has been sent.',
                  type: ApplicationCommandOptionTypes.Integer,
                  minValue: 15,
                  maxValue: 1800,
                  required: true,
                },
              ],
            },
            {
              name: 'delete',
              description: 'Delete a Pinned (Sticky) Message in a Channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'Target Channel.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

export type MessageReactionSet = {
  reaction?: {
    set?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      reactions: string;
      type: ReactionType;
      self: boolean;
    };
  };
};

export type MessageReactionDelete = {
  reaction?: {
    delete?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      type: ReactionType;
    };
  };
};

export type MessageReactionExclude = {
  reaction?: {
    exclude?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      type: ReactionType;
    };
  };
};

export type MessageReactionList = {
  reaction?: {
    list?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      request?: 'reactions' | 'exclude' | 'both';
      page?: number;
    };
  };
};

export type MessageForwardSet = {
  forward?: {
    add?: {
      from: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      to: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      reaction: string;
      threshold: number;
      within: number;
      alert?: string;
    };
  };
};

export type MessageForwardDelete = {
  forward?: {
    delete?: {
      from: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      reaction: string;
    };
  };
};

export type MessageForwardList = {
  forward?: {
    list?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      page?: number;
    };
  };
};

export type MessagePinSet = {
  pin?: {
    set?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      every: number;
      within: number;
    };
  };
};

export type MessagePinDelete = {
  pin?: {
    delete?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
    };
  };
};
