import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import type { ReactionType } from '../../../../lib/kvc/model/appd/reaction.ts';
import { Emoji } from '../../../../lib/util/guard/emoji.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<Partial<MessageDefinition>>()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.reaction.set',
          guidTopLevel: 'message.reaction',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        inhibitor: ({ args }) => {
          return args.reaction?.set === undefined;
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args.reaction?.set === undefined) return; // Assertion
          await interaction.defer();

          // Permission Guard (Target Channel) - Bot Permissions
          const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.reaction.set.channel.id, botMember!, botPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'permission.bot.cmissing')!)
                .addField('Channel', `<#${args.reaction.set.channel.id}>`)
                .addField('Missing', botPermissions.join('\n')),
            });
            return;
          }

          // Build Reaction List
          const reactions = args.reaction.set.reactions.split('\u0020').filter((v) => v.trim().length !== 0);

          // Validate Reactions
          for (const v of reactions) {
            if (Emoji.check(v)) continue;
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('reaction.set', 'emoji.invalid')!)
                .addField('Data', v),
            });
            return;
          }

          // Fetch Database Reaction Sum for Channel
          const kvFind = await KVC.appd.reaction.findBySecondaryIndex('channelId', args.reaction.set.channel.id.toString());
          const count = kvFind.result.reduce((acc, v) => {
            if (v.value.type === args.reaction!.set.type) return acc;
            return acc + v.value.reaction.length;
          }, 0);

          // Check Reaction Hard Limit
          if (reactions.length + count > 20) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('reaction.set', 'emoji.exceed', [count, reactions.length])!),
            });
            return;
          }

          // Fetch Appd Reactions
          let hasAll = false;
          let hasSpecific = false;
          kvFind.result.forEach((v) => {
            if (v.value.type === 'a') hasAll = true;
            else hasSpecific = true;
          });

          // Affirm Exclusivity of Reaction Types
          if (args.reaction.set.type === 'a' && hasSpecific) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(
                  getLang('reaction.set', 'exclusivity', [
                    'All Messages (Exclusive)',
                    'Only (Priority-based)',
                  ])!,
                ),
            });
            return;
          }
          if (args.reaction.set.type !== 'a' && hasAll) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(
                  getLang('reaction.set', 'exclusivity', [
                    'Only (Priority-based)',
                    'All Messages (Exclusive)',
                  ])!,
                ),
            });
            return;
          }

          // Write to Database
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.reaction.set.channel.guildId!.toString(),
            channelId: args.reaction.set.channel.id.toString(),
            constants: [
              args.reaction.set.type,
            ],
          });
          await KVC.appd.reaction.upsertByPrimaryIndex({
            index: ['guid', guid],
            update: {
              reaction: reactions,
              self: args.reaction.set.self ?? false,
            },
            set: {
              guid,
              guildId: args.reaction.set.channel.guildId!.toString(),
              channelId: args.reaction.set.channel.id.toString(),
              reaction: reactions,
              type: args.reaction.set.type as ReactionType,
              self: args.reaction.set.self ?? false,
            },
          }, {
            strategy: 'merge-shallow',
          });

          // Respond Success
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('reaction.set', 'result')!)
              .addField('Channel', `<#${args.reaction.set.channel.id}>`)
              .addField('Type', lookup[args.reaction.set.type as ReactionType], true)
              .addField('React to Self', `${args.reaction.set.self ? 'True' : 'False'}`, true),
          });
        },
      });
  }
}

/** Reverse Lookup Table. */
const lookup = {
  'a': 'All Messages (Exclusive)',
  'e': 'Embed Only (Priority 4)',
  'm': 'Media Only (Priority 3)',
  'u': 'URL Only (Priority 2)',
  't': 'Text Only (Priority 1)',
};
