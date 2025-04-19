import { commandOptionsParser, InteractionTypes } from '@discordeno';
import type { Bootstrap } from '../../mod.ts';
import { PermissionsHelper } from '../util/helper/permissions.ts';
import { ResponseGeneratorHelper } from '../util/helper/response.ts';
import { Initializable } from './initializable.ts';

export abstract class CommandGroupHandler extends Initializable {
  protected generator: ResponseGeneratorHelper = new ResponseGeneratorHelper();
  protected permissions: PermissionsHelper = new PermissionsHelper();

  /** Expect a Interaction Command of Specified Name. */
  public expect(name: string, interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction, allowBotUser = false): boolean {
    if (interaction.type !== InteractionTypes.ApplicationCommand) return false;
    if (interaction.data === undefined) return false;
    if (interaction.data.name !== name) return false;
    if (!allowBotUser && interaction.user.bot) return false;
    return true;
  }

  /** Parse Interaction Command Parameters. */
  public parse<T>(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): T {
    return commandOptionsParser(interaction) as T;
  }
}
