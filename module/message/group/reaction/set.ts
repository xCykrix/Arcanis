import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import type { ReactionType } from '../../../../lib/kvc/model/appd/reaction.ts';
import { Emoji } from '../../../../lib/util/check/emoji.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['reaction']['set'],
      MessageDefinition
    >()
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
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args.reaction?.set === undefined,
            pick: args.reaction?.set ?? null,
          };
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Permission Guard (Target Channel) - Bot Permissions
          const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.channel.id, botMember!, botPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
                .addField('Channel', `<#${args.channel.id}>`)
                .addField('Required', botPermissions.join('\n')),
            });
            return;
          }

          // Build Reaction List
          const reactions = new Set(args.reactions.split('\u0020').filter((v) => v.trim().length !== 0));

          // Validate Reactions
          for (const v of reactions) {
            if (Emoji.check(v)) continue;
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'emoji.invalid.multi'))
                .addField('Data', v),
            });
            return;
          }

          // Fetch Database Reaction Sum for Channel
          const kvFind = await KVC.appd.reaction.findBySecondaryIndex('channelId', args.channel.id.toString());
          const count = kvFind.result.reduce((acc, v) => {
            if (v.value.type === args.type) return acc;
            return acc + v.value.reaction.size;
          }, 0);

          // Check Reaction Hard Limit
          if (reactions.size + count > 20) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'reaction.set', 'exceed', [count, reactions.size])),
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
          if (args.type === 'a' && hasSpecific) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(
                  getLang('message', 'reaction.set', 'exclusive', [
                    'All Messages (Exclusive)',
                    'Only (Priority-based)',
                  ]),
                ),
            });
            return;
          }
          if (args.type !== 'a' && hasAll) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(
                  getLang('message', 'reaction.set', 'exclusive', [
                    'Only (Priority-based)',
                    'All Messages (Exclusive)',
                  ]),
                ),
            });
            return;
          }

          // Write to Database
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.channel.guildId!.toString(),
            channelId: args.channel.id.toString(),
            constants: [
              args.type,
            ],
          });
          await KVC.appd.reaction.upsertByPrimaryIndex({
            index: ['guid', guid],
            update: {
              reaction: reactions,
              self: args.self ?? false,
            },
            set: {
              guid,
              guildId: args.channel.guildId!.toString(),
              channelId: args.channel.id.toString(),
              reaction: reactions,
              type: args.type as ReactionType,
              self: args.self ?? false,
            },
          }, {
            strategy: 'merge-shallow',
          });

          // Respond Success
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'reaction.set', 'result'))
              .addField('Channel', `<#${args.channel.id}>`)
              .addField('Type', lookup[args.type as ReactionType], true)
              .addField('React to Self', `${args.self ? 'True' : 'False'}`, true),
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
