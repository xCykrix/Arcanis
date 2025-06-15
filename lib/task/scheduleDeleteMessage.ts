import { CronJob } from '@cron';
import { Bootstrap } from '../../mod.ts';
import { AsyncInitializable } from '../generic/initializable.ts';
import { KVC } from '../kvc/kvc.ts';
import { Optic } from '../util/optic.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const pageLength = 50;

    CronJob.from({
      cronTime: '*/1 * * * * *',
      onTick: async () => {
        const iterations = Math.ceil(await KVC.persistd.consumer.countBySecondaryIndex('queueTaskConsume', 'global.scheduleDeleteMessage') / pageLength);

        // Paginate Database Queries
        for (let i = 0; i < iterations; i++) {
          Optic.f.debug(`[Task/global.scheduleDeleteMessage] Consuming sequence page: ${i}.`);
          const getPinned = await KVC.persistd.consumer.findBySecondaryIndex('queueTaskConsume', 'global.scheduleDeleteMessage', {
            limit: pageLength,
            offset: i * pageLength,
          });
          for (const entry of getPinned.result) {
            const channelId = entry.value.parameter.get('channelId');
            const messageId = entry.value.parameter.get('messageId');
            const reason = entry.value.parameter.get('reason') ?? 'Unspecified';
            const after = parseInt(entry.value.parameter.get('after') ?? '0');

            if (channelId === undefined || messageId === undefined) continue;
            if (after !== 0 && Date.now() < after) continue;

            // Delete Message
            Optic.f.debug(`[Task/global.scheduleDeleteMessage] Consuming deletion of ${channelId}/${messageId} on sequence page ${i}.`);
            const deleted = await Bootstrap.bot.helpers.deleteMessage(channelId, messageId, reason).catch((e) => {
              Optic.f.warn('[Task/global.scheduleDeleteMessage] Failed to delete message due to Discord API Error.', {
                message: e.message,
              });
              entry.value._failedConsumeAttempts = (entry.value._failedConsumeAttempts ?? 0) + 1;
              KVC.persistd.consumer.update(entry.id, {
                _failedConsumeAttempts: entry.value._failedConsumeAttempts,
              });
              return null;
            });

            // Handle Failed Consume Attempts
            if ((entry.value._failedConsumeAttempts ?? 0) >= 2) {
              Optic.f.warn(`[Task/global.scheduleDeleteMessage] Failed deletion of ${channelId}/${messageId}. Removing consumer for invalid API inquiries.`);
            } else if (deleted === null) {
              continue;
            }

            // Delete Entry from Consumer
            await KVC.persistd.consumer.delete(entry.id);

            // Rate Limit Inhibitor
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
      },
      errorHandler: (e) => {
        Optic.incident({
          moduleId: 'global.scheduleDeleteMessage',
          message: 'Failed to complete the global.scheduleDeleteMessage task.',
          err: e as Error ?? new Error('Unknown Error Occurred.'),
        });
      },
      start: true,
      waitForCompletion: true,
    });
  }
}
