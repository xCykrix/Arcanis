import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import type { ReactionType } from '../../../../lib/database/model/reaction.model.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../../mod.ts';

export default class extends AsyncInitializable {
  private regex = /^https?:\/\/(?:www\.)?(?:[\w\-_.~])+(?:\.\w+)\/?(?:[\S]){1,}$/gi;

  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;

      // Parse Media Type
      let type: ReactionType = 'text-only';
      if (this.regex.test(message.content)) type = 'url-only';
      if ((message.attachments?.length ?? 0) !== 0) type = 'media-only';
      if ((message.embeds?.length ?? 0) !== 0) type = 'embed-only';

      // Fetch Appd Reaction by Primary
      const guid = GUID.makeVersion1GUID({
        module: 'reaction.auto',
        guildId: message.guildId.toString(),
        channelId: message.channelId.toString(),
        data: [
          type,
        ],
      });
      const guidFallback = GUID.makeVersion1GUID({
        module: 'reaction.auto',
        guildId: message.guildId.toString(),
        channelId: message.channelId.toString(),
        data: [
          'all',
        ],
      });
      const fetchByPrimary = (
        await DatabaseConnector.appd.reaction.findByPrimaryIndex('guid', guid)
      ) ?? (
        await DatabaseConnector.appd.reaction.findByPrimaryIndex('guid', guidFallback)
      );
      if (fetchByPrimary?.versionstamp === undefined) return;

      // Check Exclusions
      if (fetchByPrimary.value.exclusion) {
        if (fetchByPrimary.value.exclusion.user?.includes(message.author.id.toString())) return;
        for (const role of message.member?.roles ?? []) {
          if (fetchByPrimary.value.exclusion.role?.includes(role.toString())) return;
        }
      }

      // Add Reactions
      for (const reaction of fetchByPrimary.value.reaction) {
        await Bootstrap.bot.helpers.addReaction(message.channelId, message.id, reaction);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });
  }
}
