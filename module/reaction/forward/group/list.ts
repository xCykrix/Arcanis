import { ButtonStyles, ChannelTypes, MessageComponentTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { ComponentHandler } from '../../../../lib/util/builder/components.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { ReactionForwardList } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const listCallback = ComponentHandler.builder({
      moduleId: 'reaction.callback.forward-list',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Parse Variables
      let indexPage = parseInt(constants[2])!;
      let displayPage = indexPage + 1;
      const instruction = constants[3];

      // Fetch by Secondary
      const fetchBySecondary = await DatabaseConnector.appd.forward.findBySecondaryIndex('guildId', constants[0], {
        filter: (v) => v.value.fromChannelId === constants[1] || v.value.toChannelId === constants[1],
      });

      // Build Embed
      const embeds = Responses.success.make()
        .setTitle('Auto Forward List');
      const fields = new Map<string, Set<[string, string]>>();

      // Iterate Embeds from Pagination
      if (instruction === 'next') {
        indexPage = indexPage + 1;
        displayPage = displayPage + 1;
      }
      if (indexPage >= 1 && instruction === 'previous') {
        indexPage = indexPage - 1;
        displayPage = displayPage - 1;
      }
      const hasPreviousPage = indexPage >= 1 ? true : false;
      const currentPage = fetchBySecondary.result.slice(0 + (indexPage * 15), 14 + (indexPage * 15));
      const hasNextPage = fetchBySecondary.result.slice(15 + (indexPage * 15), 29 + (indexPage * 15)).length !== 0; //0 + (15 * 0), 15 + (15 * 0)

      // Parse Configuration for Pagination
      for (const configuration of currentPage) {
        if (!fields.has(configuration.value.fromChannelId)) fields.set(configuration.value.fromChannelId, new Set());
        fields.get(configuration.value.fromChannelId)!.add([configuration.value.toChannelId, configuration.value.reaction]);
      }

      // Paginate
      for (const [key, value] of fields.entries()) {
        const chunk: string[] = [];
        for (const v of value) {
          chunk.push(`To: <#${v[0]}> Reaction: ${v[1]}`);
        }
        embeds.addField(`From: <#${key}>`, `${chunk.join('\n')}`);
      }

      // Final & Extra Fields
      embeds.addField('Search Channel', `<#${constants[1]}>`);
      embeds.setFooter(`Page: ${displayPage}`);

      // Respond
      await interaction.edit({
        embeds,
        components: [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.Button,
                customId: await self.makeId({
                  userId: interaction.user.id.toString(),
                  constants: [
                    constants[0],
                    constants[1],
                    `${indexPage}`,
                    'previous',
                  ],
                }),
                style: ButtonStyles.Secondary,
                label: 'Previous',
                disabled: !hasPreviousPage,
              },
              {
                type: MessageComponentTypes.Button,
                customId: await self.makeId({
                  userId: interaction.user.id.toString(),
                  constants: [
                    constants[0],
                    constants[1],
                    `${indexPage}`,
                    'next',
                  ],
                }),
                style: ButtonStyles.Secondary,
                label: 'Next',
                disabled: !hasNextPage,
              },
            ],
          },
        ],
      });
    });
    listCallback.build();

    GroupHandler.builder<Required<ReactionForwardList>>({
      interaction: 'reaction',
      requireGuild: true,
      supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
      userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
      userRequiredChannelPermissions: [],
      applicationRequiredGuildPermissions: [],
      applicationRequiredChannelPermissions: [],
    })
      // deno-lint-ignore require-await
      .inhibitor(async ({ args }) => {
        return args.forward?.list === undefined;
      })
      .handle(async ({ interaction, args }) => {
        const list = args.forward!.list!;

        // Defer for Main Processing
        await interaction.defer(true);

        // Fetch
        const fetchBySecondary = await DatabaseConnector.appd.forward.findBySecondaryIndex('guildId', list.channel.guildId!.toString(), {
          filter: (v) => v.value.fromChannelId === args.forward!.list!.channel.id.toString() || v.value.toChannelId === args.forward!.list!.channel.id.toString(),
        });

        // Exist Check
        if (fetchBySecondary.result.length === 0) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('No Reaction Forwarder configurations found. Please check the channel is correct and try again.'),
          });
          return;
        }

        // Build Embed
        const embeds = Responses.success.make()
          .setTitle('Auto Forward List')
          .setFooter(`Page: 1`);
        const fields = new Map<string, Set<[string, string]>>();

        // Iterate Embeds from Pagination
        const currentPage = fetchBySecondary.result.slice(0, 14);
        const hasNextPage = fetchBySecondary.result.slice(15, 29).length !== 0;

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
        embeds.addField('Search Channel', `<#${list.channel.id.toString()}>`);

        // Respond
        await interaction.respond({
          embeds,
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.Button,
                  customId: await listCallback.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      list.channel.guildId!.toString(),
                      list.channel.id.toString(),
                      '0',
                      'previous',
                    ],
                  }),
                  style: ButtonStyles.Secondary,
                  label: 'Previous',
                  disabled: true,
                },
                {
                  type: MessageComponentTypes.Button,
                  customId: await listCallback.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      list.channel.guildId!.toString(),
                      list.channel.id.toString(),
                      '0',
                      'next',
                    ],
                  }),
                  style: ButtonStyles.Secondary,
                  label: 'Next',
                  disabled: !hasNextPage,
                },
              ],
            },
          ],
        });
      }).build();
  }
}
