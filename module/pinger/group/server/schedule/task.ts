import { AsyncInitializable } from '../../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import { Bootstrap } from '../../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const pageLength = 5;

    setInterval(async () => {
      const iterations = Math.ceil(await KVC.persistd.consumer.countBySecondaryIndex('queueTaskConsume', 'pinger.group.server.autoDelete') / pageLength);

      // Process Configuration to Worker State Controls Control Cache
      for (let i = 0; i < iterations; i++) {
        const getPinned = await KVC.persistd.consumer.findBySecondaryIndex('queueTaskConsume', 'pinger.group.server.autoDelete', {
          limit: pageLength,
          offset: i * pageLength,
        });
        for (const entry of getPinned.result) {
          const channelId = entry.value.parameter.get('channelId');
          const messageId = entry.value.parameter.get('messageId');
          if (channelId === undefined || messageId === undefined) continue;

          // Delete Message
          await Bootstrap.bot.helpers.deleteMessage(channelId, messageId);

          // 
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
        // for (const entry of getPinned.result) {
        //   // State: Immediate Trigger No Message Ever Sent
        //   if (entry.value.lastMessageId === undefined) {
        //     await MessagePinOp.op(entry.value, false);
        //     continue;
        //   }

        //   // Timeout
        //   if (entry.value.lastMessageAt !== undefined && (Date.now() < (entry.value.lastMessageAt + ((entry.value.every ?? 5) * 1000)))) {
        //     return;
        //   }

        //   // (Heavy Check): Poll Messages to Verify Consensus.
        //   const messages = await Bootstrap.bot.helpers.getMessages(entry.value.channelId, {
        //     after: entry.value.lastMessageId,
        //     limit: entry.value.every ?? 5,
        //   }).catch((e) => {
        //     Optic.f.warn('Failed to Fetch Messages for Pin Message Scheduler.', e);
        //     return null;
        //   });
        //   if (messages === null) continue;
        //   if (messages.length >= 1) await MessagePinOp.op(entry.value, false);
        // }
      }
    }, 15000);
  }
}
