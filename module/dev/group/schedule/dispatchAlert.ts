import type { PermissionStrings } from '@discordeno';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    setInterval(async () => {
      const alerts = await KVC.persistd.alert.getMany();
      const entries = await KVC.persistd.dispatchedAlert.getMany();
      for (const entry of entries.result) {
        for (const alert of alerts.result) {
          const consumedDispatch = await KVC.persistd.consumedDispatchedAlert.findBySecondaryIndex('dispatchEventId', entry.value.dispatchEventId, {
            filter: (v) => v.value.guildId === alert.value.guildId,
          });
          if (consumedDispatch.result.length === 0) {
            // Get Channel & Verify
            const guild = await Bootstrap.bot.cache.guilds.get(BigInt(alert.value.guildId!));
            const channel = await Bootstrap.bot.cache.channels.get(BigInt(alert.value.toChannelId));
            if (guild === undefined || channel === undefined) {
              Optic.f.warn(`Invalid alert. ${alert.value.guildId}/${alert.value.toChannelId} failed to resolve.`);
              return;
            }
            const member = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, guild.id);

            // Verify Permissions
            const toBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'SEND_MESSAGES'];
            if (!Permissions.hasChannelPermissions(guild, channel.id, member!, toBotPermissions)) {
              Optic.f.warn(`Missing permissions. ${alert.value.guildId}/${alert.value.toChannelId} was missing access to alert channel.`);
              return;
            }

            // Write a Dispatch Notice
            await KVC.persistd.consumedDispatchedAlert.add({
              guildId: alert.value.guildId,
              dispatchEventId: entry.value.dispatchEventId,
            }, {
              expireIn: 120000,
            });

            // Send Message
            Optic.f.info(`Dispatching Global Alert to ${guild.id}/${channel.id}`);
            await Bootstrap.bot.helpers.sendMessage(channel.id, {
              embeds: Responses.success.make()
                .setDescription(entry.value.message),
            }).catch((e) => {
              Optic.f.warn(`Failed to send dispatched message. ${alert.value.guildId}/${alert.value.toChannelId}`, e);
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
    }, 5000);
  }
}
