import { CronJob } from '@cron';
import type { PermissionStrings } from '@discordeno';
import { Bootstrap } from '../../mod.ts';
import { AsyncInitializable } from '../generic/initializable.ts';
import { KVC } from '../kvc/kvc.ts';
import { Permissions } from '../util/helper/permissions.ts';
import { Optic } from '../util/optic.ts';
import DispatchAlertMessage from './dispatchAlertMessage.ts';

export default class AddReactionToMessage extends AsyncInitializable {
  public static async queue(passthrough: {
    channelId: string;
    messageId: string;
    reactions: string[];
  }): Promise<void> {
    for (const reaction of passthrough.reactions) {
      await KVC.persistd.consumer.add({
        queueTaskConsume: 'global.addReactionToMessage',
        parameter: new Map([
          ['channelId', passthrough.channelId],
          ['messageId', passthrough.messageId],
          ['reaction', reaction],
        ]),
      }, {
        expireIn: 300000,
      });
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5) + 1));
    }
  }

  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const pageLength = 20;

    CronJob.from({
      cronTime: '*/1 * * * * *',
      onTick: async () => {
        const iterations = Math.ceil(await KVC.persistd.consumer.countBySecondaryIndex('queueTaskConsume', 'global.addReactionToMessage') / pageLength);
        const failedMessageIds: string[] = [];

        // Paginate Database Queries
        for (let i = 0; i < (iterations > 5 ? 5 : iterations); i++) {
          Optic.f.debug(`[Task/global.addReactionToMessage] Consuming sequence page: ${i}.`);
          const getConsumers = await KVC.persistd.consumer.findBySecondaryIndex('queueTaskConsume', 'global.addReactionToMessage', {
            limit: pageLength,
            offset: i * pageLength,
          });
          for (const entry of getConsumers.result) {
            const channelId = entry.value.parameter.get('channelId');
            const messageId = entry.value.parameter.get('messageId');
            const reaction = entry.value.parameter.get('reaction');
            if (channelId === undefined || messageId === undefined) continue;
            if (reaction === undefined) continue;

            // Skip consume if previous iteration had a failed addition. Helps to assure order.
            if (failedMessageIds.includes(messageId)) {
              Optic.f.debug(`[Task/global.addReactionToMessage] Skipped ${channelId}/${messageId} due to previous API error in ordered sequence.`);
            }

            // Permission Guard
            const channel = await Bootstrap.bot.cache.channels.get(BigInt(channelId));
            const guild = await Bootstrap.bot.cache.guilds.get(channel?.guildId!);
            const botMember = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, channel?.guildId!);
            if (channel === undefined || guild === undefined) continue;
            if (botMember === undefined) continue;

            const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'ADD_REACTIONS'];
            if (!Permissions.hasChannelPermissions(guild!, channel.id, botMember!, botPermissions)) {
              Optic.f.warn(`[Task/global.addReactionToMessage] Permissions required for an operation were missing. Removing entry and sending alert to specified guild.`, {
                channelId,
                messageId,
              });
              await DispatchAlertMessage.guildAlert({
                guildId: channel.guildId!.toString(),
                message: [
                  `Unable to add reaction for message in <#${channelId}> due to one or more missing permissions.`,
                  `Permissions: ${botPermissions.join(' ')}`,
                ].join('\n'),
              });
              await KVC.persistd.consumer.delete(entry.id);
              continue;
            }

            // React to Message Message
            Optic.f.debug(`[Task/global.addReactionToMessage] Consuming adding reaction to ${channelId}/${messageId} on sequence page ${i}. Reaction: ${reaction}`);
            const deleted = await Bootstrap.bot.helpers.addReaction(channelId, messageId, reaction).catch((e) => {
              Optic.f.warn('[Task/global.addReactionToMessage] Failed to add reaction to message due to Discord API Error.', {
                message: e.message,
              });
              entry.value._failedConsumeAttempts = (entry.value._failedConsumeAttempts ?? 0) + 1;
              failedMessageIds.push(messageId);
              KVC.persistd.consumer.update(entry.id, {
                _failedConsumeAttempts: entry.value._failedConsumeAttempts,
              });
              return null;
            });

            // Handle Failed Consume Attempts
            if ((entry.value._failedConsumeAttempts ?? 0) >= 2) {
              Optic.f.warn(`[Task/global.addReactionToMessage] Failed to add reaction twice in ${channelId}/${messageId}. Removing consumer for invalid API inquiries.`);
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
          moduleId: 'global.addReactionToMessage',
          message: 'Failed to complete the global.addReactionToMessage task.',
          err: e as Error ?? new Error('Unknown Error Occurred.'),
        });
      },
      start: true,
      waitForCompletion: true,
    });
  }
}
