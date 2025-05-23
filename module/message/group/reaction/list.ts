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
    GroupBuilder.builder<Partial<MessageDefinition>>()
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
        inhibitor: ({ args }) => {
          return args.reaction?.list === undefined;
        },
        handle: async ({ interaction, args }) => {
          if (args.reaction === undefined || args.reaction.list === undefined) return;
          await interaction.defer();

          // Fetch Database Reaction for Listing
          const kvFind = await KVC.appd.reaction.findBySecondaryIndex('channelId', args.reaction.list.channel.id.toString());

          // Exists Check
          if (kvFind.result.length === 0) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('reaction.list', 'nonexistant')!),
            });
            return;
          }

          // Optional Exclusions
          const kvFindExclusion = await KVC.appd.reactionExclusion.findByPrimaryIndex('channelId', args.reaction.list.channel.id.toString());
          const user: string[] = kvFindExclusion?.value.exclusion.user ?? [];
          const role: string[] = kvFindExclusion?.value.exclusion.user ?? [];

          // Template
          const embed = Responses.success.make()
            .setDescription(getLang('reaction.list', 'result')!)
            .addField('Channel', `<#${args.reaction.list.channel.id}>`)
            .addField('Exclusions', `${user.length} User(s) and ${role.length} Role(s) Excluded.`);

          // Consolidate
          for (const result of kvFind.result) {
            embed.addField(`Type: ${lookup[result.value.type]}`, `${result.value.reaction.join(' ')} | Self React: ${result.value.self ?? false}`);
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
