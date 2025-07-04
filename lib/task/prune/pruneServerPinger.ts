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
        const getServerPingerMapping = await KVC.appd.pingerChannelMap.getMany();
        for (const entry of getServerPingerMapping.result) {
          // Extract IDs
          const channelId = entry.value.channelId;

          // Fetch Cache
          const channel = await Bootstrap.bot.cache.channels.get(BigInt(channelId));

          // Check for Orphaned Record
          if (channel === undefined) {
            // Fetch Server Pinger
            const pinger = await KVC.appd.serverPinger.findByPrimaryIndex('guid', entry.value.guidOfPinger);

            // If Pinger is not found, we can safely remove the orphaned channel record anyways.
            if (pinger?.versionstamp === undefined) {
              Optic.f.warn('[Task/orphan/pruneServerPinger] Pinger association found, but no parent pinger was found.', {
                guildId: entry.value.guidOfPinger,
                channelId,
              });
              await DispatchAlertMessage.guildAlert({
                guildId: entry.value.guidOfPinger,
                message: `Pinger association found for <#${channelId}> but the parent pinger was not found. This should not have happened.`,
              });
              await KVC.appd.pingerChannelMap.delete(entry.id);
              continue;
            }

            // Clear Orphaned Record
            Optic.f.warn('[Task/orphan/pruneServerPinger] Pinger association is orphaned, removing from KVC.', {
              guildId: entry.value.guidOfPinger,
              channelId,
            });
            await DispatchAlertMessage.guildAlert({
              guildId: entry.value.guidOfPinger,
              message: `Pinger association for **${pinger.value.name}** <#${channelId}> has been pruned due to an orphaned channel record.`,
            });
            await KVC.appd.pingerChannelMap.delete(entry.id);
          }
        }
      },
      waitForCompletion: true,
      start: true,
    });
  }
}
