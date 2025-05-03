import { ButtonStyles, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalPinModuleConfigurationId } from '../../../lib/database/model/pin.model.ts';
import { AsyncCommandGroup } from '../../../lib/generic/groupHandler.ts';
import { ComponentHandler } from '../../../lib/util/builder/components.ts';
import { hasGuildPermissions } from '../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../mod.ts';

export class StickyCommandGroup extends AsyncCommandGroup {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const saveChangesOnPreview = ComponentHandler.builder({
      moduleId: '49cc579f',
      allowApplicationUser: false,
      allowBotUser: false,
      requireAuthor: true,
      within: 300,
    })
      .handle(async (interaction, self) => {
        await interaction.deferEdit();

        const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;
        const channel = await Bootstrap.bot.cache.channels.get(BigInt(constants[1]));
        if (channel?.id.toString() !== constants[1]) {
          return;
        }

        // Write Database
        const guid = makeGlobalPinModuleConfigurationId(constants[0]!, constants[1]!);
        await DatabaseConnector.appd.pin.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            message: interaction.message!.embeds![0].description!,
          },
          set: {
            guid,
            guildId: constants[0]!,
            channelId: constants[1]!,
            message: interaction.message!.embeds![0].description!,
            minutes: parseInt(constants[2]!),
            messages: parseInt(constants[3]!),
          },
        });

        // Respond to Preview Save Button
        await interaction.edit({
          embeds: Responses.success.make()
            .setDescription('Applied the Sticky Message to the target channel.')
            .addField('Channel', `<#${constants[1]}>`),
          components: [],
        });
      });
    saveChangesOnPreview.build();

    const returnToModal = ComponentHandler.builder({
      moduleId: '4fcb3531',
      allowApplicationUser: false,
      allowBotUser: false,
      requireAuthor: true,
      within: 300,
    })
      .handle(async (interaction, self) => {
        const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

        // Respond with Modal.
        const value = constants.pop();
        await interaction.respond({
          customId: await previewFromModal.makeId({
            userId: interaction.user.id.toString(),
            constants,
          }),
          title: 'Set Sticky Message',
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.InputText,
                  customId: 'text',
                  label: 'Message Content',
                  style: TextStyles.Paragraph,
                  value,
                  minLength: 1,
                  maxLength: 2000,
                  placeholder: 'Type your message you want pinned here! Supports Markdown.',
                  required: true,
                },
              ],
            },
          ],
        }, {
          isPrivate: true,
        });
      });
    returnToModal.build();

    const previewFromModal = ComponentHandler.builder({
      moduleId: 'f74070fd',
      allowApplicationUser: false,
      allowBotUser: false,
      requireAuthor: true,
      within: 1800,
    })
      .handle(async (interaction, self) => {
        const components = ComponentHandler.parseModal<{
          text: string;
        }>(interaction.data?.components as MessageComponent[]);
        const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

        // Trim and Validate
        if ((components.text?.length ?? 0) === 0 || (components.text ?? '').trim() === '') {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unable to validate Text Input. It must not be empty.'),
          }, {
            isPrivate: true,
          });
          return;
        }

        // Respond with Preview
        await interaction.respond({
          embeds: Responses.success.make()
            .setTitle('Preview of Sticky Message')
            .setDescription(`${components.text!}`),
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.Button,
                  customId: await saveChangesOnPreview.makeId({
                    userId: interaction.user.id.toString(),
                    constants,
                  }),
                  style: ButtonStyles.Primary,
                  label: 'Save to Channel',
                },
                {
                  type: MessageComponentTypes.Button,
                  customId: await returnToModal.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      ...constants,
                      components.text!,
                    ],
                  }),
                  style: ButtonStyles.Secondary,
                  label: 'Return to Editor',
                },
              ],
            },
          ],
        }, {
          isPrivate: true,
        });
      });
    previewFromModal.build();

    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!this.expect('pin', interaction)) return;
      const args = this.parse<{
        sticky?: {
          set?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            minutes?: number;
            messages?: number;
          };
          remove?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
          };
        };
      }>(interaction);
      if (args.sticky === undefined) return;

      if (args.sticky.set) {
        // Unsupported Channel
        if (interaction.channel.guildId === undefined) {
          await interaction.respond({
            embeds: Responses.error.makeUnsupportedChannel('Guild Channels'),
          });
          return;
        }

        // Check Permissions (All Subcommands)
        if (interaction.member?.id !== 100737000973275136n) {
          const guild = await Bootstrap.bot.cache.guilds.get(interaction.guildId!);
          if (!hasGuildPermissions(guild!, interaction.member!, ['MANAGE_MESSAGES'])) {
            await interaction.respond({
              embeds: Responses.error.makePermissionDenied('MANAGE_MESSAGES'),
            });
            return;
          }
        }

        // Respond with Modal.
        await interaction.respond({
          customId: await previewFromModal.makeId({
            userId: interaction.user.id.toString(),
            constants: [
              args.sticky.set.channel.guildId!.toString(),
              args.sticky.set.channel.id.toString(),
              (args.sticky.set.minutes ?? 5).toString(),
              (args.sticky.set.messages ?? 5).toString(),
            ],
          }),
          title: 'Set Sticky Message',
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.InputText,
                  customId: 'text',
                  label: 'Message Content',
                  style: TextStyles.Paragraph,
                  minLength: 1,
                  maxLength: 2000,
                  placeholder: 'Type your message you want pinned here! Supports Markdown.',
                  required: true,
                },
              ],
            },
          ],
        }, {
          isPrivate: true,
        });
      }
    });
  }
}
