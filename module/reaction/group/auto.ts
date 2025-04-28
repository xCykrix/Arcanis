import { type Collection, MessageComponentTypes, type SelectMenuDefaultValue } from '@discordeno';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalReactionModuleReactionID } from '../../../lib/database/model/reaction.model.ts';
import { CommandGroupHandler } from '../../../lib/generic/groupHandler.ts';
import { ComponentHandler } from '../../../lib/util/builder/components.ts';
import { Permissions } from '../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import { Emoji } from '../../../lib/util/validation/emoji.ts';
import { Bootstrap } from '../../../mod.ts';
import type { ReactionType } from '../share/types.ts';

export class AutoCommandGroup extends CommandGroupHandler {
  public override async initialize(): Promise<void> {
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

      // Handle State: args.auto.add
      if (args.auto.set !== undefined) {
        // Split Reaction List
        const reactions = args.auto.set.reactions.split('\u0020').filter((v) => v.trim().length !== 0);

        // Validate Lengths
        if (reactions.length === 0 || reactions.length >= 10) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Invalid List of Reactions. You must specify between 1 and 10 Emojis to react.'),
          });
          return;
        }

        // Validate Reactions
        for (const reaction of reactions) {
          if (Emoji.validate(reaction)) continue;
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Invalid Emoji Data in Reaction List.')
              .addField('Data', reaction),
          });
          return;
        }

        const fetchBySecondary = await DatabaseConnector.appd.reactionModuleConfiguration.findBySecondaryIndex('channelId', args.auto.set.channel.id.toString());
        let hasConfigurationForAll = false;
        let hasConfigurationForSpecific = false;
        for (const fetched of fetchBySecondary.result) {
          if (fetched.value.type === 'all') hasConfigurationForAll = true;
          if (fetched.value.type !== 'all') hasConfigurationForSpecific = true;
        }

        // Cross Comparisons.
        if (args.auto.set.type === 'all' && hasConfigurationForSpecific) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(`Type '${args.auto.set.type}' is not compatible to 'Message with' types.`),
          });
          return;
        }
        if (args.auto.set.type !== 'all' && hasConfigurationForAll) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(`Type '${args.auto.set.type}' is not compatible to 'All Messages'.`),
          });
          return;
        }

        // Fetch the Absolute
        const guid = makeGlobalReactionModuleReactionID(args.auto.set.channel.guildId!.toString(), args.auto.set.channel.id.toString(), args.auto.set.type);
        await DatabaseConnector.appd.reactionModuleConfiguration.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            reaction: reactions,
          },
          set: {
            guid,
            guildId: args.auto.set.channel.guildId!.toString(),
            channelId: args.auto.set.channel.id.toString(),
            reaction: reactions,
            type: args.auto.set.type,
          },
        }, {
          strategy: 'merge-shallow',
        });

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Applied Auto Reaction Configuration')
            .addField('Channel', `<#${args.auto.set.channel.id}>`, true)
            .addField('Type', args.auto.set.type, true)
            .addField('Reactions', reactions.join(' '), false),
        });
        return;
      }

      // Handle State: args.auto.remove
      if (args.auto.remove !== undefined) {
        // Fetch the Absolute
        const guid = makeGlobalReactionModuleReactionID(args.auto.remove.channel.guildId!.toString(), args.auto.remove.channel.id.toString(), args.auto.remove.type);
        const fetchByPrimary = await DatabaseConnector.appd.reactionModuleConfiguration.findByPrimaryIndex(
          'guid',
          guid,
        );

        // Exist Check
        if (fetchByPrimary === null || fetchByPrimary.versionstamp === undefined) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unknown Auto Reaction Configuration. Please check the channel and type is correct.'),
          });
          return;
        }

        // Delete
        await DatabaseConnector.appd.reactionModuleConfiguration.delete(fetchByPrimary.id);

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Removed Auto Reaction Configuration')
            .addField('Channel', `<#${args.auto.remove.channel.id}>`, true)
            .addField('Type', args.auto.remove.type, true),
        });
        return;
      }

      // Handle State: args.auto.exclude
      if (args.auto.exclude) {
        // Fetch the Absolute
        const guid = makeGlobalReactionModuleReactionID(args.auto.exclude.channel.guildId!.toString(), args.auto.exclude.channel.id.toString(), args.auto.exclude.type);
        const fetchByPrimary = await DatabaseConnector.appd.reactionModuleConfiguration.findByPrimaryIndex(
          'guid',
          guid,
        );

        // Exists Check
        if (fetchByPrimary === null || fetchByPrimary.versionstamp === undefined) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unknown Auto Reaction Configuration. Please check the channel and type is correct.'),
          });
          return;
        }

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
                  customId: ComponentHandler.makeCustomId('reaction-auto-exclude', interaction.user.id.toString(), [
                    `${fetchByPrimary.id}`,
                    'user',
                  ]),
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
                  customId: ComponentHandler.makeCustomId('reaction-auto-exclude', interaction.user.id.toString(), [
                    `${fetchByPrimary.id}`,
                    'role',
                  ]),
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
        const configurations = await DatabaseConnector.appd.reactionModuleConfiguration.findBySecondaryIndex('guildId', args.auto.list.channel.guildId!.toString(), {
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

    ComponentHandler.builder().expectation({
      header: 'reaction-auto-exclude',
      allowApplicationUser: false,
      allowBotUser: false,
      requireAuthor: true,
      within: 1800,
    }).handle(async (interaction) => {
      await interaction.deferEdit();
      const packet = ComponentHandler.unmakeCustomId(interaction.data!.customId!).packet;

      // Resolve Data
      const resolved = interaction.data!.resolved! as {
        roles?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.role>;
        members?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.member>;
      };
      const roles = resolved?.roles?.map((v) => v.id.toString()) ?? null;
      const members = resolved?.members?.map((v) => v.id.toString()) ?? null;

      // Get Database
      const configuration = await DatabaseConnector.appd.reactionModuleConfiguration.find(packet[0]);
      if (configuration === null) {
        await interaction.edit({
          embeds: Responses.error.make()
            .setDescription('This Auto Reaction Configuration no longer exists. Please use the original command again.'),
        });
        return;
      }

      // Update Database
      await DatabaseConnector.appd.reactionModuleConfiguration.update(packet[0], {
        exclusion: {
          user: members ?? configuration.value.exclusion?.user ?? [],
          role: roles ?? configuration.value.exclusion?.role ?? [],
        },
      }, {
        strategy: 'merge-shallow',
      });

      // Get Updated and Respond
      const updated = await DatabaseConnector.appd.reactionModuleConfiguration.find(packet[0]);
      await interaction.respond({
        embeds: Responses.success.make()
          .setDescription('Exclusions have been updated.')
          .addField('Channel', `<#${configuration.value.channelId}>`, true)
          .addField('Users', ((updated?.value.exclusion?.user?.length ?? 0) === 0) ? 'None' : (updated?.value.exclusion?.user ?? null)?.map((v) => `<@${v}>`).join(' ') ?? 'None')
          .addField('Roles', ((updated?.value.exclusion?.role?.length ?? 0) === 0) ? 'None' : (updated?.value.exclusion?.role ?? null)?.map((v) => `<@&${v}>`).join(' ') ?? 'None'),
      });
      return;
    });
  }
}
