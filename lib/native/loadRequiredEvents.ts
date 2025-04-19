import { Bootstrap } from '../../mod.ts';
import { createIncidentEvent, optic } from '../util/helper/optic.ts';

export function loadRequiredEvents(): void {
  // Native Startup
  Bootstrap.event.add('ready', async (packet) => {
    const botUser: typeof Bootstrap.bot.transformers.$inferredTypes.user = packet.user;
    optic.info(`[${packet.shardId}] Username: ${botUser.username} | Guilds: ${packet.guilds.length} | Application: ${packet.applicationId} | Session: ${packet.sessionId}.`);

    await Bootstrap.bot.helpers.upsertGlobalApplicationCommands(Bootstrap.interaction.values().toArray()).catch((e) => {
      createIncidentEvent(crypto.randomUUID(), 'Failed to upsertGlobalApplicationCommands.', e);
    });
  });

  // // Native Guild Handler
  // Bootstrap.event.add('guildCreate', async (guild) => {
  // });
}
