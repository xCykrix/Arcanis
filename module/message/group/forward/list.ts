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
      MessageDefinition['forward']['list'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.forward.list',
          guidTopLevel: 'message.forward',
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
            inhibit: args.forward?.list === undefined,
            pick: args.forward?.list ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Fetch Listing
          const kvFind = await KVC.appd.forward.findBySecondaryIndex('guildId', args.channel.guildId!.toString(), {
            filter: (v) => v.value.fromChannelId === args.channel.id.toString() || v.value.toChannelId === args.channel.id.toString(),
          });

          // Exists Check
          if (kvFind.result.length === 0) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('forward.list', 'nonexistant')!),
            });
            return;
          }
        },
      });
  }
}
