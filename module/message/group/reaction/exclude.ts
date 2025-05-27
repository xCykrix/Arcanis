import { ChannelTypes, type Collection, MessageComponentTypes, type SelectMenuDefaultValue } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import type { Bootstrap } from '../../../../mod.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['reaction']['exclude'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.reaction.exclude',
          guidTopLevel: 'message.reaction',
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
            inhibit: args.reaction?.exclude === undefined,
            pick: args.reaction?.exclude ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Exists Check
          let kvFind = await KVC.appd.reactionExclusion.findByPrimaryIndex('channelId', args.channel.id.toString());
          if (kvFind?.versionstamp === undefined) {
            await KVC.appd.reactionExclusion.upsertByPrimaryIndex({
              index: ['channelId', args.channel.id.toString()],
              update: {},
              set: {
                guildId: args.channel.guildId!.toString(),
                channelId: args.channel.id.toString(),
                exclusion: {
                  role: [],
                  user: [],
                },
              },
            });
            kvFind = await KVC.appd.reactionExclusion.findByPrimaryIndex('channelId', args.channel.id.toString());
          }
          if (kvFind?.versionstamp === undefined) {
            Optic.f.warn('Unexpected Interaction Error. Failed to create default KVC entry to reactionExclusion. Bug? Graceful failure.');
            return;
          }

          // Load Defaults
          const defaultRole: SelectMenuDefaultValue[] = [];
          const defaultUser: SelectMenuDefaultValue[] = [];
          kvFind.value.exclusion?.role?.forEach((v) =>
            defaultRole.push({
              type: 'role',
              id: BigInt(v),
            })
          );
          kvFind.value?.exclusion?.user?.forEach((v) =>
            defaultUser.push({
              type: 'user',
              id: BigInt(v),
            })
          );

          // Respond Success
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('reaction.exclude', 'follow-up.description')!)
              .addField('Channel', `<#${args.channel.id}>`),
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.SelectMenuUsers,
                    customId: await assistant.makeComponentCallback({
                      ref: 'user',
                      timeToLive: 300,
                      userId: interaction.user.id,
                      constants: [
                        kvFind.id,
                      ],
                    }),
                    placeholder: 'Select up to 25 Users',
                    minValues: 0,
                    maxValues: 25,
                    defaultValues: defaultUser,
                  },
                ],
              },
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.SelectMenuRoles,
                    customId: await assistant.makeComponentCallback({
                      ref: 'role',
                      timeToLive: 300,
                      userId: interaction.user.id,
                      constants: [
                        kvFind.id,
                      ],
                    }),
                    placeholder: 'Select up to 25 Roles',
                    minValues: 0,
                    maxValues: 25,
                    defaultValues: defaultRole,
                  },
                ],
              },
            ],
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'user',
        handle: async ({ interaction, constants }) => {
          await interaction.deferEdit();

          // Index Resolved Data
          const members = (interaction.data!.resolved! as {
            members?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.member>;
          })?.members?.map((v) => v.id.toString()) ?? null;

          // Exist Check
          const kvFind = await KVC.appd.reactionExclusion.find(constants[0]);
          if (kvFind?.versionstamp === undefined) {
            await interaction.edit({
              embeds: Responses.error.make()
                .setDescription(getLang('reaction.exclude', 'nonexistant')!),
            });
            return;
          }

          // Update Database
          await KVC.appd.reactionExclusion.update(kvFind.id, {
            exclusion: {
              user: (members === null ? [] : members) ?? kvFind.value.exclusion?.user ?? [],
              role: kvFind.value.exclusion?.role ?? [],
            },
          }, {
            strategy: 'merge-shallow',
          });

          // Get Updated and Respond
          const kvFindUpdate = await KVC.appd.reactionExclusion.find(constants[0]);
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('reaction.exclude', 'follow-up.save')!)
              .addField('Channel', `<#${kvFindUpdate!.value.channelId}>`)
              .addField('Users', ((kvFindUpdate?.value.exclusion?.user?.length ?? 0) === 0) ? 'None' : (kvFindUpdate?.value.exclusion?.user ?? null)?.map((v) => `<@${v}>`).join(' ') ?? 'None')
              .addField('Roles', ((kvFindUpdate?.value.exclusion?.role?.length ?? 0) === 0) ? 'None' : (kvFindUpdate?.value.exclusion?.role ?? null)?.map((v) => `<@&${v}>`).join(' ') ?? 'None'),
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'role',
        handle: async ({ interaction, constants }) => {
          await interaction.deferEdit();

          // Index Resolved Data
          const roles = (interaction.data!.resolved! as {
            roles?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.role>;
          })?.roles?.map((v) => v.id.toString()) ?? null;

          // Exist Check
          const kvFind = await KVC.appd.reactionExclusion.find(constants[0]);
          if (kvFind?.versionstamp === undefined) {
            await interaction.edit({
              embeds: Responses.error.make()
                .setDescription(getLang('reaction.exclude', 'nonexistant')!),
            });
            return;
          }

          // Update Database
          await KVC.appd.reactionExclusion.update(kvFind.id, {
            exclusion: {
              user: kvFind.value.exclusion?.user ?? [],
              role: (roles === null ? [] : roles) ?? kvFind.value.exclusion?.role ?? [],
            },
          }, {
            strategy: 'merge-shallow',
          });

          // Get Updated and Respond
          const kvFindUpdate = await KVC.appd.reactionExclusion.find(constants[0]);
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('reaction.exclude', 'follow-up.save')!)
              .addField('Channel', `<#${kvFindUpdate!.value.channelId}>`)
              .addField('Users', ((kvFindUpdate?.value.exclusion?.user?.length ?? 0) === 0) ? 'None' : (kvFindUpdate?.value.exclusion?.user ?? null)?.map((v) => `<@${v}>`).join(' ') ?? 'None')
              .addField('Roles', ((kvFindUpdate?.value.exclusion?.role?.length ?? 0) === 0) ? 'None' : (kvFindUpdate?.value.exclusion?.role ?? null)?.map((v) => `<@&${v}>`).join(' ') ?? 'None'),
          });
        },
      });
  }
}
