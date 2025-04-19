import { DatabaseConnector } from '../../../lib/database/database.ts';
import { CommandGroupHandler } from '../../../lib/generic/groupHandler.ts';
import { Emoji } from '../../../lib/util/validation/emoji.ts';
import { Bootstrap } from '../../../mod.ts';

export class ReactionModuleGroupForward extends CommandGroupHandler {
  public override initialize(): void {
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
          list?: {};
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

        if (!Emoji.validate(reaction)) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('Invalid Emoji Data in Reaction List.')
              .addField('Data', reaction),
          });
          return;
        }

        // Limits
        const fromRecordCount = await DatabaseConnector.appd.reactionModuleForwardConfiguration.countBySecondaryIndex('from', args.forward.add.from.toString());
        if (fromRecordCount >= 10) {
          await interaction.respond({
            embeds: this.generator.error.generic()
              .setDescription('You may only create up to 10 forwarders in a source (from) channel.'),
          });
          return;
        }

        // Write to Database
        await DatabaseConnector.appd.reactionModuleForwardConfiguration.add({
          guild: args.forward.add.from.guildId!.toString(),
          from: args.forward.add.from.id.toString(),
          to: args.forward.add.to.id.toString(),
          reaction,
          within: args.forward.add.within,
          alert: args.forward.add.alert ?? undefined,
        });
      }
    });
  }
}
