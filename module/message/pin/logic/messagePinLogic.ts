import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import type { PinModuleConfiguration } from '../../../../lib/database/model/pin.model.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { createIncidentEvent, optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';

export class MessagePinLogic {
  private static database = DatabaseConnector.persistd['kv'] as Deno.Kv;

  public static async post(guid: string, pin: PinModuleConfiguration, fromMessageEvent = false): Promise<void> {
    // Date Lockout
    if (!fromMessageEvent && Date.now() - (pin.lastMessageAt ?? 0) < (pin.within ?? 15) * 1000) {
      optic.debug(`C:${pin.channelId} Date Lockout Guard Triggered. Too soon for schedule.`);
      return;
    }

    // Lock GUID
    const guidLock = GUID.makeVersion1GUID({
      module: 'pin.sticky',
      guildId: pin.guildId,
      channelId: pin.channelId,
    });
    const mutex = crypto.randomUUID();

    // Check Lock
    const fetchLock = await DatabaseConnector.persistd.locks.findByPrimaryIndex('guid', guidLock);
    if (fetchLock?.versionstamp !== undefined) {
      optic.debug(`C:${pin.channelId} Lockout Guard Triggered (Sticky). Must expire before post.`);
      return;
    }

    // Write Lock
    const commit = await DatabaseConnector.persistd.locks.add({
      guid: guidLock,
      locked: true,
      lockedAt: Date.now(),
      mutex,
    }, {
      expireIn: 10000,
    });
    if (commit.ok === false) {
      optic.debug(`C:${pin.channelId} Failed to commit to lock cache via upsert. Waiting for new trigger. Prevents racing due to GUID being set suddenly.`);
      return;
    }

    // Check Change in Mutex
    const fetchMutexedLock = await DatabaseConnector.persistd.locks.findByPrimaryIndex('guid', guidLock);
    if (fetchMutexedLock?.value?.mutex !== mutex) {
      optic.debug(`C:${pin.channelId} Mutex Guard Triggered. Preventing racing of posting. Waiting to expire or finish before post.`);
      return;
    }

    // Check Bot Permissions
    const guild = await Bootstrap.bot.cache.guilds.get(BigInt(pin.guildId));
    const member = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, BigInt(pin.guildId));
    if (guild === undefined || member === undefined || !hasChannelPermissions(guild!, BigInt(pin.channelId), member!, ['SEND_MESSAGES'])) {
      optic.debug(`C:${pin.channelId} Permission Denied to SEND_MESSAGES. Waiting to expire mutex to reduce database burden.`);
      return;
    }

    // Delete Message with Mutex Lock
    if (pin.lastMessageId !== undefined) {
      const deleted = await Bootstrap.bot.helpers.deleteMessage(pin.channelId, pin.lastMessageId, 'Sticky Message').catch((e) => {
        optic.debug('failed to delete last pinned message. Waiting...', pin.lastMessageId, e.stack);
        return null;
      });
      if (deleted === null) return;
    }

    // Post Message with Mutex Lock
    const sent = await Bootstrap.bot.helpers.sendMessage(pin.channelId, {
      content: pin.message,
    }).catch((e) => {
      createIncidentEvent(mutex, 'Mutex Event - Unable to Post Message for Sticky Pin', e);
      return null;
    });
    if (sent === null) {
      return;
    }

    // Update Last Message ID and Counter
    await DatabaseConnector.appd.pin.updateByPrimaryIndex('guid', guid, {
      lastMessageId: sent.id.toString(),
      lastMessageAt: sent.timestamp,
    });

    // Clear Counter
    await this.database.set(['counter', guid], 0);

    // Delete Mutex Lock
    await DatabaseConnector.persistd.locks.deleteByPrimaryIndex('guid', guidLock);
  }
}
