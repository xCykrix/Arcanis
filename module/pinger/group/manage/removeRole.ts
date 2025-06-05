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
      PingerDefinition['manage']['remove-role'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.manage.remove-role',
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
            inhibit: args.manage?.['remove-role'] === undefined,
            pick: args.manage?.['remove-role'] ?? null,
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

          // Upsert to role configuration.
          await KVC.appd.guildPingerSetupRole.deleteByPrimaryIndex('roleId', args.role.id.toString());

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'manage.remove-role', 'result')),
          });
        },
      });
  }
}
