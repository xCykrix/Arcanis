import * as urlRegexSafe from '@url-regex-safe';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { Initializable } from '../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../mod.ts';
import type { ReactionType } from '../share/reactionType.ts';

export class ReactionInteractionComponentHandler extends Initializable {
  public override initialize(): Promise<void> | void {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.applicationId === Bootstrap.bot.applicationId) return;

      // Parse Media Type
      let type: ReactionType = 'text-only';
      if (urlRegexSafe.default({ exact: true }).test(message.content)) type = 'url-only'
      if ((message.attachments?.length ?? 0) !== 0) type = 'media-only';
      if ((message.embeds?.length ?? 0) !== 0) type = 'embed-only';

      // Fetch Database
      const configurations = await DatabaseConnector.appd.reactionModuleConfiguration.findBySecondaryIndex('channel', message.channelId.toString());
    });
  }
}
