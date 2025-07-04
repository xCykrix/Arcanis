import { CronJob } from '@cron';
import { AsyncInitializable } from '../../generic/initializable.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
      },
    });
  }
}
