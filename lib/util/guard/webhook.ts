import { Bootstrap } from '../../../mod.ts';
import { createIncidentEvent, optic } from '../helper/optic.ts';

const resolver = new Set<string>();

export async function isWebhookValid(id: string, fromIncidentEvent: boolean = false): Promise<boolean> {
  if (!id) return false;
  if (resolver.has(id)) return false;
  const webhook = await Bootstrap.bot.helpers.getWebhook(id).catch(() => null);
  if (webhook === null) {
    const incident = crypto.randomUUID();
    optic.warn(`Webook ID '${id}' failed to resolve with Discord API. Untracked Incident ID: ${incident}`);
    if (!fromIncidentEvent) {
      await createIncidentEvent(incident, `Unable to resolve Discord Webhook '${id}' with Discord API.`);
    }
    resolver.add(id);
    return false;
  }
  return true;
}
