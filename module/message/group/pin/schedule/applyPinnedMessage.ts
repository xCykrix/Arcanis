import { CronJob } from '@cron';
import type { PermissionStrings } from '@discordeno';
import { AsyncInitializable } from '../../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import DispatchAlertMessage from '../../../../../lib/task/dispatchAlertMessage.ts';
import ScheduleDeleteMessage from '../../../../../lib/task/scheduleDeleteMessage.ts';
import { Permissions } from '../../../../../lib/util/helper/permissions.ts';
import { Optic } from '../../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const pageLength = 20;

    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        const iterations = Math.ceil(await KVC.appd.pin.count() / pageLength);

        // Process Configuration to Worker State Control Cache
        for (let i = 0; i < iterations; i++) {
          const getPinned = await KVC.appd.pin.getMany({
            limit: pageLength,
            offset: i * pageLength,
          });
          for (const entry of getPinned.result) {
            // Timeout
            if (entry.value.lastMessageAt !== undefined) {
              const rejectByLastMessageEvery = Date.now() < (entry.value.lastMessageAt + ((entry.value.every ?? 5) * 1000));
              const rejectByLastMessageWithin = Date.now() - (entry.value.lastMessageAt ?? 0) < (entry.value.within ?? 15) * 1000;
              if (rejectByLastMessageEvery || rejectByLastMessageWithin) {
                Optic.f.debug('[Task/message.pin] Skipped posting due to Date.now() lockout.', {
                  guildId: entry.value.guildId,
                  channelId: entry.value.channelId,
                  lastMessageId: entry.value.lastMessageId,
                });
                continue;
              }
            }

            // Permission Guard
            const channel = await Bootstrap.bot.cache.channels.get(BigInt(entry.value.channelId));
            const guild = await Bootstrap.bot.cache.guilds.get(channel?.guildId!);
            const botMember = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, channel?.guildId!);
            if (channel === undefined || guild === undefined) continue;

            const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY', 'SEND_MESSAGES'];
            if (!Permissions.hasChannelPermissions(guild!, channel.id, botMember!, botPermissions)) {
              Optic.f.warn(`[Task/message.pin] Permissions required for an operation were missing. Skipping sequence.`, {
                guildId: entry.value.guildId,
                channelId: entry.value.channelId,
                lastMessageId: entry.value.lastMessageId,
              });
              await DispatchAlertMessage.guildAlert({
                guildId: channel.guildId!.toString(),
                message: [
                  `Unable to send pinned message in <#${channel.id}> due to one or more missing permissions.`,
                  `Permissions: ${botPermissions.join(' ')}`,
                ].join('\n'),
              });
              continue;
            }

            // (Heavy Check): Poll Messages to Verify Consensus if not eventTriggered.
            let triggered = entry.value.eventTrigger ?? false;
            if (!triggered) {
              const messages = await Bootstrap.bot.helpers.getMessages(entry.value.channelId, {
                after: entry.value.lastMessageId,
                limit: entry.value.every ?? 5,
              }).catch((e) => {
                Optic.f.warn('[Task/message.pin] Failed to Fetch Messages for message check.', {
                  guildId: entry.value.guildId,
                  channelId: entry.value.channelId,
                  lastMessageId: entry.value.lastMessageId,
                  e: e.message,
                });
                return null;
              });
              if (messages === null) continue;
              if (messages.length >= 1) triggered = true;
            }

            if (triggered) {
              // Schedule Deletion on a Trigger
              if (entry.value.lastMessageId) {
                await ScheduleDeleteMessage.schedule({
                  channelId: entry.value.channelId,
                  messageId: entry.value.lastMessageId,
                  reason: 'Pin Module Automation',
                  isOwnMessage: true,
                });
              }

              // Post Message with Schedule Lock
              const sent = await Bootstrap.bot.helpers.sendMessage(entry.value.channelId, {
                content: entry.value.message,
              }).catch((e) => {
                Optic.incident({
                  moduleId: 'task/message.pin',
                  message: `Failed to post message during scheduled task. ${entry.value.guildId}/${entry.value.channelId}`,
                  err: e,
                });
                return null;
              });
              if (sent === null) {
                continue;
              }
              await KVC.appd.pin.updateByPrimaryIndex('channelId', entry.value.channelId, {
                lastMessageId: sent.id.toString(),
                lastMessageAt: sent.timestamp,
                eventTrigger: false,
              });
            }
          }
        }
      },
      errorHandler: (e) => {
        Optic.incident({
          moduleId: 'module.message.pin.schedule.task',
          message: 'Failed to complete the task.',
          err: e as Error ?? new Error('Unknown Error Occurred.'),
        });
      },
      start: true,
      waitForCompletion: true,
    });
  }
}
