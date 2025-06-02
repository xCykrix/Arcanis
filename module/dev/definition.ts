import { ApplicationCommandOptionTypes, type CreateSlashApplicationCommand } from '@discordeno';
import type { CommandOptions } from '../../lib/builder/group.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

const definition = {
  name: 'dev',
  description: 'Configuration and Devleopment Module.',
  options: [
    {
      name: 'alert',
      description: 'Set the channel used to receive global messages or alerts.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'channel',
          description: 'The channel to recieve messages or alerts.',
          type: ApplicationCommandOptionTypes.Channel,
          required: true,
        },
      ],
    },
    {
      name: 'send-alert',
      description: 'Sends an alert to all tenants. Developer Only.',
      type: ApplicationCommandOptionTypes.SubCommand,
    },
    {
      name: 'eval',
      description: 'Evaluate Arbitrary Code at Runtime. Developer Only.',
      type: ApplicationCommandOptionTypes.SubCommand,
      options: [
        {
          name: 'depth',
          description: 'The inspection depth of objects.',
          type: ApplicationCommandOptionTypes.Integer,
          minValue: 1,
          maxValue: 10,
          required: false,
        },
      ],
    },
  ],
} as const satisfies CreateSlashApplicationCommand;
export type DevDefinition = CommandOptions<typeof definition.options>;

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.globalChatInputInteraction.add(definition);
  }
}
