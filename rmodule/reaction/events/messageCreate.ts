import * as urlRegexSafe from '@url-regex-safe';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalReactionModuleReactionID, ReactionType } from '../../../lib/database/model/reaction.model.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../mod.ts';

export class MessageCreateEvent extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;
      if (message.applicationId === Bootstrap.bot.applicationId) return;

      // Parse Media Type
      let type: ReactionType = 'text-only';
      if (urlRegexSafe.default({ exact: true }).test(message.content)) type = 'url-only';
      if ((message.attachments?.length ?? 0) !== 0) type = 'media-only';
      if ((message.embeds?.length ?? 0) !== 0) type = 'embed-only';

      // Fetch Database and Abort if Not Configured
      let fetchByPrimary = await DatabaseConnector.appd.reaction.findByPrimaryIndex(
        'guid',
        makeGlobalReactionModuleReactionID(message.guildId!.toString(), message.channelId.toString(), type),
      );
      if (fetchByPrimary === null) {
        fetchByPrimary = await DatabaseConnector.appd.reaction.findByPrimaryIndex(
          'guid',
          makeGlobalReactionModuleReactionID(message.guildId!.toString(), message.channelId.toString(), 'all'),
        );
      }
      if (fetchByPrimary === null || fetchByPrimary.versionstamp === undefined) return;

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
