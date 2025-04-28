import { Bootstrap } from '../mod.ts';
import { createIncidentEvent, optic } from './logging/optic.ts';

export function defaults(): void {
  // Native Startup
  Bootstrap.event.add('ready', async (packet) => {
    const botUser: typeof Bootstrap.bot.transformers.$inferredTypes.user = packet.user;
    optic.info(`[${packet.shardId}] Username: ${botUser.username} | Guilds: ${packet.guilds.length} | Application: ${packet.applicationId} | Session: ${packet.sessionId}.`);

    // Upsert Guild Commands
    await Bootstrap.bot.helpers.upsertGlobalApplicationCommands([]);
    for (const guild of packet.guilds) {
      await Bootstrap.bot.helpers.upsertGuildApplicationCommands(guild, Bootstrap.interaction.values().toArray()).catch((e) => {
        createIncidentEvent(crypto.randomUUID(), 'Failed to upsertGlobalApplicationCommands.', e);
      });
    }
  });
}
