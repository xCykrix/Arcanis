import { ButtonStyles, ChannelTypes, type InputTextComponent, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['add-template'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.template-add',
          guidTopLevel: 'message.template-pin',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args.pin?.['add-template'] === undefined,
            pick: args.pin?.['add-template'] ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return; // Assertion

          // Fetch Database
          const input: InputTextComponent = {
            type: MessageComponentTypes.InputText,
            customId: 'text',
            label: 'Message Text',
            style: TextStyles.Paragraph,
            minLength: 1,
            maxLength: 2000,
            placeholder: 'Enter the message in this field with Markdown.',
            required: true,
          };

          // Respond Modal
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'consumeModal',
              timeToLive: 900,
              userId: interaction.user.id,
              constants: [
                args.name,
              ],
            }),
            title: 'Pinned Message Template Editor',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  input,
                ],
              },
            ],
          });
          return;
        },
      }).createGroupComponentHandler({
        ref: 'consumeModal',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          // Get Component
          const component = assistant.parseModal<{
            text: string;
          }>(interaction.data!.components as MessageComponent[]);

          // Trim and Validate
          if (component.text === undefined || (component.text?.length ?? 0) === 0 || (component.text ?? '').trim() === '') {
            await interaction[constants[1] === 'editing' ? 'edit' : 'respond']({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'pin', 'invalid.message')!),
            });
            return;
          }

          await interaction[constants[1] === 'editing' ? 'edit' : 'respond']({
            content: component.text,
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: await assistant.makeComponentCallback({
                      ref: 'modalConfirm',
                      timeToLive: 300,
                      userId: interaction.user.id.toString(),
                      constants: [
                        constants[0],
                        component.text,
                      ],
                    }),
                    style: ButtonStyles.Primary,
                    label: 'Save',
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: await assistant.makeComponentCallback({
                      ref: 'modalEdit',
                      timeToLive: 300,
                      userId: interaction.user.id.toString(),
                      constants: [
                        constants[0],
                        component.text,
                      ],
                    }),
                    style: ButtonStyles.Secondary,
                    label: 'Edit',
                  },
                ],
              },
            ],
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'modalConfirm',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: interaction.guildId!.toString(),
            constants: [
              constants[0],
            ],
          });
          await KVC.appd.pinTemplate.upsertByPrimaryIndex({
            index: ['guid', guid],
            update: {
              message: constants[1],
            },
            set: {
              guid,
              guildId: interaction.guildId!.toString(),
              name: constants[0],
              message: constants[1],
            },
          });

          await interaction.edit({
            content: '',
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'pin.add-template', 'result')),
            components: [],
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'modalEdit',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'consumeModal',
              timeToLive: 900,
              userId: interaction.user.id,
              constants: [
                constants[0],
                'editing',
              ],
            }),
            title: 'Pinned Message Editor',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.InputText,
                    customId: 'text',
                    label: 'Message Text',
                    style: TextStyles.Paragraph,
                    minLength: 1,
                    maxLength: 2000,
                    value: constants[1],
                    required: true,
                  },
                ],
              },
            ],
          });
          return;
        },
      });
  }
}
