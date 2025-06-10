import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('messageCreate', async (message) => {
      if (message.guildId === undefined) return;

      const mapping = await KVC.appd.pingerChannelMap.findBySecondaryIndex('channelId', message.channelId.toString());
      for (const map of mapping.result) {
        const kvFind = await KVC.appd.serverPinger.findByPrimaryIndex('guid', map.value.guidOfPinger);
        if (kvFind?.versionstamp === undefined) {
          await KVC.appd.pingerChannelMap.delete(map.id);
          Optic.f.warn(`Pinger Channel Map with ID '${map.id}/${map.value.channelId}/${map.value.guidOfPinger}' has no valid pinger. Deleting...`);
          continue;
        }

        // Parse and Rebuild Message
        const texts: string[] = [];
        let title = '';
        let sku = '';

        if (message.content !== undefined) texts.push(message.content.toLowerCase());
        const embed = (message.embeds ?? [])[0];
        if (embed !== undefined) {
          if (embed.title !== undefined) {
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

        if (message.messageReference !== undefined) {
          const followFetch = await Bootstrap.bot.helpers.getMessage(message.messageReference.channelId!, message.messageReference.messageId!).catch(() => null);
          if (followFetch !== null) {
            if (followFetch.content !== undefined) texts.push(followFetch.content.toLowerCase());
            const followFetchEmbed = (followFetch.embeds ?? [])[0];
            if (followFetchEmbed !== undefined) {
              if (followFetchEmbed.title !== undefined) {
                texts.push(followFetchEmbed.title.toLowerCase());
                title = followFetchEmbed.title.toLowerCase();
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

        if (title !== '' || sku !== '') {
          const guid = GUID.make({
            moduleId: 'pinger.group.event.onMessage.cooldown',
            guildId: message.guildId.toString(),
            channelId: message.channelId.toString(),
            constants: [
              title,
              sku
            ]
          });
          const kvc = await KVC.
          await KVC.persistd.locks.add()

        }

      }
    });
  }
}
