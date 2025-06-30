import { ChannelTypes, type MessageComponent, MessageComponentTypes, type TextInputComponent, TextStyles } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { PingerDefinition } from '../../definition.ts';
import { parseKeyword } from '../logic/parseKeyword.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      PingerDefinition['server']['keywords'],
      PingerDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'pinger',
          componentTopLevel: 'pinger.server.keywords',
          guidTopLevel: 'pinger.server',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_GUILD'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args?.server?.keywords === undefined,
            pick: args?.server?.keywords ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return;

          // Make GUID
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: interaction.guildId!.toString(),
            constants: [
              args.name,
            ],
          });

          // Fetch Pinger
          const kvFind = await KVC.appd.serverPinger.findByPrimaryIndex('guid', guid);
          if (kvFind?.versionstamp === undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('pinger', 'none-found')),
            });
            return;
          }

          // Respond with Modal
          const keywords = parseKeyword(kvFind.value.keywords);
          const textInput: TextInputComponent = {
            type: MessageComponentTypes.TextInput,
            customId: 'text',
            label: 'Keywords',
            style: TextStyles.Paragraph,
            minLength: 1,
            maxLength: 4000,
            required: true,
          };
          if (keywords === null || keywords.length === 0) {
            textInput.placeholder = '-all +keyword1 -keyword2 +keyword with space is ok';
          } else {
            textInput.value = keywords.join(' ');
          }
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'consumeModal',
              timeToLive: 900,
              userId: interaction.user.id,
              constants: new Set([
                kvFind.id,
              ]),
            }),
            title: 'Pinned Keywords Editor',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  textInput,
                ],
              },
            ],
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'consumeModal',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          // Get Component
          const component = assistant.parseModal<{
            text: string;
          }>(interaction.data!.components as MessageComponent[]);

          // Trim and Validate
          if (component.text === undefined || (component.text?.length ?? 0) === 0 || (component.text ?? '').trim() === '') {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('pinger', 'server.keywords', 'invalid')),
            });
            return;
          }

          const keywords = parseKeyword(component.text);
          if (keywords === null || keywords.length === 0) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('pinger', 'server.keywords', 'parse-fail')),
            });
            return;
          }

          // Respond with validation of keywords.
          const keywordList: string[] = [];
          let lastModifier: 'p' | 'n' | 'u' = 'u';
          for (const keyword of keywords) {
            if (keyword.startsWith('-')) {
              if (lastModifier !== 'n') keywordList.push('\u001b[0;31m' + keyword.trim());
              else keywordList.push(keyword.trim());
              lastModifier = 'n';
            }
            if (keyword.startsWith('+')) {
              if (lastModifier !== 'p') keywordList.push('\u001b[0;32m' + keyword.trim());
              else keywordList.push(keyword.trim());
              lastModifier = 'p';
            }
          }

          const embeds = Responses.success.make()
            .setTitle('Pinned Keywords Updated');
          let iter = 0;
          let description = '';
          for (let i = 0; i < keywordList.length; i++) {
            if ((description.length + (keywordList[i + 1]?.length ?? 0)) >= 1000 || iter >= 20) {
              description += `\n`;
              iter = 0;
            }
            if (keywordList[i + 1] === undefined) description += `${keywordList[i].trim()} `;
            if (description.length >= 2000 || keywordList[i + 1] === undefined) {
              embeds.setDescription(`\`\`\`ansi\n${description.trim()}\n\`\`\``);
              if (keywordList[i + 1] !== undefined) embeds.newEmbed();
              description = keywordList[i].trim().startsWith('-') ? '\u001b[0;31m' : '\u001b[0;32m';
            }
            description += `${keywordList[i].trim()} `;
            iter++;
          }

          await KVC.appd.serverPinger.update(constants.values().toArray()[0], {
            keywords: keywords.join(' '),
          });

          await interaction.respond({
            embeds,
          });
        },
      })
      .createAutoCompleteHandler({
        pick: ({ interaction, assistant }) => {
          return assistant.parseAutoComplete(interaction, ['server', 'keywords', 'name']);
        },
        generate: async ({ interaction, pick }) => {
          if (pick === null) return [];

          // Query KVC
          const kvFind = await KVC.appd.serverPinger.findBySecondaryIndex('guildId', interaction.guild!.id.toString(), {
            filter: (v) => v.value.name.toLowerCase().includes(`${pick.value?.toString().toLowerCase()}`),
          });
          if (kvFind.result.length === 0) return [];

          return kvFind.result?.map((v) => {
            return {
              name: `${v.value.name}`,
              value: v.value.name,
            };
          });
        },
      });
  }
}
