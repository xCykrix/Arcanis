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
      PingerDefinition['manage']['configure'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.manage.configure',
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
            inhibit: args.manage?.configure === undefined,
            pick: args.manage?.configure ?? null,
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
              alertCooldownByProduct: 5,
              deleteAlertAfter: 120,
            });
            kvFind = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', interaction.guildId!.toString());
            if (kvFind?.versionstamp === undefined) return;
          }

          // Write database.
          await KVC.appd.guildPingerSetup.updateByPrimaryIndex('guildId', interaction.guildId!.toString(), {
            alertCooldownByProduct: args.cooldown ?? kvFind.value.alertCooldownByProduct ?? 5,
            deleteAlertAfter: args['delete-after'] ?? kvFind.value.deleteAlertAfter ?? 120,
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'manage.configure', 'result'))
              .addField('Cooldown', `${args.cooldown ?? kvFind.value.alertCooldownByProduct ?? 5} Seconds`)
              .addField('Delete Alert After', `${args['delete-after'] ?? kvFind.value.deleteAlertAfter ?? 120} Seconds`),
          });
        },
      });
  }
}
