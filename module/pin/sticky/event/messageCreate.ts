import { DenoKvCommitError, DenoKvCommitResult } from '@kvdex';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../../mod.ts';
import { PinStickyMessageLogic } from '../logic/pinStickyMessageLogic.ts';

export default class extends AsyncInitializable {
  private database = DatabaseConnector.persistd['kv'] as Deno.Kv;

  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;
      const guid = GUID.makeVersion1GUID({
        module: 'pin.sticky',
        guildId: message.guildId.toString(),
        channelId: message.channelId.toString(),
      });
      const fetchByPrimary = await DatabaseConnector.appd.pin.findByPrimaryIndex('guid', guid);
      if (fetchByPrimary === null) return;

      let result: DenoKvCommitResult | DenoKvCommitError | null = null;
      let fetch = await this.database.get<number>(['counter', guid]);

      // Atomic Commit the Event
      while (result === null || result?.ok === false) {
        fetch = await this.database.get<number>(['counter', guid]);
        result = await this.database.atomic()
          .check({ key: fetch.key, versionstamp: fetch.versionstamp })
          .set(fetch.key, (fetch.value ?? 0) + 1)
          .commit();
      }

      // Post Event
      if (((fetch.value ?? 0) + 1) >= (fetchByPrimary.value.every ?? 5)) {
        PinStickyMessageLogic.post(guid, fetchByPrimary.value, true);
      }
    });
  }
}
