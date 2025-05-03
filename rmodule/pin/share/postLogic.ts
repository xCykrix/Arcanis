import type { DenoKvCommitError, DenoKvCommitResult } from '@kvdex';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import type { PinModuleConfiguration } from '../../../lib/database/model/pin.model.ts';
import { optic } from '../../../lib/logging/optic.ts';
import { hasChannelPermissions } from '../../../lib/util/helper/permissions.ts';
import { Bootstrap } from '../../../mod.ts';

export class PinPostLogic {
  private static async enforcePermissions(configuration: PinModuleConfiguration): Promise<boolean> {
    const guild = await Bootstrap.bot.cache.guilds.get(BigInt(configuration.guildId));
    const member = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, BigInt(configuration.guildId));
    if (guild === undefined || member === undefined) {
      optic.warn('BadState-deleteandPost: guild or member is not defined to check permissions.', guild?.id, member?.id);
      return false;
    }
    return hasChannelPermissions(guild!, BigInt(configuration.channelId), member, ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY', 'SEND_MESSAGES', 'MANAGE_MESSAGES']);
  }

  public static async post(configuration: PinModuleConfiguration): Promise<void> {
    if (await this.enforcePermissions(configuration)) {
      // Enforce a Lock to Message
      let result: DenoKvCommitResult | DenoKvCommitError | null = null;
      while (!result || !result.ok) {
        // Read Persist State
        const updateLockId = [configuration.guid, 'updateLock'];
        const lastUpdateAtId = [configuration.guid, 'lastUpdateAt'];
        const updateLock = await DatabaseConnector.persistd.get<boolean>(updateLockId);
        result = await DatabaseConnector.persistd.atomic()
          .check({ key: updateLockId, versionstamp: updateLock.versionstamp })
          .set(updateLockId, true, { expireIn: 10000 })
          .set(lastUpdateAtId, Date.now(), { expireIn: ((configuration.minutes ?? 5) * 6000) + 120000 })
          .commit();
      }

      // Delete Message
      if (configuration.lastMessageId) {
        await Bootstrap.bot.helpers.deleteMessage(configuration.channelId, configuration.lastMessageId).catch(() => {});
      }

      // Send Message
      const message = await Bootstrap.bot.helpers.sendMessage(configuration.channelId, {
        content: configuration.message,
      });

      // Write State and Force Lock for Cooldown
      await DatabaseConnector.appd.pin.updateByPrimaryIndex('guid', configuration.guid, {
        lastMessageId: message.id.toString(),
      });

      const lastUpdateEventsId = [configuration.guid, 'lastUpdateEvents'];
      await DatabaseConnector.persistd.set(lastUpdateEventsId, 0, { expireIn: ((configuration.minutes ?? 5) * 6000) + 120000 });
    }
  }
}
