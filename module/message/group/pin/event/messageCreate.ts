import type { DenoKvCommitError, DenoKvCommitResult } from '@kvdex';
import { AsyncInitializable } from '../../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import { Optic } from '../../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../../mod.ts';
import { MessagePinOp } from '../logic/op.ts';

export default class extends AsyncInitializable {
  private database = KVC.persistd['kv'] as Deno.Kv;

  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.author.id === Bootstrap.bot.id) return;
      if (message.guildId === undefined) return;

      const kvFind = await KVC.appd.pin.findByPrimaryIndex('channelId', message.channelId.toString());
      if (kvFind?.versionstamp === undefined) return;

      let result: DenoKvCommitResult | DenoKvCommitError | null = null;
      let fetch!: Deno.KvEntryMaybe<number>;

      // Atomic Commit the Event
      while (result === null || result?.ok === false) {
        fetch = await this.database.get<number>(['counter.message.pin', message.channelId.toString()]);
        result = await this.database.atomic()
          .check({ key: fetch.key, versionstamp: fetch.versionstamp })
          .set(fetch.key, (fetch.value ?? 0) + 1)
          .commit();
      }

      if ((fetch?.value ?? 0) + 1 >= (kvFind.value.every ?? 5)) {
        MessagePinOp.op(kvFind.value, true).catch((e) => {
          Optic.f.warn('Failed to process pin event from messageCreate handler.', e);
        });
      }
    });
  }
}
