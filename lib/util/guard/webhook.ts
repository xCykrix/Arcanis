import { Bootstrap } from '../../../mod.ts';
import { createIncidentEvent, optic } from '../../logging/optic.ts';

const resolver = new Set<string>();

/**
 * Check if a Webhook is still valid. Locks out for Invalid Requests.
 * @param id The Webhook ID.
 * @param token The Webhook Token.
 * @param fromIncidentEvent If this was from a Incident Event.
 * @returns If this is a Valid Webhook.
 */
export async function isWebhookValid(id: string, token: string, fromIncidentEvent: boolean = false): Promise<boolean> {
  if (!id) return false;
  if (resolver.has(id)) return false;
  const webhook = await Bootstrap.bot.helpers.getWebhookWithToken(id, token).catch((e) => {
    optic.error(e);
    return null;
  });
  if (webhook === null) {
    const incident = crypto.randomUUID();
    optic.warn(`Webook ID '${id}' failed to resolve with Discord API. Incident ID: ${incident}`);
    if (!fromIncidentEvent) {
      await createIncidentEvent(incident, `Unable to resolve Discord Webhook '${id}' with Discord API.`);
    }
    resolver.add(id);
    return false;
  }
  return true;
}
