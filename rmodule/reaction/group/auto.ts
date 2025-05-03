import { type Collection, MessageComponentTypes, type SelectMenuDefaultValue } from '@discordeno';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalReactionModuleReactionID, ReactionType } from '../../../lib/database/model/reaction.model.ts';
import { AsyncCommandGroup } from '../../../lib/generic/groupHandler.ts';
import { ComponentHandler } from '../../../lib/util/builder/components.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../mod.ts';
export class AutoCommandGroup extends AsyncCommandGroup {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const listPaginate = ComponentHandler.builder({
      moduleId: '319f564e',
      allowApplicationUser: false,
      allowBotUser: false,
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Resolve Data
      const resolved = interaction.data!.resolved! as {
        roles?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.role>;
        members?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.member>;
      };
      const roles = resolved?.roles?.map((v) => v.id.toString()) ?? null;
      const members = resolved?.members?.map((v) => v.id.toString()) ?? null;

      // Get Database
      const configuration = await DatabaseConnector.appd.reaction.find(constants[0]);
      if (configuration === null) {
        await interaction.edit({
          embeds: Responses.error.make()
            .setDescription('This Auto Reaction Configuration no longer exists. Please use the original command again.'),
        });
        return;
      }

      // Update Database
      await DatabaseConnector.appd.reaction.update(constants[0], {
        exclusion: {
          user: members ?? configuration.value.exclusion?.user ?? [],
          role: roles ?? configuration.value.exclusion?.role ?? [],
        },
      }, {
        strategy: 'merge-shallow',
      });

      // Get Updated and Respond
      const updated = await DatabaseConnector.appd.reaction.find(constants[0]);
      await interaction.respond({
        embeds: Responses.success.make()
          .setDescription('Exclusions have been updated.')
          .addField('Channel', `<#${configuration.value.channelId}>`, true)
          .addField('Users', ((updated?.value.exclusion?.user?.length ?? 0) === 0) ? 'None' : (updated?.value.exclusion?.user ?? null)?.map((v) => `<@${v}>`).join(' ') ?? 'None')
          .addField('Roles', ((updated?.value.exclusion?.role?.length ?? 0) === 0) ? 'None' : (updated?.value.exclusion?.role ?? null)?.map((v) => `<@&${v}>`).join(' ') ?? 'None'),
      });
      return;
    });
    listPaginate.build();

    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!this.expect('reaction', interaction)) return;
      const args = this.parse<{
        auto?: {
          set?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            reactions: string;
            type: ReactionType;
          };
          remove?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            type: ReactionType;
          };
          exclude?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            type: ReactionType;
          };
          list?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            request?: 'reactions' | 'exclude' | 'both';
            page?: number;
          };
        };
      }>(interaction);
      if (args.auto === undefined) return;
      await interaction.defer();

        // Load Defaults
        const defaultRole: SelectMenuDefaultValue[] = [];
        const defaultUser: SelectMenuDefaultValue[] = [];
        fetchByPrimary.value.exclusion?.role?.forEach((v) =>
          defaultRole.push({
            type: 'role',
            id: BigInt(v),
          })
        );
        fetchByPrimary.value?.exclusion?.user?.forEach((v) =>
          defaultUser.push({
            type: 'user',
            id: BigInt(v),
          })
        );

        // Send Component Message
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Please use the following drop-down to exclude up to 25 users and roles from a reaction type in the specified channel.')
            .addField('Channel', `<#${args.auto.exclude.channel.id}>`, true)
            .addField('Type', args.auto.exclude.type, true),
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.SelectMenuUsers,
                  customId: await listPaginate.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      `${fetchByPrimary.id}`,
                      'user',
                    ],
                  }),
                  placeholder: 'Select up to 25 Users',
                  minValues: 0,
                  maxValues: 25,
                  defaultValues: defaultUser,
                },
              ],
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.SelectMenuRoles,
                  customId: await listPaginate.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      `${fetchByPrimary.id}`,
                      'role',
                    ],
                  }),
                  placeholder: 'Select up to 25 Roles',
                  minValues: 0,
                  maxValues: 25,
                  defaultValues: defaultRole,
                },
              ],
            },
          ],
        });
        return;
      }

      // Handle State: args.auto.list
      if (args.auto.list) {
        // Fetch by Secondary
        const configurations = await DatabaseConnector.appd.reaction.findBySecondaryIndex('guildId', args.auto.list.channel.guildId!.toString(), {
          filter: (v) => v.value.channelId === args.auto!.list!.channel.id.toString(),
        });

        // Exists Check
        if (configurations.result.length === 0) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('No Auto Reaction Configurations found. Please check the channel is correct and try again.'),
          });
          return;
        }

        // Build Embed
        const embeds = Responses.success.make()
          .setTitle('Auto Reaction List')
          .addField('Channel', `<#${args.auto.list.channel.id}>`, true);

        // Create Lookup Index
        const lookup = {
          'all': 'All Messages',
          'embed-only': 'Messages with Embed',
          'media-only': 'Messages with Attachments',
          'url-only': 'Messages with URL',
          'text-only': 'Messages with Text',
        };

        // Consolidate
        for (const configuration of configurations.result) {
          embeds.addField(`Type: ${lookup[configuration.value.type]}`, `${configuration.value.reaction.join(' ')} | ${configuration.value.exclusion?.user?.length ?? 0} User(s) and ${configuration.value.exclusion?.role?.length ?? 0} Role(s) Excluded`, false);
        }

        // Respond
        await interaction.respond({
          embeds,
        });
      }
    });
  }
}
