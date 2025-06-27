import { CronJob } from '@cron';
import type { PermissionStrings } from '@discordeno';
import { Bootstrap } from '../../mod.ts';
import { AsyncInitializable } from '../generic/initializable.ts';
import { KVC } from '../kvc/kvc.ts';
import { Permissions } from '../util/helper/permissions.ts';
import { Optic } from '../util/optic.ts';
import DispatchAlertMessage from './dispatchAlertMessage.ts';

export default class ScheduleDeleteMessage extends AsyncInitializable {
  public static async schedule(passthrough: {
    channelId: string;
    messageId: string;
    reason?: string;
    isOwnMessage?: boolean;
    after?: number;
  }): Promise<void> {
    await KVC.persistd.consumer.add({
      queueTaskConsume: 'global.scheduleDeleteMessage',
      parameter: new Map([
        ['channelId', passthrough.channelId],
        ['messageId', passthrough.messageId],
        ['reason', passthrough.reason ?? 'Unspecified'],
        ['isOwnMessage', passthrough.isOwnMessage ? 'true' : 'false'],
        ['after', passthrough.after?.toString() ?? '0'],
      ]),
    }, {
      expireIn: 300000,
    });
  }

  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const pageLength = 50;

    CronJob.from({
      cronTime: '*/2 * * * * *',
      onTick: async () => {
        const iterations = Math.ceil(await KVC.persistd.consumer.countBySecondaryIndex('queueTaskConsume', 'global.scheduleDeleteMessage') / pageLength);

        // Paginate Database Queries
        for (let i = 0; i < iterations; i++) {
          Optic.f.debug(`[Task/global.scheduleDeleteMessage] Consuming sequence page: ${i}.`);
          const getConsumers = await KVC.persistd.consumer.findBySecondaryIndex('queueTaskConsume', 'global.scheduleDeleteMessage', {
            limit: pageLength,
            offset: i * pageLength,
          });
          for (const entry of getConsumers.result) {
            const channelId = entry.value.parameter.get('channelId')!;
            const messageId = entry.value.parameter.get('messageId')!;
            const reason = entry.value.parameter.get('reason')!;
            const isOwnMessage = entry.value.parameter.get('isOwnMessage') === 'true' ? true : false;
            const after = parseInt(entry.value.parameter.get('after')!);

            if (channelId === undefined || messageId === undefined) continue;
            if (after !== 0 && Date.now() < after) continue;

            // Permission Guard
            const channel = await Bootstrap.bot.cache.channels.get(BigInt(channelId));
            const guild = await Bootstrap.bot.cache.guilds.get(channel?.guildId!);
            const botMember = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, channel?.guildId!);
            if (channel === undefined || guild === undefined) continue;
            if (botMember === undefined) continue;

            const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL'];
            if (!isOwnMessage) botPermissions.push('MANAGE_MESSAGES');
            if (!Permissions.hasChannelPermissions(guild!, channel.id, botMember!, botPermissions)) {
              Optic.f.warn(`[Task/global.scheduleDeleteMessage] Permissions required for an operation were missing. Removing entry and sending alert to specified guild.`, {
                channelId,
                messageId,
              });
              await DispatchAlertMessage.guildAlert({
                guildId: channel.guildId!.toString(),
                message: [
                  `Unable to delete message in <#${channelId}> due to one or more missing permissions.`,
                  `Permissions: ${botPermissions.join(' ')}`,
                ].join('\n'),
              });
              await await KVC.persistd.consumer.delete(entry.id);
              continue;
            }

            // Delete Message
            Optic.f.debug(`[Task/global.scheduleDeleteMessage] Consuming deletion of ${channelId}/${messageId} on sequence page ${i}.`);
            const deleted = await Bootstrap.bot.helpers.deleteMessage(channelId, messageId, reason).catch((e) => {
              Optic.f.warn('[Task/global.scheduleDeleteMessage] Failed to delete message due to Discord API Error.', {
                message: e.message,
              });
              entry.value._failedConsumeAttempts = (entry.value._failedConsumeAttempts ?? 0) + 1;
              KVC.persistd.consumer.update(entry.id, {
                _failedConsumeAttempts: entry.value._failedConsumeAttempts,
              });
              return null;
            });

            // Handle Failed Consume Attempts
            if ((entry.value._failedConsumeAttempts ?? 0) >= 2) {
              Optic.f.warn(`[Task/global.scheduleDeleteMessage] Failed deletion of ${channelId}/${messageId}. Removing consumer for invalid API inquiries.`);
            } else if (deleted === null) {
              continue;
            }

            // Delete Entry from Consumer
            await KVC.persistd.consumer.delete(entry.id);

            // Rate Limit Inhibitor
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
      },
      errorHandler: (e) => {
        Optic.incident({
          moduleId: 'global.scheduleDeleteMessage',
          message: 'Failed to complete the global.scheduleDeleteMessage task.',
          err: e as Error ?? new Error('Unknown Error Occurred.'),
        });
      },
      start: true,
      waitForCompletion: true,
    });
  }
}
