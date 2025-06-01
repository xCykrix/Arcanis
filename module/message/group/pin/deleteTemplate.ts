import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['delete-template'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.template-delete',
          guidTopLevel: 'message.template-pin',
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
            inhibit: args.pin?.['delete-template'] === undefined,
            pick: args.pin?.['delete-template'] ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          if (args === null) return; // Assertion

          // Exists
          const kvFind = await KVC.appd.pinTemplate.find(args.name);
          const secure = kvFind?.value.guildId === interaction.guildId?.toString();
          if (kvFind?.versionstamp === undefined || (kvFind?.value.guildId !== undefined && !secure)) {
            if ((kvFind?.value.guildId !== undefined && !secure)) {
              Optic.incident({
                moduleId: 'message.pin.delete-template',
                message: `A valid database id was provided but did not match the tenant guildId. Spoofed access? ${interaction.guildId}/${interaction.user.id} ID: ${args.name}`,
              });
            }
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'pin', 'none-found')),
            });
            return;
          }

          // Delete
          await KVC.appd.pinTemplate.delete(args.name);

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'pin.delete-template', 'result', [kvFind.value.name])),
          });
        },
      })
      .createAutoCompleteHandler({
        pick: ({ interaction, assistant }) => {
          return assistant.parseAutoComplete(interaction, ['pin', 'delete-template', 'name']);
        },
        generate: async ({ interaction, pick }) => {
          if (pick === null) return [];

          // Query KVC
          const kvFind = await KVC.appd.pinTemplate.findBySecondaryIndex('guildId', interaction.guild!.id.toString(), {
            filter: (v) => v.value.name.toLowerCase().includes(`${pick.value?.toString().toLowerCase()}`) || v.value.message.toLowerCase().includes(`${pick.value?.toString().toLowerCase()}`),
          });
          if (kvFind.result.length === 0) return [];

          return kvFind.result?.map((v) => {
            return {
              name: `${v.value.name}`,
              value: v.id,
            };
          });
        },
      });
  }
}
