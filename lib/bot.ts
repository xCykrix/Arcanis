import { type Bot, createBot, DesiredPropertiesBehavior, GatewayIntents } from '@discordeno';
import { createProxyCache } from '@discordeno-cache';
import { type BotDesiredProperties, desiredProperties } from './desiredProperties.ts';

/**
 * Creates the CacheBot Wrapper.
 *
 * @param bot The Internal Bot
 * @returns A {@link CacheBotType}.
 */
const getProxyCacheBot = (bot: Bot<BotDesiredProperties>) =>
  createProxyCache<BotDesiredProperties, DesiredPropertiesBehavior.RemoveKey, Bot<BotDesiredProperties, DesiredPropertiesBehavior.RemoveKey>>(bot, {
    cacheInMemory: {
      user: true,
      guild: true,
      member: true,
      role: true,
      channel: true,
      default: false,
    },
    cacheOutsideMemory: {
      default: false,
    },
    sweeper: {
      interval: 300 * 1000,
      filter: {
        user: (user) => {
          if (user.id === bot.id) return false;
          if (Date.now() - user.lastInteractedTime > 900 * 1000) return true;
          return false;
        },
        member: (member) => {
          if (member.id === bot.id) return false;
          if (Date.now() - member.lastInteractedTime > 900 * 1000) return true;
          return false;
        },
      },
    },
  });
export type CacheBotType = ReturnType<typeof getProxyCacheBot>;

/**
 * Creates a instance of Discordeno Bot.
 *
 * @param token The Application Authentication Token.
 * @returns A {@link CacheBotType}.
 */
export function createBotWithToken(token: string): CacheBotType {
  return getProxyCacheBot(
    createBot<BotDesiredProperties>({
      token,
      intents: GatewayIntents.Guilds |
        GatewayIntents.GuildMembers |
        GatewayIntents.GuildIntegrations |
        GatewayIntents.GuildWebhooks |
        GatewayIntents.GuildMessages |
        GatewayIntents.GuildMessageReactions |
        GatewayIntents.MessageContent,
      desiredPropertiesBehavior: DesiredPropertiesBehavior.RemoveKey,
      desiredProperties: desiredProperties,
    }),
  );
}
