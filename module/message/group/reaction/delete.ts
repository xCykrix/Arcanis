import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import type { ReactionType } from '../../../../lib/kvc/model/appd/reaction.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['reaction']['delete'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.reaction.delete',
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
            inhibit: args.reaction?.delete === undefined,
            pick: args.reaction?.delete ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Database GUID
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.channel.guildId!.toString(),
            channelId: args.channel.id.toString(),
            constants: [
              args.type,
            ],
          });

          // Exists Check
          const kvFind = await KVC.appd.reaction.findByPrimaryIndex('guid', guid);
          if (kvFind?.versionstamp === undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'reaction', 'none-found')),
            });
            return;
          }

          // Delete
          await KVC.appd.reaction.deleteByPrimaryIndex('guid', guid);

          // Respond Success
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'reaction.delete', 'result'))
              .addField('Channel', `<#${args.channel.id}>`)
              .addField('Type', lookup[args.type as ReactionType]),
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
