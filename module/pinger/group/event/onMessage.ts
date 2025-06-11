import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';
import { parseKeyword, runKeywordStateMachine } from '../logic/parseKeyword.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;
      const kvFindGlobal = await KVC.appd.guildPingerSetup.findByPrimaryIndex('guildId', message.guildId.toString());
      if (kvFindGlobal?.versionstamp === undefined) return;

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
        for (const field of embed.fields ?? []) {
          if (field.name.toLowerCase() === 'sku') {
            sku = field.value.toLowerCase();
          }
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
            for (const field of followFetchEmbed.fields ?? []) {
              if (field.name.toLowerCase() === 'sku') {
                sku = field.value.toLowerCase();
              }
              texts.push(field.value.toLowerCase());
            }
          }
        }
      }

      // Fast exit if no title or sku was found.
      if (title === '' && sku === '') return;

      const mutex = crypto.randomUUID();
      const guid = GUID.make({
        moduleId: 'pinger.group.event.onMessage.lockout',
        guildId: message.guildId.toString(),
        channelId: message.channelId.toString(),
        constants: [
          sku !== '' ? sku : title,
        ],
      });
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
        if (lockFind.value.lockedAt + (kvFindGlobal.value.alertCooldownByProduct * 1000) > message.timestamp) {
          Optic.f.debug(`[Pinger/Server] Cooldown guard triggered. Preventing execution.`, {
            guildId: message.guildId,
            channelId: message.channelId,
          });
          return;
        }
      }

      // Run Mappings
      const set = new Set<string>();
      const mapping = await KVC.appd.pingerChannelMap.findBySecondaryIndex('channelId', message.channelId.toString());
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

        // Check Keyword Hit
        const keywordHit = runKeywordStateMachine(keywords, texts, false);

        // Dispatch Alert
        if (keywordHit) {
          kvFind.value.rolesToAlert.values().forEach((v) => set.add(v));
        }
      }

      // Send Message
      await Bootstrap.bot.helpers.sendMessage(message.channelId, {
        content: kvFindGlobal.value.alertMessage.replace('{{TITLE}}', properTitle).replace('{{SKU}}', sku).replace('{{ROLES}}', set.values().toArray().join(' ')),
      });
    });
  }
}
