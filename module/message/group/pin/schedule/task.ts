import { CronJob } from '@cron';
import { AsyncInitializable } from '../../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import { Optic } from '../../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../../mod.ts';
import { MessagePinOp } from '../logic/op.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const pageLength = 20;

    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        const iterations = Math.ceil(await KVC.appd.pin.count() / pageLength);

        // Process Configuration to Worker State Control Cache
        for (let i = 0; i < iterations; i++) {
          const getPinned = await KVC.appd.pin.getMany({
            limit: pageLength,
            offset: i * pageLength,
          });
          for (const entry of getPinned.result) {
            // State: Immediate Trigger No Message Ever Sent
            if (entry.value.lastMessageId === undefined) {
              await MessagePinOp.op(entry.value, false);
              continue;
            }

            // Timeout
            if (entry.value.lastMessageAt !== undefined && (Date.now() < (entry.value.lastMessageAt + ((entry.value.every ?? 5) * 1000)))) {
              return;
            }

            // TODO: Permission Check

            // (Heavy Check): Poll Messages to Verify Consensus.
            const messages = await Bootstrap.bot.helpers.getMessages(entry.value.channelId, {
              after: entry.value.lastMessageId,
              limit: entry.value.every ?? 5,
            }).catch((e) => {
              Optic.f.warn('Failed to Fetch Messages for Pin Message Scheduler.', e);
              return null;
            });
            if (messages === null) continue;
            if (messages.length >= 1) await MessagePinOp.op(entry.value, false);
          }
        }
      },
      errorHandler: (e) => {
        Optic.incident({
          moduleId: 'module.message.pin.schedule.task',
          message: 'Failed to complete the task.',
          err: e as Error ?? new Error('Unknown Error Occurred.'),
        });
      },
      start: true,
      waitForCompletion: true,
    });
  }
}
