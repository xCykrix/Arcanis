import { CronJob } from '@cron';
import { Bootstrap } from '../../../mod.ts';
import { AsyncInitializable } from '../../generic/initializable.ts';
import { KVC } from '../../kvc/kvc.ts';
import { Optic } from '../../util/optic.ts';
import DispatchAlertMessage from '../dispatchAlertMessage.ts';

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        const getReactions = await KVC.appd.reaction.getMany();
        for (const entry of getReactions.result) {
          // Extract IDs
          const channelId = entry.value.channelId;

          // Fetch Cache
          const channel = await Bootstrap.bot.cache.channels.get(BigInt(channelId));

          // Check for Orphaned Record
          if (channel === undefined) {
            Optic.f.warn('[Task/orphan/pruneMessageReact] Reaction is orphaned, removing from KVC.', {
              guildId: entry.value.guildId,
              channelId,
            });
            await KVC.appd.reaction.delete(entry.id);
            await DispatchAlertMessage.guildAlert({
              guildId: entry.value.guildId,
              message: `Auto Reaction in <#${channelId}> has been pruned due to an orphaned channel record.`,
            });
          }
        }
      },
      waitForCompletion: true,
      start: true,
    });
  }
}
