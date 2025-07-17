import type { ApplicationCommandOption, ChannelTypes, PermissionStrings } from '@discordeno';

interface ModifiedApplicationCommandOption extends Omit<ApplicationCommandOption, 'nameLocalizations' | 'descriptionLocalizations'> {
  options?: ModifiedApplicationCommandOption[];
}

export interface CommandSchema {
  name: string;
  description: string;
  options?: ModifiedApplicationCommandOption[];

  // Public Flags
  requireGuild: boolean;
  supportedChannelType: ChannelTypes[];
  requireUserGuildPermissions: PermissionStrings[];
  requireUserChannelPermissions: PermissionStrings[];
  requireBotGuildPermissions: PermissionStrings[];
  requireBotChannelPermissions: PermissionStrings[];

  // Management Flags
  requireDeveloper: boolean;
}
// export const schema: CommandSchema[] = [];
