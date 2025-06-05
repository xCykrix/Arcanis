import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { PingerDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      PingerDefinition['manage']['add-channel'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.manage.add-channel',
          guidTopLevel: 'pinger.manage',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_GUILD'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args.manage?.['add-channel'] === undefined,
            pick: args.manage?.['add-channel'] ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          if (args === null) return;

          // Fetch current configuration or upsert defaults.
          let kvFind = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', interaction.guildId!.toString());
          if (kvFind?.versionstamp === undefined) {
            await KVC.appd.guildPingerSetup.add({
              guildId: interaction.guildId!.toString(),
              serverChannelIds: [],
              personalChannelIds: [],
            });
            kvFind = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', interaction.guildId!.toString());
            if (kvFind?.versionstamp === undefined) return;
          }

          // Attempt to add the channel to the specified type.
          if (args.type === 'server' || args.type === 'both') {
            if (!kvFind.value.serverChannelIds.includes(args.channel.id.toString())) {
              kvFind.value.serverChannelIds.push(args.channel.id.toString());
              await KVC.appd.guildPingerSetup.updateByPrimaryIndex('guildId', interaction.guildId!.toString(), {
                serverChannelIds: kvFind.value.serverChannelIds,
              }, {
                strategy: 'merge-shallow',
              });
            }
          }

          if (args.type === 'personal' || args.type === 'both') {
            if (!kvFind.value.personalChannelIds.includes(args.channel.id.toString())) {
              kvFind.value.personalChannelIds.push(args.channel.id.toString());
              await KVC.appd.guildPingerSetup.updateByPrimaryIndex('guildId', interaction.guildId!.toString(), {
                personalChannelIds: kvFind.value.personalChannelIds,
              }, {
                strategy: 'merge-shallow',
              });
            }
          }

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'manage.add-channel', 'result', [args.type])),
          });
        },
      });
  }
}
