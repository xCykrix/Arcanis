import { AsyncInitializable } from '../../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import { ReactionType } from '../../../../../lib/kvc/model/appd/reaction.ts';
import { Bootstrap } from '../../../../../mod.ts';

export default class extends AsyncInitializable {
  private regex = /^https?:\/\/(?:www\.)?(?:[\w\-_.~])+(?:\.\w+)\/?(?:[\S]){1,}$/gi;

  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;

      // Parse Media Type
      let type: ReactionType = 't';
      if (this.regex.test(message.content)) type = 'u';
      if ((message.attachments?.length ?? 0) !== 0) type = 'm';
      if ((message.embeds?.length ?? 0) !== 0) type = 'e';

      // Get Configuration
      const kvFind = await KVC.appd.reaction.findBySecondaryIndex('channelId', message.channelId.toString(), {
        filter: (v) => v.value.type === type || v.value.type === 'a';
      })
      if (kvFind.result.length === 0) return;
      const result = kvFind.result[0];
      if (result?.versionstamp === undefined) return;

      // Filter Bot
      if (!(result.value.self ?? false) && message.author.id === Bootstrap.bot.id) return;

      // Check Exclusions
      const kvFindExclusion = await KVC.appd.reactionExclusion.findByPrimaryIndex('channelId', message.channelId.toString());
      if (kvFindExclusion?.versionstamp !== undefined) {
        if (kvFindExclusion.value.exclusion.user?.includes(message.author.id.toString())) return;
        // ! Do Exclusions.
      }
    });
  }
}
