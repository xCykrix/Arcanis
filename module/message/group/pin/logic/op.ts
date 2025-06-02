import { GUID } from '../../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import type { PinModuleConfiguration } from '../../../../../lib/kvc/model/appd/pin.ts';
import { Permissions } from '../../../../../lib/util/helper/permissions.ts';
import { Optic } from '../../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../../mod.ts';

export class MessagePinOp {
  private static database = KVC.persistd['kv'] as Deno.Kv;

  public static async op(pin: PinModuleConfiguration, fromMessageEvent = false): Promise<void> {
    // Date Lockout
    if (!fromMessageEvent && Date.now() - (pin.lastMessageAt ?? 0) < (pin.within ?? 15) * 1000) {
      return;
    }

    // Lock GUID
    const guidLock = GUID.make({
      moduleId: 'message.pin',
      guildId: pin.guildId,
      channelId: pin.channelId,
    });
    const mutex = crypto.randomUUID();

    // Check Lock
    const fetchLock = await KVC.persistd.locks.findByPrimaryIndex('guid', guidLock);
    if (fetchLock?.versionstamp !== undefined) {
      return;
    }

    // Write Lock
    const commit = await KVC.persistd.locks.add({
      guid: guidLock,
      locked: true,
      lockedAt: Date.now(),
      lockoutMutexId: mutex,
    }, {
      expireIn: 2000,
    });
    if (commit.ok === false) {
      Optic.f.debug(`C:${pin.channelId} Failed to commit to lock cache via upsert. Waiting for new trigger. Prevents racing due to GUID being set suddenly.`);
      return;
    }

    // Check Change in Mutex
    const fetchMutexedLock = await KVC.persistd.locks.findByPrimaryIndex('guid', guidLock);
    if (fetchMutexedLock?.value?.lockoutMutexId !== mutex) {
      Optic.f.debug(`C:${pin.channelId} Mutex Guard Triggered. Preventing racing of posting. Waiting to expire or finish before post.`);
      return;
    }

    // Check Bot Permissions
    const guild = await Bootstrap.bot.cache.guilds.get(BigInt(pin.guildId));
    const member = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, BigInt(pin.guildId));
    if (guild === undefined || member === undefined || !Permissions.hasChannelPermissions(guild!, BigInt(pin.channelId), member!, ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY', 'SEND_MESSAGES'])) {
      Optic.f.debug(`C:${pin.channelId} Permissions required for operation were incomplete. Waiting to expire mutex to reduce database burden.`);
      return;
    }

    // Delete Message with Mutex Lock
    if (pin.lastMessageId !== undefined) {
      await Bootstrap.bot.helpers.deleteMessage(pin.channelId, pin.lastMessageId, 'Sticky Message').catch((e) => {
        Optic.f.debug('Failed to delete last pinned message. Already deleted?', pin.lastMessageId, e.stack);
      });
    }

    // Post Message with Mutex Lock
    const sent = await Bootstrap.bot.helpers.sendMessage(pin.channelId, {
      content: pin.message,
    }).catch((e) => {
      Optic.incident({
        moduleId: 'pin.logic.op',
        message: `Failed to post message during mutex. ${pin.guildId}/${pin.channelId}`,
        err: e,
      });
      return null;
    });
    if (sent === null) {
      await KVC.persistd.locks.deleteByPrimaryIndex('guid', guidLock);
      return;
    }

    // Update Last Message ID and Counter
    await KVC.appd.pin.updateByPrimaryIndex('channelId', pin.channelId, {
      lastMessageId: sent.id.toString(),
      lastMessageAt: sent.timestamp,
    });
    await this.database.set(['counter.message.pin', pin.channelId.toString()], 0);
    await KVC.persistd.locks.deleteByPrimaryIndex('guid', guidLock);
  }
}
