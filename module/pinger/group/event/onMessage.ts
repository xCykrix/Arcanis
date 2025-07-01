import type { PermissionStrings } from '@discordeno';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import DispatchAlertMessage from '../../../../lib/task/dispatchAlertMessage.ts';
import ScheduleDeleteMessage from '../../../../lib/task/scheduleDeleteMessage.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';
import { parseKeyword, runKeywordStateMachine } from '../logic/parseKeyword.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const ignoreFields = [
      'offer id',
    ]
    const skuFields = [
      'sku',
      'pid',
      'asin',
      'tcin',
    ];

    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;
      const kvFindGlobal = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', message.guildId.toString());
      if (kvFindGlobal?.versionstamp === undefined) return;
      const mapping = await KVC.appd.pingerChannelMap.findBySecondaryIndex('channelId', message.channelId.toString());
      if ((mapping.result ?? []).length === 0) return;

      // Parse and Rebuild Message
      const texts: string[] = [];
      let properTitle = '';
      let title = '';
      let sku = '';

      // Parse Main Embed
      if (message.content !== undefined) texts.push(message.content.toLowerCase());
      const embed = (message.embeds ?? [])[0];
      if (embed !== undefined) {
        if (embed.title !== undefined) {
          properTitle = embed.title;
          title = embed.title.toLowerCase();
          texts.push(embed.title.toLowerCase());
        }
        if (embed.description !== undefined) texts.push(embed.description.toLowerCase());
        if (embed.footer?.text !== undefined) texts.push(embed.footer.text.toLowerCase());
        for (const field of embed.fields ?? []) {
          if (ignoreFields.includes(field.name.toLowerCase())) continue;
          if (skuFields.includes(field.name.toLowerCase())) sku = field.value.toLowerCase();
          texts.push(field.value.toLowerCase());
        }
      }

      // Parse Referenced Message
      if (message.messageReference !== undefined) {
        const followFetch = await Bootstrap.bot.helpers.getMessage(message.messageReference.channelId!, message.messageReference.messageId!).catch(() => null);
        if (followFetch !== null) {
          if (followFetch.content !== undefined) texts.push(followFetch.content.toLowerCase());
          const followFetchEmbed = (followFetch.embeds ?? [])[0];
          if (followFetchEmbed !== undefined) {
            if (followFetchEmbed.title !== undefined) {
              properTitle = followFetchEmbed.title;
              title = followFetchEmbed.title.toLowerCase();
              texts.push(followFetchEmbed.title.toLowerCase());
            }
            if (followFetchEmbed.description !== undefined) texts.push(followFetchEmbed.description.toLowerCase());
            if (followFetchEmbed.footer?.text !== undefined) texts.push(followFetchEmbed.footer.text.toLowerCase());
            for (const field of followFetchEmbed.fields ?? []) {
              if (ignoreFields.includes(field.name.toLowerCase())) continue;
              if (skuFields.includes(field.name.toLowerCase())) sku = field.value.toLowerCase();
              texts.push(field.value.toLowerCase());
            }
          }
        }
      }

      // Fast exit if no title or sku was found.
      if (title === '') return;

      // Create State
      const mutex = crypto.randomUUID();
      const guid = GUID.make({
        moduleId: 'pinger.group.event.onMessage.lockout',
        guildId: message.guildId.toString(),
        channelId: message.channelId.toString(),
        constants: [
          title,
        ],
      });

      // Wipe if Expired
      const getCurrent = await KVC.persistd.locks.findByPrimaryIndex('guid', guid);
      if (getCurrent?.versionstamp !== undefined && Date.now() >= (getCurrent.value.lockedAt) + kvFindGlobal.value.alertCooldownByProduct * 1000) {
        await KVC.persistd.locks.delete(getCurrent.id);
      }

      // Write Lock
      const commit = await KVC.persistd.locks.add({
        guid,
        locked: true,
        lockedAt: message.timestamp,
        lockoutMutexId: mutex,
      }, {
        expireIn: kvFindGlobal.value.alertCooldownByProduct * 1000,
      });
      if (commit.ok === false) {
        Optic.f.debug(`[Pinger/Server] Failed to commit to lock cache via add. Prevents racing due to GUID overlap or duplication.`, {
          guildId: message.guildId,
          channelId: message.channelId,
          messageId: message.id,
        });
        return;
      }
      const lockFind = await KVC.persistd.locks.findByPrimaryIndex('guid', guid);
      if (lockFind?.value?.lockoutMutexId !== mutex) {
        Optic.f.debug(`[Pinger/Server] Mutex guard was triggered. Prevents racing due to GUID overlap or duplication.`, {
          guildId: message.guildId,
          channelId: message.channelId,
        });
        return;
      }
      if (lockFind?.versionstamp !== undefined) {
        if (message.timestamp > lockFind.value.lockedAt + (kvFindGlobal.value.alertCooldownByProduct * 1000)) {
          Optic.f.debug(`[Pinger/Server] Cooldown guard triggered. Preventing execution.`, {
            guildId: message.guildId,
            channelId: message.channelId,
            messageId: message.id,
          });
          return;
        }
      }

      // Run Mappings
      const set = new Set<string>();
      for (const map of mapping.result) {
        const kvFind = await KVC.appd.serverPinger.findByPrimaryIndex('guid', map.value.guidOfPinger);
        if (kvFind?.versionstamp === undefined) {
          Optic.f.warn(`[Pinger/Server] Map with ID '${map.id}/${map.value.channelId}/${map.value.guidOfPinger}' has no valid pinger. Deleting...`);
          await KVC.appd.pingerChannelMap.delete(map.id);
          continue;
        }

        // Validate Keywords
        const keywords = parseKeyword(kvFind.value.keywords);
        if (keywords === null || keywords.length === 0) {
          Optic.f.debug('[Pinger/Server] Keywords was blank or otherwise invalid. Skipped pinger.', {
            guildId: message.guildId,
            channelId: message.channelId,
          });
          continue;
        }

        // Dispatch Alert
        if (runKeywordStateMachine(keywords, texts)) {
          kvFind.value.rolesToAlert.values().forEach((v) => set.add(v));
        }
      }

      // Order Roles
      const guild = await Bootstrap.bot.cache.guilds.get(message.guildId);
      const guildRolesSorted = new Map<string, number>();
      guild?.roles?.map((v) => {
        guildRolesSorted.set(v.id.toString(), v.position);
      });
      const roles = set.values().toArray().sort((a, b) => {
        return guildRolesSorted.get(b)! - guildRolesSorted.get(a)!;
      }).map((v) => `<@&${v}>`);
      if (roles.length === 0) return;

      // Permission Guard to Send Message
      const channel = await Bootstrap.bot.cache.channels.get(BigInt(message.channelId));
      const botMember = await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, channel?.guildId!);
      if (channel === undefined || guild === undefined) return;
      if (botMember === undefined) return;

      // Permission Guard
      const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'ADD_REACTIONS'];
      if (!Permissions.hasChannelPermissions(guild!, channel.id, botMember!, botPermissions)) {
        Optic.f.warn(`[Task/global.addReactionToMessage] Permissions required for an operation were missing. Removing entry and sending alert to specified guild.`, {
          channelId: message.channelId,
          messageId: message.id,
        });
        await DispatchAlertMessage.guildAlert({
          guildId: channel.guildId!.toString(),
          message: [
            `Unable to send message in <#${message.channelId}> due to one or more missing permissions.`,
            `Permissions: ${botPermissions.join(' ')}`,
          ].join('\n'),
        });
        return;
      }

      // Send Message
      const sent = await Bootstrap.bot.helpers.sendMessage(message.channelId, {
        content: kvFindGlobal.value.alertMessage.replace('{{TITLE}}', properTitle.trim()).replace('{{SKU}}', sku.trim()).replace('{{ROLES}}', roles.join(' ')),
      });
      await ScheduleDeleteMessage.schedule({
        channelId: sent.channelId.toString(),
        messageId: sent.id.toString(),
        reason: 'Auto deletion by Pinger Module.',
        isOwnMessage: true,
        after: sent.timestamp + 30000,
      });
    });
  }
}
