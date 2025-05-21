import { Bootstrap } from '../../../mod.ts';
import { Optic } from '../optic.ts';

export class APIWebhookGuard {
  private static resolve = new Map<string, boolean>();

  /**
   * Check if a Webhook is still valid. Locks out for Invalid Requests.
   *
   * @param id The Webhook ID.
   * @param token The Webhook Token.
   * @returns If this is a Valid Webhook.
   */
  public static async valid(id: string, token: string): Promise<boolean> {
    if (id === undefined || token === undefined) return false;
    if (this.resolve.has(id)) return this.resolve.get(id)!;

    const webhook = await Bootstrap.bot.helpers.getWebhookWithToken(id, token).catch((e) => {
      Optic.al.error(`Failed to getWebhookWithToken: ${id}`, e);
      this.resolve.set(id, false);
      return false;
    });

    if (webhook === null) {
      this.resolve.set(id, false);
      return false;
    }

    this.resolve.set(id, true);
    return true;
  }
}
