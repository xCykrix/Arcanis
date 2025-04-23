import { ButtonStyles, MessageComponentTypes } from '@discordeno';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalReactionModuleForwardID } from '../../../lib/database/model/forward.model.ts';
import { CommandComponentHandler } from '../../../lib/generic/componentHandler.ts';
import { CommandGroupHandler } from '../../../lib/generic/groupHandler.ts';
import { Emoji } from '../../../lib/util/validation/emoji.ts';
import { Bootstrap } from '../../../mod.ts';

export class ReactionModuleGroupForward extends CommandGroupHandler {
  public override async initialize(): Promise<void> {
    await (new ReactionModuleComponentForward()).initialize();
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!this.expect('reaction', interaction)) return;
      const args = this.parse<{
        forward?: {
          add?: {
            from: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            to: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            reaction: string;
            threshold: number;
            within: number;
            alert?: string;
          };
          remove?: {
            from: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            reaction: string;
          };
          list?: {
            channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
            page?: number;
          };
        };
      }>(interaction);
      if (args.forward === undefined) return;
      await interaction.defer();

      // Unsupported Channel
      if (interaction.channel.guildId === undefined) {
        await interaction.respond(this.generator.error.getUnsupportedChannel('Guild Channels'));
        return;
      }

      // Check Permissions
      if (interaction.member?.id !== 100737000973275136n) {
        if (!this.permissions.role.has(interaction.member?.roles ?? [], 'MANAGE_MESSAGES')) {
          await interaction.respond(this.generator.error.getPermissionDenied('MANAGE_MESSAGES'));
          return;
        }
      }

      // Handle State: args.forward.add
      if (args.forward.add) {
        const reaction = args.forward.add.reaction;

        // Validate Emoji
        if (!Emoji.validate(reaction)) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('Invalid Emoji Data in Reaction List.')
              .addField('Data', reaction),
          });
          return;
        }

        // Limits
        const fromRecordCount = await DatabaseConnector.appd.reactionModuleForwardConfiguration.countBySecondaryIndex('fromChannelId', args.forward.add.from.toString());
        if (fromRecordCount >= 10) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('You may only create up to 10 forwarders in a source (from) channel.'),
          });
          return;
        }

        // Write to Database
        const guid = makeGlobalReactionModuleForwardID(args.forward.add.from.guildId!.toString(), args.forward.add.from.id.toString(), reaction);
        await DatabaseConnector.appd.reactionModuleForwardConfiguration.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            toChannelId: args.forward.add.to.id.toString(),
            reaction,
            within: args.forward.add.within,
            alert: args.forward.add.alert ?? undefined,
          },
          set: {
            guid,
            guildId: args.forward.add.from.guildId!.toString(),
            fromChannelId: args.forward.add.from.id.toString(),
            toChannelId: args.forward.add.to.id.toString(),
            reaction,
            threshold: args.forward.add.threshold,
            within: args.forward.add.within,
            alert: args.forward.add.alert ?? undefined,
          },
        }, {
          strategy: 'merge-shallow',
        });

        // Respond
        await interaction.respond({
          embeds: this.generator.result.generic()
            .setDescription('Forwarding has been set for the specified channel.')
            .addField('From Channel', `<#${args.forward.add.from!.id}>`, false)
            .addField('To Channel', `<#${args.forward.add.to!.id}>`, false)
            .addField('Reaction', `${args.forward.add.reaction}`, false)
            .addField('Threshold', `${args.forward.add.threshold} Reactions`, false),
        });
        return;
      }

      // Handle State: args.forward.remove
      if (args.forward.remove) {
        const reaction = args.forward.remove.reaction;

        if (!Emoji.validate(reaction)) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('Invalid Emoji Data in Reaction List.')
              .addField('Data', reaction),
          });
          return;
        }

        // Fetch the Absolute
        const guid = makeGlobalReactionModuleForwardID(args.forward.remove.from.guildId!.toString(), args.forward.remove.from.id.toString(), args.forward.remove.reaction);
        const fetchByPrimary = await DatabaseConnector.appd.reactionModuleForwardConfiguration.findByPrimaryIndex('guid', guid);

        // Exists Check
        if (fetchByPrimary === null || fetchByPrimary.versionstamp === undefined) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('Unknown Reaction Forwarder Configuration. Please check the channel and reaction is correct.'),
          });
          return;
        }

        // Delete
        await DatabaseConnector.appd.reactionModuleForwardConfiguration.delete(fetchByPrimary.id);

        // Respond
        await interaction.respond({
          embeds: this.generator.result.generic()
            .setDescription('Removed Reaction Forwarder Configuration')
            .addField('From', `<#${args.forward.remove.from.id}>`, false)
            .addField('To', `<#${fetchByPrimary.value.toChannelId}>`, false)
            .addField('Reaction', args.forward.remove.reaction, true),
        });
        return;
      }

      if (args.forward.list) {
        // Fetch by Secondary
        const configurations = await DatabaseConnector.appd.reactionModuleForwardConfiguration.findBySecondaryIndex('guildId', args.forward.list.channel.guildId!.toString(), {
          filter: (v) => v.value.fromChannelId === args.forward!.list!.channel.id.toString() || v.value.toChannelId === args.forward!.list!.channel.id.toString(),
        });

        // Exists Check
        if (configurations.result.length === 0) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('No Reaction Forwarder Configurations found. Please check the channel is correct and try again.'),
          });
          return;
        }

        // Build Embed
        const embeds = this.generator.result.generic()
          .setTitle('Auto Forward List')
          .setFooter(`Page: 1`);
        const fields = new Map<string, Set<[string, string]>>();

        // Iterate Embeds from Pagination
        const currentPage = configurations.result.slice(0, 14);
        const hasNextPage = configurations.result.slice(15, 29).length !== 0;

        for (const configuration of currentPage) {
          if (!fields.has(configuration.value.fromChannelId)) fields.set(configuration.value.fromChannelId, new Set());
          fields.get(configuration.value.fromChannelId)!.add([configuration.value.toChannelId, configuration.value.reaction]);
        }
        for (const [key, value] of fields.entries()) {
          const chunk: string[] = [];
          for (const v of value) {
            chunk.push(`To: <#${v[0]}> Reaction: ${v[1]}`);
          }
          embeds.addField(`From: <#${key}>`, `${chunk.join('\n')}`);
        }
        embeds.addField('Search Channel', `<#${args.forward.list.channel.id.toString()}>`);

        // Respond
        await interaction.respond({
          embeds,
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.Button,
                  customId: `reactionForwardModule/${args.forward.list.channel.guildId!.toString()}/${args.forward.list.channel.id.toString()}/0/page-prev/${interaction.user.id}`,
                  style: ButtonStyles.Secondary,
                  label: 'Previous',
                  disabled: true,
                },
                {
                  type: MessageComponentTypes.Button,
                  customId: `reactionForwardModule/${args.forward.list.channel.guildId!.toString()}/${args.forward.list.channel.id.toString()}/0/page-next/${interaction.user.id}`,
                  style: ButtonStyles.Secondary,
                  label: 'Next',
                  disabled: !hasNextPage,
                },
              ],
            },
          ],
        });
      }
    });
  }
}

