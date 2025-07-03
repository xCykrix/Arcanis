import { CronJob } from '@cron';
import { Bootstrap } from '../../../mod.ts';
import { AsyncInitializable } from '../../generic/initializable.ts';
import { KVC } from '../../kvc/kvc.ts';
import { Optic } from '../../util/optic.ts';
import DispatchAlertMessage from '../dispatchAlertMessage.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        const getForwarders = await KVC.appd.forward.getMany();
        for (const entry of getForwarders.result) {
          // Extract IDs
          const fromChannelId = entry.value.fromChannelId;
          const toChannelId = entry.value.toChannelId;

          // Fetch Cache
          const fromChannel = await Bootstrap.bot.cache.channels.get(BigInt(fromChannelId));
          const toChannel = await Bootstrap.bot.cache.channels.get(BigInt(toChannelId));

          // Check for Orphaned Record
          if (fromChannel === undefined || toChannel === undefined) {
            Optic.f.warn('[Task/orphan/pruneMessageForward] Forwarder is orphaned, removing from KVC.', {
              guildId: entry.value.guildId,
              fromChannelId,
              toChannelId,
            });
            await DispatchAlertMessage.guildAlert({
              guildId: entry.value.guildId,
              message: `Forwarder from <#${fromChannelId}> to <#${toChannelId}> has been pruned due to an orphaned channel records.`,
            });
            await KVC.appd.forward.delete(entry.id);
          }
        }
      },
      waitForCompletion: true,
      start: true,
    });
  }
}
