import { avatarUrl, ButtonStyles, type DiscordEmbed, EmbedsBuilder, MessageComponentTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { createIncidentEvent } from '../../../../lib/util/optic.ts';
import { Emoji } from '../../../../lib/util/validation/emoji.ts';
import { Bootstrap } from '../../../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.event.add('reactionAdd', async (reaction) => {
      if (reaction.guildId === undefined) return;
      if (reaction.emoji.name === undefined) return;

      // Parse Reactions
      if (!Emoji.validate(reaction.emoji.name)) return;

      // Make GUID
      const guid = GUID.makeVersion1GUID({
        module: 'reaction.forward',
        guildId: reaction.guildId.toString(),
        channelId: reaction.channelId.toString(),
        data: [
          reaction.emoji.name,
        ],
      });
      const fetchByPrimary = await DatabaseConnector.appd.forward.findByPrimaryIndex('guid', guid);

      // Exists
      if (fetchByPrimary?.versionstamp === undefined) return;

      // Check Locking Cache
      const guidLock = GUID.makeVersion1GUID({
        module: 'reaction.forward',
        messageId: reaction.messageId.toString(),
      });
      const fetchLock = await DatabaseConnector.persistd.locks.findByPrimaryIndex('guid', guidLock);
      if (fetchLock?.versionstamp !== undefined) {
        return;
      }

      // Get Message
      const message = await Bootstrap.bot.helpers.getMessage(reaction.channelId, reaction.messageId).catch((e) => {
        createIncidentEvent(crypto.randomUUID(), `Failed to Fetch Message for Reaction Forward Module reactionAdd Event. ${reaction.guildId}/${reaction.channelId}/${reaction.messageId}`, e);
        return null;
      });
      if (message === null) return;

      // Check Age of Message
      if (message.timestamp < (Date.now() - (fetchByPrimary.value.within * 1000))) {
        return;
      }

      // Counters
      const reactionFromMessage = message.reactions?.filter((v) => v.emoji.name === reaction.emoji.name)[0];
      if (reactionFromMessage === undefined) return;

      // Check Count
      const count = reactionFromMessage.count - (reactionFromMessage.me ? 1 : 0);
      if (count < fetchByPrimary.value.threshold) {
        return;
      }

      // Parse Media Type
      let type: 'text' | 'embed' = 'text';
      if ((message.embeds?.length ?? 0) !== 0) type = 'embed';

      // Recheck Lock
      const fetchLockDoubleCheck = await DatabaseConnector.persistd.locks.findByPrimaryIndex('guid', guidLock);
      if (fetchLockDoubleCheck?.versionstamp !== undefined) {
        return;
      }

      // Write Lock
      const commit = await DatabaseConnector.persistd.locks.upsertByPrimaryIndex({
        index: ['guid', guidLock],
        update: {
          locked: true,
          lockedAt: Date.now(),
        },
        set: {
          guid: guidLock,
          locked: true,
          lockedAt: Date.now(),
        },
      }, {
        expireIn: fetchByPrimary.value.within * 1000,
      });
      if (commit.ok === false) {
        return;
      }

      // Dispatch
      switch (type) {
        case 'embed': {
          // Send with Text and Embed
          await Bootstrap.bot.helpers.sendMessage(BigInt(fetchByPrimary.value.toChannelId), {
            content: fetchByPrimary.value.alert,
            embeds: new EmbedsBuilder(...message.embeds as DiscordEmbed[] ?? []),
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
            createIncidentEvent(crypto.randomUUID(), `Failed to do a Reaction Forward for type embed. ${reaction.guildId}${reaction.channelId}/${reaction.messageId}`, e);
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
          await Bootstrap.bot.helpers.sendMessage(BigInt(fetchByPrimary.value.toChannelId), {
            content: fetchByPrimary.value.alert,
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
            createIncidentEvent(crypto.randomUUID(), `Failed to do a reaction forward for non embeds. ${reaction.guildId}${reaction.channelId}/${reaction.messageId}`, e);
            return null;
          });
          break;
        }
      }
    });
  }
}