class ReactionModuleComponentForward extends CommandComponentHandler {
  public override initialize(): Promise<void> | void {
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!this.expect('reactionForwardModule', interaction)) return;
      await interaction.deferEdit();
      const chunks = interaction.data!.customId!.split('/');

      // Check User
      if (interaction.user.id.toString() !== chunks[5]) {
        await interaction.respond({
          embeds: this.generator.error.generic()
            .setDescription('This component can only be used by the original user of this message.'),
        }, {
          isPrivate: true,
        });
        return;
      }

      // Parse Variables
      let indexPage = parseInt(chunks[3])!;
      let displayPage = indexPage + 1;
      const instruction = chunks[4];

      // Fetch by Secondary
      const configurations = await DatabaseConnector.appd.reactionModuleForwardConfiguration.findBySecondaryIndex('guildId', chunks[1], {
        filter: (v) => v.value.fromChannelId === chunks[2] || v.value.toChannelId === chunks[2],
      });

      // Build Embed
      const embeds = this.generator.result.generic()
        .setTitle('Auto Forward List');
      const fields = new Map<string, Set<[string, string]>>();

      // Iterate Embeds from Pagination
      if (instruction === 'page-next') {
        indexPage = indexPage + 1;
        displayPage = displayPage + 1;
      }
      if (indexPage >= 1 && instruction === 'page-prev') {
        indexPage = indexPage - 1;
        displayPage = displayPage - 1;
      }
      const hasPreviousPage = indexPage >= 1 ? true : false;
      const currentPage = configurations.result.slice(0 + (indexPage * 15), 14 + (indexPage * 15));
      const hasNextPage = configurations.result.slice(15 + (indexPage * 15), 29 + (indexPage * 15)).length !== 0; //0 + (15 * 0), 15 + (15 * 0)

      for (const configuration of currentPage) {
        if (!fields.has(configuration.value.fromChannelId)) fields.set(configuration.value.fromChannelId, new Set());
        fields.get(configuration.value.fromChannelId)!.add([configuration.value.toChannelId, configuration.value.reaction]);
      }
      for (const [key, value] of fields.entries()) {
        const chunk: string[] = [];
        for (const v of value) {
          chunk.push(`To: <#${v[0]}> Reaction: ${v[1]}`);
        }
        embeds.addField(`From: <#${key}>`, `${chunk.join('\n')}`);
      }
      embeds.addField('Search Channel', `<#${chunks[2]}>`);
      embeds.setFooter(`Page: ${displayPage}`);

      // Respond
      await interaction.edit({
        embeds,
        components: [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.Button,
                customId: `reactionForwardModule/${chunks[1]}/${chunks[2]}/${indexPage}/page-prev/${interaction.user.id}`,
                style: ButtonStyles.Secondary,
                label: 'Previous',
                disabled: !hasPreviousPage,
              },
              {
                type: MessageComponentTypes.Button,
                customId: `reactionForwardModule/${chunks[1]}/${chunks[2]}/${indexPage}/page-next/${interaction.user.id}`,
                style: ButtonStyles.Secondary,
                label: 'Next',
                disabled: !hasNextPage,
              },
            ],
          },
        ],
      });
    });
  }
}
