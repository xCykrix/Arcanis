import { type Bot, createBot, DesiredPropertiesBehavior, GatewayIntents } from '@discordeno';
import { createProxyCache } from '@discordeno-cache';
import { type BotDesiredProperties, desiredProperties } from './desiredProperties.ts';

/**
 * Creates the CacheBot Wrapper.
 *
 * @param bot The Internal Bot
 * @returns A {@link CacheBotType}.
 */
const getProxyCacheBot = (bot: Bot<BotDesiredProperties, DesiredPropertiesBehavior.ChangeType>) =>
  createProxyCache<BotDesiredProperties, DesiredPropertiesBehavior.ChangeType, Bot<BotDesiredProperties, DesiredPropertiesBehavior.ChangeType>>(bot, {
    cacheInMemory: {
      user: true,
      guild: true,
      role: true,
      channel: true,
      member: true,
      default: true,
    },
    cacheOutsideMemory: {
      default: false,
    },
    sweeper: {
      interval: 5 * 60 * 1000,
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
    createBot<BotDesiredProperties, DesiredPropertiesBehavior.ChangeType>({
      token,
      intents: GatewayIntents.Guilds |
        GatewayIntents.GuildModeration |
        GatewayIntents.GuildMembers |
        GatewayIntents.GuildIntegrations |
        GatewayIntents.GuildWebhooks |
        GatewayIntents.GuildMessages |
        GatewayIntents.GuildMessageReactions |
        GatewayIntents.MessageContent,
      desiredPropertiesBehavior: DesiredPropertiesBehavior.ChangeType,
      desiredProperties: desiredProperties,
    }),
  );
}
