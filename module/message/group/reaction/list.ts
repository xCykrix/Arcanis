import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['reaction']['list'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.reaction.list',
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
            inhibit: args.reaction?.list === undefined,
            pick: args.reaction?.list ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Fetch Database Reaction for Listing
          const kvFind = await KVC.appd.reaction.findBySecondaryIndex('channelId', args.channel.id.toString());

          // Exists Check
          if (kvFind.result.length === 0) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'reaction', 'none-found')),
            });
            return;
          }

          // Optional Exclusions
          const kvFindExclusion = await KVC.appd.reactionExclusion.findByPrimaryIndex('channelId', args.channel.id.toString());
          const user: Set<string> = kvFindExclusion?.value.exclusion.user ?? new Set();
          const role: Set<string> = kvFindExclusion?.value.exclusion.user ?? new Set();

          // Template
          const embed = Responses.success.make()
            .setDescription(getLang('message', 'reaction.list', 'result'))
            .addField('Channel', `<#${args.channel.id}>`)
            .addField('Exclusions', `${user.size} User(s) and ${role.size} Role(s) Excluded.`);

          // Consolidate
          for (const result of kvFind.result) {
            embed.addField(`Type: ${lookup[result.value.type]}`, `${result.value.reaction.values().toArray().join(' ')} | Self React: ${result.value.self ?? false}`);
          }

          // Respond Success
          await interaction.respond({
            embeds: embed,
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
