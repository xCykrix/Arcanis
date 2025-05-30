import { ButtonStyles, ChannelTypes, InputTextComponent, MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../../mod.ts';
import { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
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
                args.
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
                .setDescription(getLang('pin.set', 'text.invalid')!),
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
                        'editing',
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

          const channel = await Bootstrap.bot.cache.channels.get(BigInt(constants[1]));
          await KVC.appd.pin.upsertByPrimaryIndex({
            index: ['channelId', channel!.id.toString()],
            update: {},
            set: {
              guid: GUID.make({
                moduleId: assistant['assurance'].guidTopLevel!,
                guildId: channel!.guildId!.toString(),
                channelId: channel!.id.toString(),
              }),
              guildId: channel!.guildId!.toString(),
              channelId: channel!.id.toString(),
              message: interaction.message!.content!,
              every: parseInt(constants[2]),
              within: parseInt(constants[3]),
            },
          });

          await interaction.edit({
            content: '',
            embeds: Responses.success.make()
              .setDescription(getLang('pin.set', 'result')!)
              .addField('Channel', `<#${constants[1]}>`),
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
                    value: constants[0],
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
