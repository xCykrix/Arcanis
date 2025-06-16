import { CronJob } from '@cron';
import type { PermissionStrings } from '@discordeno';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    CronJob.from({
      cronTime: '0 * * * *',
      onTick: async () => {
        const alerts = await KVC.persistd.alert.getMany();
        const getConsumers = await KVC.persistd.consumer.findBySecondaryIndex('queueTaskConsume', 'dev.alert.immediateMessage');
        for (const entry of getConsumers.result) {
          const channelId = entry.value.parameter.get('channelId');
          const message = entry.value.parameter.get('alert');

          // Guard Execution
          if (channelId === undefined) continue;

          // Permission Guard
          const channel = await Bootstrap.bot.cache.channels.get(BigInt(channelId));
          const guild = await Bootstrap.bot.cache.guilds.get(channel?.guildId!);
          const botMember = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, channel?.guildId!);
          if (channel === undefined || guild === undefined) continue;
          if (botMember === undefined) continue;

          const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'SEND_MESSAGES'];
          if (!Permissions.hasChannelPermissions(guild!, channel.id, botMember!, botPermissions)) {
            Optic.f.warn(`[Task/global.dev.alert.immediateMessage] Permissions required for an operation were missing. Unable to consume dispatched alert.`, {
              channelId,
            });
            continue;
          }

          // Dispatch Alert
          await KVC.persistd.consumer.delete(entry.id);
          // TODO: SEND MESSAGgiE
        }

        // X OLD CODE
        // const alerts = await KVC.persistd.alert.getMany();
        for (const alert of alerts.result) {
          const consumedDispatch = await KVC.persistd.consumedDispatchedAlert.findBySecondaryIndex('dispatchEventId', entry.value.dispatchEventId, {
            filter: (v) => v.value.guildId === alert.value.guildId,
          });
          if (consumedDispatch.result.length === 0) {
            // Write a Dispatch Notice
            await KVC.persistd.consumedDispatchedAlert.add({
              guildId: alert.value.guildId,
              dispatchEventId: entry.value.dispatchEventId,
            }, {
              expireIn: 1800000,
            });

            // Send Message
            Optic.f.info('[Dev/Alert] Global alert has been consumed.', {
              guildId: alert.value.guildId,
              channelId: alert.value.toChannelId,
            });
            await Bootstrap.bot.helpers.sendMessage(channel.id, {
              embeds: Responses.success.make()
                .setDescription(entry.value.message),
            }).catch((e) => {
              Optic.f.warn('[Dev/Alert] Unable to send alert due to Discord API Error', {
                guildId: alert.value.guildId,
                channelId: alert.value.toChannelId,
                e,
              });
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      },
    });
  }
}
