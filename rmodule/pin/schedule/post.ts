import { DatabaseConnector } from '../../../lib/database/database.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { optic } from '../../../lib/logging/optic.ts';
import { Bootstrap } from '../../../mod.ts';
import { PinPostLogic } from '../share/postLogic.ts';

export class StickyPinSchedule extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    setInterval(async () => {
      const iterations = Math.ceil(await DatabaseConnector.appd.pin.count() / 20);

      // Process Configuration to Worker State Controls Control Cache
      for (let i = 0; i < iterations; i++) {
        const paginated = await DatabaseConnector.appd.pin.getMany({
          limit: 20,
          offset: i * 20,
        });
        for (const ent of paginated.result) {
          optic.info(`StickyPinSchedule: Last Message ID=${ent.value.lastMessageId} MessageCount=${ent.value.messages} Timeout=${ent.value.minutes}`);

          // Read Persist State
          const updateLockId = [ent.value.guid, 'updateLock'];
          const lastUpdateAtId = [ent.value.guid, 'lastUpdateAt'];
          let updateLock = await DatabaseConnector.persistd.get<boolean>(updateLockId);
          const lastUpdateAt = await DatabaseConnector.persistd.get<number>(lastUpdateAtId);

          // Calculate Diff for lastUpdateAt
          const diff = Date.now() - (lastUpdateAt.value ?? 0);
          if (updateLock.versionstamp !== null && diff >= (10 * 1000)) {
            await DatabaseConnector.persistd.delete(updateLockId);
          }
          updateLock = await DatabaseConnector.persistd.get<boolean>(updateLockId);
          if (updateLock.versionstamp !== null) {
            optic.info('LockoutTriggerTimer');
            continue;
          }

          const lastUpdateEventsId = [ent.value.guid, 'lastUpdateEvents'];
          const lastUpdateEvents = await DatabaseConnector.persistd.get<number>(lastUpdateEventsId);
          optic.info(`LastUpdateC=${lastUpdateEvents.value}`);

          // State: Immediate Trigger No Message Ever Sent
          if (ent.value.lastMessageId === undefined) {
            optic.info('Never Sent Trigger');
            await PinPostLogic.post(ent.value);
            continue;
          }

          // State: Lazy Check Immediate Trigger Check Internal Message Cache
          if ((lastUpdateEvents.value ?? 0) >= (ent.value.messages ?? 5)) {
            optic.info('LastUpdateEvents Triggered');
            await PinPostLogic.post(ent.value);
            continue;
          }

          // State: Lazy Check Immediate trigger Check Internal Message Last Update Timeout
          if ((lastUpdateEvents.value ?? 0) >= 1 && (diff > (ent.value.minutes ?? 5) * 60 * 1000)) {
            optic.info('LastUpdateEvents Timeout Triggered', diff, (ent.value.minutes ?? 5) * 60 * 1000);
            await PinPostLogic.post(ent.value);
            continue;
          }

          // (Heavy Check): Poll Messages to Verify Consensus.
          const messages = await Bootstrap.bot.helpers.getMessages(ent.value.channelId, {
            after: ent.value.lastMessageId,
            limit: ent.value.messages ?? 5,
          });

          // State: Immediate Trigger by Messages via Consensus API Check.
          if ((messages.length) >= (ent.value.messages ?? 5)) {
            optic.info(`HC Triggered MC=${messages.length}`);
            await PinPostLogic.post(ent.value);
            continue;
          }

          // State: Immediate Trigger by Timeout via Consensus API Check.
          if ((messages.length >= 1) && (diff > ((ent.value.minutes ?? 5) * 60 * 1000))) {
            optic.info(`HC Timeout Triggered MC=${messages.length}`);
            await PinPostLogic.post(ent.value);
            continue;
          }
        }
      }
    }, 5000);
  }
}
