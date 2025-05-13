import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { createIncidentEvent } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';
import { MessagePinLogic } from '../logic/messagePinLogic.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    setInterval(async () => {
      const iterations = Math.ceil(await DatabaseConnector.appd.pin.count() / 20);

      // Process Configuration to Worker State Controls Control Cache
      for (let i = 0; i < iterations; i++) {
        const fetchStickyPin = await DatabaseConnector.appd.pin.getMany({
          limit: 20,
          offset: i * 20,
        });
        for (const entry of fetchStickyPin.result) {
          // State: Immediate Trigger No Message Ever Sent
          if (entry.value.lastMessageId === undefined) {
            await MessagePinLogic.post(entry.value.guid, entry.value, false);
            continue;
          }

          // (Heavy Check): Poll Messages to Verify Consensus.
          const messages = await Bootstrap.bot.helpers.getMessages(entry.value.channelId, {
            after: entry.value.lastMessageId,
            limit: entry.value.every ?? 5,
          }).catch((e) => {
            createIncidentEvent(crypto.randomUUID(), 'Failed to Fetch Messages for Pin Message Scheduler.', e);
            return null;
          });
          if (messages === null) continue;

          if (messages.length >= 1) await MessagePinLogic.post(entry.value.guid, entry.value, false);
        }
      }
    }, 5000);
  }
}
