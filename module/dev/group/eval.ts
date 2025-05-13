import { ChannelTypes, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { getLang } from '../../../lang.ts';
import { DatabaseConnector } from '../../../lib/database/database.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { ComponentHandler } from '../../../lib/util/builder/components.ts';
import { GroupHandler } from '../../../lib/util/builder/group.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import { createIncidentEvent } from '../../../lib/util/optic.ts';
import { Bootstrap } from '../../../mod.ts';
import type { DevEval } from '../definition.ts';

// Constants for Eval
Bootstrap;
DatabaseConnector;

const clean = async (text: unknown, depth: number = 1) => {
  // If our input is a promise, await it before continuing
  if (text && text.constructor.name === 'Promise') {
    text = await text;
  }

  // 'stringify' the code in a safe way that
  // won't error out on objects with circular references
  // (like Collections, for example)
  if (typeof text !== 'string') {
    text = Deno.inspect(text, {
      colors: false,
      depth,
      iterableLimit: 5,
      trailingComma: true,
    });
  }

  // Replace symbols with character code alternatives
  text = (text as string)
    .replace(/`/g, '`' + String.fromCharCode(8203))
    .replace(/@/g, '@' + String.fromCharCode(8203));

  // Redactions
  text = (text as string)
    .replace(Deno.env.get('DENO_KV_ACCESS_TOKEN') ?? 'kv-access-token', 'KV_ACCESS_REDACTED')
    .replace(Bootstrap.application?.token ?? 'token-placeholder', 'TOKEN_REDACTED');

  // Send off the cleaned up result
  return text;
};

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const modal = ComponentHandler.builder({
      moduleId: 'dev.callback.eval',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();

      const components = ComponentHandler.parseModal<{
        code: string;
      }>(interaction.data!.components as MessageComponent[]);
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Trim and Validate
      if ((components.code?.length ?? 0) === 0 || (components.code ?? '').trim() === '') {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription(getLang('eval', 'component.code')!),
        }, {
          isPrivate: true,
        });
        return;
      }

      // Evaluate
      let result = getLang('eval', 'result.default');
      try {
        // deno-lint-ignore no-eval
        result = await eval(`(async () => { ${components.code!} })();`);
      } catch (e) {
        createIncidentEvent(crypto.randomUUID(), 'Failed to Evaludate', e as Error);
      }

      let cleaned = await clean(result, parseInt(constants[0]!));
      if (cleaned === 'undefined') cleaned = getLang('eval', 'result.undefined');
      await interaction.respond({
        content: ['```', `${cleaned}`, '```'].join('\n'),
      });
    });

    GroupHandler.builder<DevEval>({
      interaction: 'dev',
      requireGuild: false,
      supportedChannelTypes: [ChannelTypes.GuildText, ChannelTypes.DM],
      userRequiredGuildPermissions: [],
      userRequiredChannelPermissions: [],
      applicationRequiredGuildPermissions: [],
      applicationRequiredChannelPermissions: [],
    })
      // deno-lint-ignore require-await
      .inhibitor(async ({ args }) => {
        return args.eval === undefined;
      })
      .handle(async ({ interaction, args }) => {
        if (interaction.user.id !== 100737000973275136n) {
          await interaction.respond(getLang('eval', 'unauthorized')!);
          createIncidentEvent(crypto.randomUUID(), `Unauthorized Access Attempt. G:${interaction.guildId} U:${interaction.user.id}/${interaction.user.globalName ?? interaction.user.username}`, new Error('External Security Exception'));
          return;
        }

        // Respond Modal
        await interaction.respond({
          customId: await modal.makeId({
            userId: interaction.user.id.toString(),
            constants: [
              `${args.eval?.depth ?? 1}`,
            ],
          }),
          title: 'Pinned Message Editor',
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.InputText,
                  customId: 'code',
                  label: 'Code Snippet',
                  style: TextStyles.Paragraph,
                  minLength: 1,
                  maxLength: 4000,
                  required: true,
                },
              ],
            },
          ],
        });
      });
  }
}
