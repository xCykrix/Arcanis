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
      PingerDefinition['manage']['remove-channel'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.manage.remove-channel',
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
            inhibit: args.manage?.['remove-channel'] === undefined,
            pick: args.manage?.['remove-channel'] ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          if (args === null) return;

          // Fetch current configuration or upsert defaults.
          let kvFind = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', interaction.guildId!.toString());
          if (kvFind?.versionstamp === undefined) {
            await KVC.appd.guildPingerSetup.add({
              guildId: interaction.guildId!.toString(),
              personalChannelIds: new Set(),
              alertMessage: '{{TITLE}} {{SKU}} {{ROLES}}',
              alertCooldownByProduct: 5,
              deleteAlertAfter: 120,
            });
            kvFind = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', interaction.guildId!.toString());
            if (kvFind?.versionstamp === undefined) return;
          }

          // Set the personalChannelIds with deleted entry.
          if (kvFind.value.personalChannelIds.has(args.channel.id.toString())) {
            const channelIds = new Set<string>(kvFind.value.personalChannelIds);
            channelIds.delete(args.channel.id.toString());
            kvFind.value.personalChannelIds = channelIds;
          }

          // Write database.
          await KVC.appd.guildPingerSetup.updateByPrimaryIndex('guildId', interaction.guildId!.toString(), {
            personalChannelIds: kvFind.value.personalChannelIds,
          }, {
            strategy: 'merge-shallow',
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'manage.remove-channel', 'result')),
          });
        },
      });
  }
}
