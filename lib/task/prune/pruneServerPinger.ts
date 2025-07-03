import { CronJob } from '@cron';
import { AsyncInitializable } from '../../generic/initializable.ts';
import { KVC } from '../../kvc/kvc.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        const getServerPingers = await KVC.appd.serverPinger.getMany();
        const getServerPingerMapping = await KVC.appd.pingerChannelMap.getMany();

        for (const entry of getServerPingers.result) {
          entry.value;
        }
      },
      waitForCompletion: true,
      start: true,
    });
  }
}
