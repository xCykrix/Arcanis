import { ApplicationCommandOptionTypes, ChannelTypes } from '@discordeno';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.interaction.add({
      name: 'pin',
      description: 'Pin Management Module',
      options: [
        {
          name: 'sticky',
          description: 'Sticky Pin Module Management',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'set',
              description: 'Set the Sticky Pin for the specified channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'The channel to set a Sticky Pin for.',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildAnnouncement],
                  required: true,
                },
                {
                  name: 'every',
                  description: 'The number of messages before sending the Sticky Pinned Message.',
                  type: ApplicationCommandOptionTypes.Integer,
                  minValue: 3,
                  maxValue: 15,
                  required: true,
                },
                {
                  name: 'within',
                  description: 'The amount of time, in seconds, before sending the Sticky Pinned Message if a new message was sent.',
                  type: ApplicationCommandOptionTypes.Integer,
                  minValue: 15,
                  maxValue: 1800,
                  required: true,
                },
              ],
            },
            {
              name: 'remove',
              description: 'Set the Sticky Pin for the specified channel.',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'The channel to remove a Sticky Pin from.',
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

export type PinStickySet = {
  sticky?: {
    set?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      every: number;
      within: number;
    };
  };
};

export type PinStickyRemove = {
  sticky?: {
    remove?: {
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
    };
  };
};
