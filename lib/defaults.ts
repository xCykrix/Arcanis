import { Bootstrap } from '../mod.ts';
import { AsyncInitializable } from './generic/initializable.ts';
import { Optic } from './util/optic.ts';

export class Defaults extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('ready', async (packet) => {
      const botUser: typeof Bootstrap.bot.transformers.$inferredTypes.user = packet.user;
      Optic.f.info(`[${packet.shardId}] Username: ${botUser.username} | Guilds: ${packet.guilds.length} | Application: ${packet.applicationId} | Session: ${packet.sessionId}.`);

      // Upsert Guild Commands
      await Bootstrap.bot.helpers.upsertGlobalApplicationCommands(Bootstrap.globalChatInputInteraction.values().toArray()).catch((e) => {
        Optic.incident({
          moduleId: 'Defaults',
          message: 'Failed to upsertGlobalApplicationCommands.',
          err: e,
        });
      });
      for (const guild of packet.guilds) {
        await Bootstrap.bot.helpers.upsertGuildApplicationCommands(guild, Bootstrap.guildChatInputInteraction.values().toArray()).catch((e) => {
          Optic.incident({
            moduleId: 'Defaults',
            message: 'Failed to upsertGuildApplicationCommands.',
            err: e,
          });
        });
      }
    });
  }
}
