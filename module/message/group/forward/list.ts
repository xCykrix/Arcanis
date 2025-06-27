import { ButtonStyles, ChannelTypes, MessageComponentTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['forward']['list'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.forward.list',
          guidTopLevel: 'message.forward',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args?.forward?.list === undefined,
            pick: args?.forward?.list ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Fetch Listing
          const kvFind = await KVC.appd.forward.findBySecondaryIndex('guildId', args.channel.guildId!.toString(), {
            filter: (v) => v.value.fromChannelId === args.channel.id.toString() || v.value.toChannelId === args.channel.id.toString(),
          });

          // Exists Check
          if (kvFind.result.length === 0) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'forward', 'none-found')),
            });
            return;
          }

          // Build Embed
          const embeds = Responses.success.make()
            .setDescription(getLang('message', 'forward.list', 'result'))
            .setFooter('Page: 1');
          const fields = new Map<string, Set<[string, string]>>();

          // Iterate Embeds from Pagination
          const currentPage = kvFind.result.slice(0, 14);
          const hasNextPage = kvFind.result.slice(15, 29).length !== 0;

          for (const configuration of currentPage) {
            if (!fields.has(configuration.value.fromChannelId)) fields.set(configuration.value.fromChannelId, new Set());
            fields.get(configuration.value.fromChannelId)!.add([configuration.value.toChannelId, configuration.value.reaction]);
          }
          for (const [key, value] of fields.entries()) {
            const chunk: string[] = [];
            for (const v of value) {
              chunk.push(`To: <#${v[0]}> Reaction: ${v[1]}`);
            }
            embeds.addField(`From: <#${key}>`, `${chunk.join('\n')}`);
          }
          embeds.addField('Search Channel', `<#${args.channel.id.toString()}>`);

          // Respond
          await interaction.respond({
            embeds,
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: 'disabled.button.previous',
                    style: ButtonStyles.Secondary,
                    label: 'Previous',
                    disabled: true,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: hasNextPage
                      ? await assistant.makeComponentCallback({
                        ref: 'page',
                        timeToLive: 300,
                        userId: interaction.user.id,
                        constants: new Set([
                          args.channel.guildId!.toString(),
                          args.channel.id.toString(),
                          '1',
                        ]),
                      })
                      : 'disabled.button.next',
                    style: ButtonStyles.Secondary,
                    label: 'Next',
                    disabled: !hasNextPage,
                  },
                ],
              },
            ],
          });
        },
      }).createGroupComponentHandler({
        ref: 'page',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          // Parse Constants
          const guild = constants.values().toArray()[0];
          const channel = constants.values().toArray()[1];
          const index = parseInt(constants.values().toArray()[2]);

          // Fetch Listing
          const kvFind = await KVC.appd.forward.findBySecondaryIndex('guildId', guild, {
            filter: (v) => v.value.fromChannelId === channel || v.value.toChannelId === channel,
          });

          // Exists Check
          if (kvFind.result.length === 0) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'forward', 'none-found')),
            });
            return;
          }

          // Build Embed
          const embeds = Responses.success.make()
            .setDescription(getLang('message', 'forward', 'none-found'))
            .setFooter(`Page: ${index + 1}`);
          const fields = new Map<string, Set<[string, string]>>();

          // Iterate Embeds from Pagination
          const hasPreviousPage = index >= 1 ? true : false;
          const currentPage = kvFind.result.slice(0 + (index * 15), 14 + (index * 15));
          const hasNextPage = kvFind.result.slice(15 + (index * 15), 29 + (index * 15)).length !== 0;

          for (const configuration of currentPage) {
            if (!fields.has(configuration.value.fromChannelId)) fields.set(configuration.value.fromChannelId, new Set());
            fields.get(configuration.value.fromChannelId)!.add([configuration.value.toChannelId, configuration.value.reaction]);
          }
          for (const [key, value] of fields.entries()) {
            const chunk: string[] = [];
            for (const v of value) {
              chunk.push(`To: <#${v[0]}> Reaction: ${v[1]}`);
            }
            embeds.addField(`From: <#${key}>`, `${chunk.join('\n')}`);
          }
          embeds.addField('Search Channel', `<#${channel}>`);

          // Respond
          await interaction.edit({
            embeds,
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: hasPreviousPage
                      ? await assistant.makeComponentCallback({
                        ref: 'page',
                        timeToLive: 300,
                        userId: interaction.user.id,
                        constants: new Set([
                          guild,
                          channel,
                          `${index - 1}`,
                        ]),
                      })
                      : 'disabled.button.previous',
                    style: ButtonStyles.Secondary,
                    label: 'Previous',
                    disabled: !hasPreviousPage,
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: hasNextPage
                      ? await assistant.makeComponentCallback({
                        ref: 'page',
                        timeToLive: 300,
                        userId: interaction.user.id,
                        constants: new Set([
                          guild,
                          channel,
                          `${index + 1}`,
                        ]),
                      })
                      : 'disabled.button.next',
                    style: ButtonStyles.Secondary,
                    label: 'Next',
                    disabled: !hasNextPage,
                  },
                ],
              },
            ],
          });
        },
      });
  }
}
