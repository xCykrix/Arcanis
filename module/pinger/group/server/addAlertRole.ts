import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../../mod.ts';
import type { PingerDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      PingerDefinition['server']['add-alert-role'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.server.add-alert-role',
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
            inhibit: args?.server?.['add-alert-role'] === undefined,
            pick: args?.server?.['add-alert-role'] ?? null,
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

          // Verify Internal Cache
          const added: string[] = [];
          const provided = args.roles.split(' ').map(async (v) => {
            return await Bootstrap.bot.cache.roles.get(BigInt(v.replace(/<|@&|>/g, '')));
          });
          for await (const provision of provided) {
            if (provision === undefined || provision === null) {
              await interaction.respond({
                embeds: Responses.error.make()
                  .setDescription(getLang('pinger', 'server.add-alert-roles', 'invalid-role')),
              });
              return;
            }
            if (!kvFind.value.rolesToAlert.has(provision.id.toString())) {
              kvFind.value.rolesToAlert.add(provision.id.toString());
              added.push(provision.id.toString());
            }
          }

          // Write Database
          await KVC.appd.serverPinger.update(kvFind.id, {
            rolesToAlert: kvFind.value.rolesToAlert,
          });

          // Respond
          const values = added.map((v) => `<@&${v}>`);
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'server.add-alert-roles', 'result', [kvFind.value.name]))
              .addField('Roles', values.length > 0 ? values.join(' ') : 'No Roles Added'),
          });
        },
      })
      .createAutoCompleteHandler({
        pick: ({ interaction, assistant }) => {
          return assistant.parseAutoComplete(interaction, ['server', 'add-alert-role', 'name']);
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
