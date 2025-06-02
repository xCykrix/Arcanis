import { ChannelTypes, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { getLang } from '../../../constants/lang.ts';
import { GroupBuilder } from '../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { KVC } from '../../../lib/kvc/kvc.ts';
import { stringify } from '../../../lib/util/helper/stringify.ts';
import { Optic } from '../../../lib/util/optic.ts';
import type { DevDefinition } from '../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    KVC;

    GroupBuilder.builder<
      DevDefinition['eval'],
      DevDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'dev',
          componentTopLevel: 'component.dev',
          guidTopLevel: 'dev.eval',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.GuildForum, ChannelTypes.GuildMedia, ChannelTypes.DM],
          requireGuild: false,
          requireDeveloper: true,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: [],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args.eval === undefined,
            pick: args.eval ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return;

          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'eval.consume-modal',
              timeToLive: 300,
              userId: interaction.user.id,
              constants: [
                `${args.depth ?? 2}`,
              ],
            }),
            title: 'Evaluation Form',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.TextInput,
                    customId: 'typescript',
                    label: 'TypeScript',
                    style: TextStyles.Paragraph,
                    minLength: 1,
                    maxLength: 4000,
                    required: true,
                  },
                ],
              },
            ],
          });
        },
      }).createGroupComponentHandler({
        ref: 'eval.consume-modal',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          // Get Component Data
          const components = assistant.parseModal<{
            typescript: string;
          }>(interaction.data!.components as MessageComponent[]);

          let result = getLang('dev', 'eval', 'default');
          try {
            // deno-lint-ignore no-eval
            result = await eval(`(async () => { ${components.typescript!} })();`);
          } catch (e) {
            Optic.incident({
              moduleId: 'eval.consume-modal',
              message: 'Failed to Evaludate',
              err: e as Error,
            });
            // TODO!: Error Capture
          }

          let cleaned = await stringify(result, parseInt(constants[0]!));
          if (cleaned === 'undefined') cleaned = getLang('dev', 'eval', 'undefined')!;
          await interaction.respond({
            content: ['```', `${cleaned}`, '```'].join('\n'),
          });
        },
      });
  }
}
