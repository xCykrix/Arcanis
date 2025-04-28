import { ButtonStyles, MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalPinModuleConfigurationId } from '../../../lib/database/model/pin.model.ts';
import { CommandGroupHandler } from '../../../lib/generic/groupHandler.ts';
import { ComponentHandler } from '../../../lib/util/builder/components.ts';
import { Permissions } from '../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../mod.ts';

export class StickyCommandGroup extends CommandGroupHandler {
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!this.expect('pin', interaction)) return;
      const args = this.parse<{
        sticky?: {
          set?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            mode?: 'fast' | 'slow';
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

        // Check Permissions
        if (interaction.member?.id !== 100737000973275136n) {
          if (!Permissions.role.hasPermission(interaction.member?.roles ?? [], 'MANAGE_MESSAGES')) {
            await interaction.respond({
              embeds: Responses.error.makePermissionDenied('MANAGE_MESSAGES'),
            });
            return;
          }
        }

        await interaction.respond({
          customId: ComponentHandler.makeCustomId('sticky-modal', interaction.user.id.toString(), [
            args.sticky.set.channel.guildId!.toString(),
            args.sticky.set.channel.id.toString(),
          ]),
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

    // Handle sticky-modal
    ComponentHandler.builder()
      .expectation({
        header: 'sticky-modal',
        allowApplicationUser: false,
        allowBotUser: false,
        requireAuthor: true,
        within: 1800,
      })
      .handle(async (interaction) => {
        const components = ComponentHandler.parseModal<{
          text: string;
        }>(interaction.data?.components as MessageComponent[]);
        const { packet } = ComponentHandler.unmakeCustomId(interaction.data!.customId!);

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

        // Respond
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
                  customId: ComponentHandler.makeCustomId('sticky-message-preview', interaction.user.id.toString(), [
                    packet[0]!,
                    packet[1]!,
                  ]),
                  style: ButtonStyles.Primary,
                  label: 'Save to Channel',
                },
              ],
            },
          ],
        }, {
          isPrivate: true,
        });
      })
      .build();

    // Handle sticky-message-preview
    ComponentHandler.builder()
      .expectation({
        header: 'sticky-message-preview',
        allowApplicationUser: false,
        allowBotUser: false,
        requireAuthor: true,
        within: 300,
      })
      .handle(async (interaction) => {
        await interaction.deferEdit();

        const { packet } = ComponentHandler.unmakeCustomId(interaction.data!.customId!);
        const channel = await Bootstrap.bot.cache.channels.get(BigInt(packet[1]));
        if (channel?.id.toString() !== packet[1]) {
          // Error!
          return;
        }

        const guid = makeGlobalPinModuleConfigurationId(packet[0]!, packet[1]!);
        await DatabaseConnector.appd.pinModuleConfiguration.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            message: interaction.message!.embeds![0].description!,
          },
          set: {
            guid,
            guildId: packet[0]!,
            channelId: packet[1]!,
            message: interaction.message!.embeds![0].description!,
          },
        });

        await interaction.edit({
          embeds: Responses.success.make()
            .setDescription('Applied the Sticky Message to the target channel.')
            .addField('Channel', `<#${packet[1]}>`),
          components: [],
        });
      })
      .build();
  }
}
