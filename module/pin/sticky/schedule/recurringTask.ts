import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../../mod.ts';
import { PinStickyMessageLogic } from '../logic/pinStickyMessageLogic.ts';

export default class extends AsyncInitializable {
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
            await PinStickyMessageLogic.post(entry.value.guid, entry.value, false);
            continue;
          }

          // (Heavy Check): Poll Messages to Verify Consensus.
          const messages = await Bootstrap.bot.helpers.getMessages(entry.value.channelId, {
            after: entry.value.lastMessageId,
            limit: entry.value.every ?? 5,
          });

          if (messages.length >= 1) await PinStickyMessageLogic.post(entry.value.guid, entry.value, false);
        }
      }
    }, 5000);
  }
}
