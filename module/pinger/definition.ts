import { ApplicationCommandOptionTypes, type CreateSlashApplicationCommand } from '@discordeno';
import type { CommandOptions } from '../../lib/builder/group.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

const definition = {
  name: 'pinger',
  description: 'Manager server and personal pinger configurations.',
  options: [
    {
      name: 'manage',
      description: 'add-channel',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'type',
          description: 'The types of pinger this channel is available to.',
          type: ApplicationCommandOptionTypes.String,
          choices: [
            {
              name: 'Server Only',
              value: 'server',
            },
            {
              name: 'Personal Only',
              value: 'personal',
            },
            {
              name: 'Both Server and Personal',
              value: 'both',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies CreateSlashApplicationCommand;
export type PingerDefinition = CommandOptions<typeof definition.option>;

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    Bootstrap.guildChatInputInteraction.add(definition);
  }
}
