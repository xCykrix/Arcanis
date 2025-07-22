import type { CreateSlashApplicationCommand } from '@discordeno';
import { Bootstrap } from '../../../mod.ts';
import { AsyncInitializable } from '../../generic/initializable.ts';
import { Plane } from '../../plane.ts';
import { Optic } from '../../util/optic.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Plane.event.add('ready', async (packet) => {
      const bot: typeof Bootstrap.bot.transformers.$inferredTypes.user = packet.user;
      Optic.f.info(`[${packet.shardId}] Username: ${bot.username} | Guilds: ${packet.guilds.length} | Application: ${packet.applicationId} | Session: ${packet.sessionId}.`);

      // Upsert Global Schema
      await Bootstrap.bot.helpers.upsertGlobalApplicationCommands(Plane.injection.schema.values().toArray() as CreateSlashApplicationCommand[]).catch((e) => {
        Optic.incident({
          moduleId: 'OnReadyEvent',
          message: 'Failed to upsertGlobalApplicationCommands.',
          err: e,
        });
      });
    });
  }
}
