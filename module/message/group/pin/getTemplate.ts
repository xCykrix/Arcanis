import { ChannelTypes } from '@discordeno';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['get-template'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.template-get',
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
            inhibit: args.pin?.['get-template'] === undefined,
            pick: args.pin?.['get-template'] ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return; // Assertion
        },
      })
      .createAutoCompleteHandler({
        pick: ({ interaction, assistant }) => {
          // ! TODO: Autofill
          return assistant.parseAutoComplete(interaction, ['message', 'pin', 'get-template']);
        },
        generate: async ({ interaction, pick }) => {
          if (pick === null) return [];

          // Query KVC
          const kvFind = await KVC.appd.pinTemplate.findBySecondaryIndex('guildId', interaction.guild!.id.toString(), {
            filter: (v) => v.value.name.includes(`${pick.value?.toString().toLowerCase()}`) || v.value.message.includes(`${pick.value?.toString().toLowerCase()}`),
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
