import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { PingerDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      PingerDefinition['server']['remove-alert-role'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.server.remove-alert-role',
          guidTopLevel: 'pinger.server',
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
            inhibit: args.server?.['remove-alert-role'] === undefined,
            pick: args.server?.['remove-alert-role'] ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return;

          // Make GUID
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: interaction.guildId!.toString(),
            constants: [
              args.name,
            ],
          });

          // Fetch Pinger
          const kvFind = await KVC.appd.serverPinger.findByPrimaryIndex('guid', guid);
          if (kvFind?.versionstamp === undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('pinger', 'none-found')),
            });
            return;
          }

          if (kvFind.value.rolesToAlert === undefined) kvFind.value.rolesToAlert = new Set();
          kvFind.value.rolesToAlert.delete(args.role.id.toString());
          await KVC.appd.serverPinger.update(kvFind.id, {
            rolesToAlert: kvFind.value.rolesToAlert,
          });

          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'server.remove-alert-role', 'result')),
          });
        },
      })
      .createAutoCompleteHandler({
        pick: ({ interaction, assistant }) => {
          return assistant.parseAutoComplete(interaction, ['server', 'remove-alert-role', 'name']);
        },
        generate: async ({ interaction, pick }) => {
          if (pick === null) return [];

          // Query KVC
          const kvFind = await KVC.appd.serverPinger.findBySecondaryIndex('guildId', interaction.guild!.id.toString(), {
            filter: (v) => v.value.name.toLowerCase().includes(`${pick.value?.toString().toLowerCase()}`),
          });
          if (kvFind.result.length === 0) return [];

          return kvFind.result?.map((v) => {
            return {
              name: `${v.value.name}`,
              value: v.value.name,
            };
          });
        },
      });
  }
}
