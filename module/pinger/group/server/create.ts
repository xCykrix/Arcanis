import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { PingerDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      PingerDefinition['server']['create'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.server.create',
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
            inhibit: args.server?.create === undefined,
            pick: args.server?.create ?? null,
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

          // Check Exists
          const kvFind = await KVC.appd.serverPinger.findByPrimaryIndex('guid', guid);
          if (kvFind?.versionstamp !== undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('pinger', 'server.create', 'exists', [args.name])),
            });
            return;
          }

          // Write Pinger
          await KVC.appd.serverPinger.add({
            guid,
            guildId: interaction.guildId!.toString(),
            name: args.name,
            message: '{{role}}',
            keywords: '-all',
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('pinger', 'server.create', 'result')),
          });
        },
      });
  }
}
