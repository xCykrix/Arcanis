import { avatarUrl, ButtonStyles, type DiscordEmbed, EmbedsBuilder, MessageComponentTypes } from '@discordeno';
import { AsyncInitializable } from '../../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../../lib/kvc/kvc.ts';
import { Emoji } from '../../../../../lib/util/guard/emoji.ts';
import { Optic } from '../../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('reactionAdd', async (reaction) => {
      if (reaction.guildId === undefined) return;
      if (reaction.userId === Bootstrap.bot.id) return;
      if (reaction.emoji.name === undefined) return;
      if (!Emoji.check(reaction.emoji.name)) return;

      // Check & Write Lock. Async block until release of mutex.
      const mutex = crypto.randomUUID();
      const lockGuid = GUID.make({
        moduleId: 'message.forward',
        messageId: reaction.messageId.toString(),
      });
      let kvFindLock = await KVC.persistd.locks.findByPrimaryIndex('guid', lockGuid);
      while (kvFindLock?.versionstamp !== undefined && kvFindLock.value.lockoutMutexId !== 'willNeverUnlock') {
        Optic.f.warn(`Waiting on mutex to be released for message.forward.reactionAdd... Prevents lost events.`);
        kvFindLock = await KVC.persistd.locks.findByPrimaryIndex('guid', lockGuid);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (kvFindLock?.value.lockoutMutexId === 'willNeverUnlock') return;

      const lock = await KVC.persistd.locks.add({
        guid: lockGuid,
        locked: true,
        lockedAt: Date.now(),
        lockoutMutexId: mutex,
      }, {
        expireIn: 3000,
      });
      if (!lock.ok) {
        Optic.f.warn('Failed to write mutex on message.forward.reactionAdd... Failed to commit. Exiting to prevent mutex race, but the event was missed. This should rarely be seen.');
        return;
      }

      // Check Exist
      const kvFind = await KVC.appd.forward.findBySecondaryIndex('fromChannelId', reaction.channelId.toString(), {
        filter: (v) => v.value.reaction === reaction.emoji.name,
      });
      const forwarder = kvFind.result[0];
      if (forwarder?.versionstamp === undefined) {
        await KVC.persistd.locks.deleteByPrimaryIndex('guid', lockGuid);
        return;
      }

      // Get Message
      const message = await Bootstrap.bot.helpers.getMessage(reaction.channelId, reaction.messageId).catch((e) => {
        Optic.incident({
          moduleId: 'message.forward.reactionAdd',
          message: `Failed to Fetch Message for Reaction Forward Module reactionAdd Event. ${reaction.guildId}/${reaction.channelId}/${reaction.messageId}`,
          err: e,
        });
        return null;
      });
      if (message === null) {
        await KVC.persistd.locks.deleteByPrimaryIndex('guid', lockGuid);
        return;
      }

      // Check Reactions on Message
      const reactionFromMessage = message.reactions?.filter((v) => v.emoji.name === reaction.emoji.name)[0];
      if (reactionFromMessage === undefined) {
        await KVC.persistd.locks.deleteByPrimaryIndex('guid', lockGuid);
        return;
      }

      // Check Count of Reactions
      const count = reactionFromMessage.count - (reactionFromMessage.me ? 1 : 0);
      if (count < forwarder.value.threshold) {
        await KVC.persistd.locks.deleteByPrimaryIndex('guid', lockGuid);
        return;
      }

      // Check Age of Message
      if (message.timestamp < (Date.now() - (forwarder.value.within * 1000))) {
        await KVC.persistd.locks.deleteByPrimaryIndex('guid', lockGuid);
        return;
      }

      // Media
      let type: 'text' | 'embed' = 'text';
      if ((message.embeds?.length ?? 0) !== 0) type = 'embed';

      // Recheck Lock
      kvFindLock = await KVC.persistd.locks.findByPrimaryIndex('guid', lockGuid);
      if (kvFindLock?.value?.lockoutMutexId !== mutex) {
        Optic.f.warn('Mutex mismatch on message.forward.reactionAdd. Exited to prevent mutex race. Lock is untouched.');
        return;
      }
      await KVC.persistd.locks.updateByPrimaryIndex('guid', lockGuid, {
        lockoutMutexId: 'willNeverUnlock',
      }, {
        expireIn: forwarder.value.within * 1000,
      });

      // Dispatch
      switch (type) {
        case 'embed': {
          // Send with Text and Embed
          await Bootstrap.bot.helpers.sendMessage(BigInt(forwarder.value.toChannelId), {
            content: forwarder.value.alert,
            embeds: (message.embeds ?? [] as DiscordEmbed[]).map((v) => {
              if (v.timestamp) v.timestamp = new Date(v.timestamp).toISOString();
              return v;
            }) as DiscordEmbed[],
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    label: 'Original Message',
                    type: MessageComponentTypes.Button,
                    style: ButtonStyles.Link,
                    url: `https://discord.com/channels/${reaction.guildId.toString()}/${message.channelId.toString()}/${message.id.toString()}`,
                  },
                ],
              },
            ],
          }).catch((e) => {
            Optic.incident({
              moduleId: 'message.forward.reactionAdd.withEmbeds',
              message: `Failed to do a reaction forward for embeds. ${reaction.guildId}/${reaction.channelId}/${reaction.messageId}`,
              err: e,
            });
            return null;
          });
          break;
        }
        default: {
          // Process Attachments
          const embeds = new EmbedsBuilder()
            .setAuthor(`${message.author.globalName ?? message.author.username}`, {
              icon_url: avatarUrl(message.author.id, '', {
                avatar: message.author.avatar,
              }),
            }).setDescription(message.content);
          if (message.attachments !== undefined && message.attachments.length > 0) {
            for (let i = 0; i < (message.attachments?.length ?? 0); i++) {
              const attachment = message.attachments[i];
              if (attachment.contentType?.startsWith('image')) {
                if (i !== 0) embeds.newEmbed();
                embeds.setUrl(attachment.url)
                  .setImage(attachment.url);
              }
            }
          }

          // Send with Attachments
          await Bootstrap.bot.helpers.sendMessage(BigInt(forwarder.value.toChannelId), {
            content: forwarder.value.alert,
            embeds,
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    label: 'Original Message',
                    type: MessageComponentTypes.Button,
                    style: ButtonStyles.Link,
                    url: `https://discord.com/channels/${reaction.guildId.toString()}/${message.channelId.toString()}/${message.id.toString()}`,
                  },
                ],
              },
            ],
          }).catch((e) => {
            Optic.incident({
              moduleId: 'message.forward.reactionAdd.withoutEmbeds',
              message: `Failed to do a reaction forward for non embeds. ${reaction.guildId}${reaction.channelId}/${reaction.messageId}`,
              err: e,
            });
            return null;
          });
          break;
        }
      }
    });
  }
}
