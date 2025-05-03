import type { DenoKvCommitError, DenoKvCommitResult } from '@kvdex';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalPinModuleConfigurationId } from '../../../lib/database/model/pin.model.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../mod.ts';

export class MessageCreateEvent extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;

      let result: DenoKvCommitResult | DenoKvCommitError | null = null;
      while (!result || !result.ok) {
        // Check if Exists
        const fetchByPrimary = await DatabaseConnector.appd.pin.findByPrimaryIndex(
          'guid',
          makeGlobalPinModuleConfigurationId(message.guildId.toString(), message.channelId.toString()),
        );
        if (fetchByPrimary === null) return;
        if (message.author.id === Bootstrap.bot.id && fetchByPrimary.value.message === message.content) return;

        const lastUpdateEventsId = [fetchByPrimary.value.guid, 'lastUpdateEvents'];
        const lastUpdateEvents = await DatabaseConnector.persistd.get<number>(lastUpdateEventsId);
        const write = (lastUpdateEvents.value ?? 0) + 1;
        result = await DatabaseConnector.persistd.atomic()
          .check({ key: lastUpdateEventsId, versionstamp: lastUpdateEvents.versionstamp })
          .set(lastUpdateEventsId, write, { expireIn: ((fetchByPrimary.value.minutes ?? 5) * 6000) + 120000 })
          .commit();
      }
    });
  }
}
