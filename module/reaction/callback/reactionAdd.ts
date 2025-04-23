import { avatarUrl, ButtonStyles, type DiscordEmbed, EmbedsBuilder, MessageComponentTypes } from '@discordeno';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { makeGlobalReactionModuleForwardID } from '../../../lib/database/model/reaction.model.ts';
import { Initializable } from '../../../lib/generic/initializable.ts';
import { createIncidentEvent, optic } from '../../../lib/util/helper/optic.ts';
import { Bootstrap } from '../../../mod.ts';

export class ReactionModuleReactionAddForwarder extends Initializable {
  public override initialize(): Promise<void> | void {
    Bootstrap.event.add('reactionAdd', async (reaction) => {
      if (reaction.guildId === undefined) return;
      if (reaction.user?.bot) return;
      if (reaction.emoji.name === undefined) return;

      // Check for Configuration
      const guid = makeGlobalReactionModuleForwardID(reaction.guildId.toString(), reaction.channelId.toString(), reaction.emoji.name);
      const fetchByPrimary = await DatabaseConnector.appd.reactionModuleForwardConfiguration.findByPrimaryIndex('guid', guid);

      // Ensure Exists
      if (fetchByPrimary?.versionstamp === undefined) {
        return;
      }

      // Check Locking Cache
      const locks = await DatabaseConnector.persist.get([Bootstrap.bot.applicationId, reaction.guildId, reaction.channelId, reaction.messageId]);
      if (locks.versionstamp !== null) {
        optic.debug(`M${reaction.messageId} from C${reaction.channelId} in G${reaction.guildId} was triggered but is persistence cached.`);
        return;
      }

      // Get Message
      const message = await Bootstrap.bot.helpers.getMessage(reaction.channelId, reaction.messageId).catch((e) => {
        createIncidentEvent(crypto.randomUUID(), `Failed to Fetch Message for Reaction Forward Module reactionAdd Event. ${reaction.guildId}${reaction.channelId}/${reaction.messageId}`, e);
        return null;
      });
      if (message === null) return;

      // Counters
      const reactionFromMessage = message.reactions?.filter((v) => v.emoji.name === reaction.emoji.name)[0];
      if (reactionFromMessage === undefined) return;

      // Check Count
      const count = reactionFromMessage.count - (reactionFromMessage.me ? 1 : 0);
      if (count < fetchByPrimary.value.threshold) {
        optic.debug(`M${reaction.messageId} from C${reaction.channelId} in G${reaction.guildId} was handled but did not trigger the threshold configured.`);
        return;
      }

      // Check Age of Message
      if (message.timestamp < (Date.now() - (fetchByPrimary.value.within * 1000))) {
        return;
      }

      // Parse Media Type
      let type: 'text' | 'embed' = 'text';
      if ((message.embeds?.length ?? 0) !== 0) type = 'embed';

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
            createIncidentEvent(crypto.randomUUID(), `Failed to do a reaction forward for type embed. ${reaction.guildId}${reaction.channelId}/${reaction.messageId}`, e);
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
            createIncidentEvent(crypto.randomUUID(), `Failed to do a reaction forward for type text. ${reaction.guildId}${reaction.channelId}/${reaction.messageId}`, e);
            return null;
          });
          break;
        }
      }

      // Write to Lock Cache
      await DatabaseConnector.persist.set([Bootstrap.bot.applicationId, reaction.guildId, reaction.channelId, reaction.messageId], true, {
        expireIn: fetchByPrimary.value.within * 1000,
      });
    });
  }
}
