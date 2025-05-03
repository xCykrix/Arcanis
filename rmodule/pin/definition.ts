import { ApplicationCommandOptionTypes, ChannelTypes } from '@discordeno';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

export class Definition extends AsyncInitializable {
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
                  name: 'minutes',
                  description: 'How often the message will move to the bottom regardless of messages sent.',
                  type: ApplicationCommandOptionTypes.Number,
                  required: false,
                  minValue: 5,
                  maxValue: 1440,
                },
                {
                  name: 'messages',
                  description: 'How many messages may be sent before the message will move to the bottom regardless of time.',
                  type: ApplicationCommandOptionTypes.Number,
                  required: false,
                  minValue: 3,
                  maxValue: 255,
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
