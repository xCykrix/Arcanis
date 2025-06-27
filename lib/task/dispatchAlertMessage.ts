import { CronJob } from '@cron';
import type { PermissionStrings } from '@discordeno';
import { Bootstrap } from '../../mod.ts';
import { AsyncInitializable } from '../generic/initializable.ts';
import { GUID } from '../kvc/guid.ts';
import { KVC } from '../kvc/kvc.ts';
import { Permissions } from '../util/helper/permissions.ts';
import { Responses } from '../util/helper/responses.ts';
import { Optic } from '../util/optic.ts';

export default class DispatchAlertMessage extends AsyncInitializable {
  public static async guildAlert(passthrough: {
    guildId: string;
    message: string;
  }): Promise<void> {
    const alert = await KVC.persistd.alert.findByPrimaryIndex('guildId', passthrough.guildId);
    if (alert?.versionstamp === undefined) return;

    await KVC.persistd.consumer.add({
      queueTaskConsume: 'global.dispatchAlertMessage',
      parameter: new Map([
        ['dispatchId', crypto.randomUUID()],
        ['channelId', alert.value.toChannelId],
        ['message', passthrough.message],
      ]),
    });
  }
  public static async globalAlert(passthrough: {
    message: string;
  }): Promise<void> {
    const alerts = await KVC.persistd.alert.getMany();
    for (const alert of alerts.result ?? []) {
      await KVC.persistd.consumer.add({
        queueTaskConsume: 'global.dispatchAlertMessage',
        parameter: new Map([
          ['dispatchId', crypto.randomUUID()],
          ['channelId', alert.value.toChannelId],
          ['message', passthrough.message],
        ]),
      }, {
        expireIn: 300000,
      });
    }
  }

  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    CronJob.from({
      cronTime: '*/5 * * * * *',
      onTick: async () => {
        const getConsumers = await KVC.persistd.consumer.findBySecondaryIndex('queueTaskConsume', 'global.dispatchAlertMessage');
        for (const entry of getConsumers.result) {
          const dispatchId = entry.value.parameter.get('dispatchId')!;
          const channelId = entry.value.parameter.get('channelId')!;

          // Check Evaluation
          const guid = GUID.make({
            moduleId: 'dev.alert.immediateMessage:queueTaskConsume',
            channelId,
            constants: [
              dispatchId,
            ],
          });
          const locks = await KVC.persistd.locks.findByPrimaryIndex('guid', guid);
          if (locks?.value.lockedAt !== undefined) continue;

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

          // Write to Lock
          await KVC.persistd.locks.add({
            guid,
            locked: true,
            lockedAt: Date.now(),
          }, {
            expireIn: 900000,
          });

          // Get Alert
          const message = entry.value.parameter.get('message');

          // Dispatch Alert to Channel
          Optic.f.info(`[Task/global.dev.alert.immediateMessage] Consumed dispatched request.`, {
            dispatchId,
            guildId: channel.guildId!,
            channelId,
          });

          await Bootstrap.bot.helpers.sendMessage(channel.id, {
            embeds: Responses.success.make()
              .setTitle('Developer Update or Alert')
              .setDescription(message!),
          }).catch((e) => {
            Optic.incident({
              moduleId: 'Task/global.dev.alert.immediateMessage',
              message: 'Failed to dispatch message to guild.',
              err: e,
            });
          });

          await KVC.persistd.consumer.delete(entry.id);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      },
      waitForCompletion: true,
      start: true,
    });
  }
}
