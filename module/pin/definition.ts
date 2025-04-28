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
                  name: 'mode',
                  description: 'The mode to apply to the Sticky Pin.',
                  type: ApplicationCommandOptionTypes.String,
                  required: false,
                  choices: [
                    {
                      name: 'Within 5 Messages or 15-30 Minutes (Slow)',
                      value: 'slow',
                    },
                    {
                      name: 'Within 3 Messages or 5-10 Minutes (Fast)',
                      value: 'fast',
                    },
                  ],
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
