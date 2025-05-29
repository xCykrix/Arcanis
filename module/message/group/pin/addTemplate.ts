import { ChannelTypes } from '@discordeno';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['add-template'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.add-template',
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
            inhibit: args.pin?.['add-template'] === undefined,
            pick: args.pin?.['add-template'] ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          // ! TODO: Add Template Logic.
        },
      });
  }
}
