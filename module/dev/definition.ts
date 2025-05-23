import { ApplicationCommandOptionTypes, CreateSlashApplicationCommand } from '@discordeno';
import { CommandOptions } from '../../lib/builder/group.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

const definition = {
  name: 'dev',
  description: 'Developer Operations Module.',
  options: [
    {
      name: 'eval',
      description: 'Evaluate Arbitrary Code at Runtime. Uses a Modal. Secure.',
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
      ] as const,
    },
  ] as const,
} satisfies CreateSlashApplicationCommand;
export type DevDefinition = CommandOptions<typeof definition.options>;

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.globalChatInputInteraction.add(definition);
  }
}
