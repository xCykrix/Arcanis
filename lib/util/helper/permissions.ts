import { BitwisePermissionFlags, ChannelTypes, type PermissionStrings, separateOverwrites } from '@discordeno';
import type { Bootstrap } from '../../../mod.ts';

export class Permissions {
  /**
   * Calculates the base permissions for a member in a guild.
   * @param guild The guild.
   * @param member The member.
   * @returns The base permissions.
   */
  public static calculateBasePermissions(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
  ): bigint {
    if (!guild || !member) return 0n;

    let permissions = BigInt(
      [guild.id, ...member.roles]
        .map((id) => guild.roles?.get(id)?.permissions?.bitfield ?? 0n)
        .reduce((acc, perm) => acc | perm, 0n),
    );

    if (guild.ownerId === member.id) {
      permissions |= BigInt(BitwisePermissionFlags.ADMINISTRATOR);
    }
    return permissions;
  }

  /**
   * Calculates the channel overwrites for a member in a channel.
   * @param guild The guild.
   * @param channelId The channel ID.
   * @param member The member.
   * @returns The channel overwrites.
   */
  public static calculateCachedChannelOverwrites(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    channelId: bigint,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
  ): bigint {
    const channel = guild.channels?.get(channelId);
    if (!channel) return 0n;

    const isThread = [ChannelTypes.AnnouncementThread, ChannelTypes.PrivateThread, ChannelTypes.PublicThread].includes(channel.type);
    const parentChannel = isThread ? guild.channels?.get(channel.parentId!) : channel;
    if (!parentChannel) return 0n;

    let permissions = Permissions.calculateBasePermissions(guild, member);

    const overwrites = parentChannel.internalOverwrites ?? [];

    const everyoneOverwrite = overwrites.find((overwrite) => separateOverwrites(overwrite)[1] === parentChannel.guildId);
    if (everyoneOverwrite) {
      const [, , allow, deny] = separateOverwrites(everyoneOverwrite);
      permissions = (permissions & ~deny) | allow;
    }

    let allow = 0n;
    let deny = 0n;
    for (const overwrite of overwrites) {
      const [, id, allowBits, denyBits] = separateOverwrites(overwrite);
      if (member.roles?.includes(id)) {
        deny |= denyBits;
        allow |= allowBits;
      }
    }
    permissions = (permissions & ~deny) | allow;

    const memberOverwrite = overwrites.find((overwrite) => separateOverwrites(overwrite)[1] === member.id);
    if (memberOverwrite) {
      const [, , allowBits, denyBits] = separateOverwrites(memberOverwrite);
      permissions = (permissions & ~denyBits) | allowBits;
    }

    if (isThread && (permissions & BigInt(BitwisePermissionFlags.SEND_MESSAGES_IN_THREADS))) {
      permissions |= BigInt(BitwisePermissionFlags.SEND_MESSAGES);
    }

    return permissions;
  }

  /**
   * Calculates the channel overwrites for a role in a channel.
   * @param guild The guild.
   * @param channelId The channel ID.
   * @param roleId The role ID.
   * @returns The channel overwrites for the role.
   */
  public static calculateCachedChannelOverwritesForRole(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    channelId: bigint,
    roleId: bigint,
  ): bigint {
    const channel = guild.channels?.get(channelId);
    if (!channel) return 0n;

    const isThread = [ChannelTypes.AnnouncementThread, ChannelTypes.PrivateThread, ChannelTypes.PublicThread].includes(channel.type);
    const parentChannel = isThread ? guild.channels?.get(channel.parentId!) : channel;
    if (!parentChannel) return 0n;

    const role = guild.roles?.get(roleId);
    if (!role) return 0n;

    let permissions = role.permissions.bitfield;
    const overwrites = parentChannel.internalOverwrites ?? [];

    const everyoneOverwrite = overwrites.find((overwrite) => separateOverwrites(overwrite)[1] === parentChannel.guildId);
    if (everyoneOverwrite) {
      const [, , allow, deny] = separateOverwrites(everyoneOverwrite);
      permissions = (permissions & ~deny) | allow;
    }

    let allow = 0n;
    let deny = 0n;
    for (const overwrite of overwrites) {
      const [, id, allowBits, denyBits] = separateOverwrites(overwrite);
      if (id === roleId) {
        deny |= denyBits;
        allow |= allowBits;
      }
    }
    permissions = (permissions & ~deny) | allow;

    const roleOverwrite = overwrites.find((overwrite) => separateOverwrites(overwrite)[1] === roleId);
    if (roleOverwrite) {
      const [, , allowBits, denyBits] = separateOverwrites(roleOverwrite);
      permissions = (permissions & ~denyBits) | allowBits;
    }

    if (isThread && (permissions & BigInt(BitwisePermissionFlags.SEND_MESSAGES_IN_THREADS))) {
      permissions |= BigInt(BitwisePermissionFlags.SEND_MESSAGES);
    }

    return permissions;
  }

  /**
   * Gets the missing permissions from a set of permission bits.
   * @param permissionBits The permission bits.
   * @param permissions The permissions to check.
   * @returns An array of missing permissions.
   */
  public static getMissingPerms(permissionBits: bigint, permissions: PermissionStrings[]): string[] {
    if (permissionBits & BigInt(BitwisePermissionFlags.ADMINISTRATOR)) return [];
    const missingPermissions: string[] = [];
    for (const permission of permissions) {
      if (!(permissionBits & BigInt(BitwisePermissionFlags[permission]))) {
        missingPermissions.push(permission);
      }
    }
    return missingPermissions;
  }

  /**
   * Validates if the given permission bits match the given permissions.
   * @param permissionBits The permission bits.
   * @param permissions The permissions to validate.
   * @returns True if the permissions are valid, false otherwise.
   */
  public static validatePermissions(permissionBits: bigint, permissions: PermissionStrings[]): boolean {
    if (permissionBits & BigInt(BitwisePermissionFlags.ADMINISTRATOR)) return true;
    for (const permission of permissions) {
      if (!(permissionBits & BigInt(BitwisePermissionFlags[permission]))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if a member has the specified permissions in a guild.
   * @param guild The guild.
   * @param member The member.
   * @param permissions The permissions to check.
   * @returns True if the member has the permissions, false otherwise.
   */
  public static hasGuildPermissions(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
    permissions: PermissionStrings[],
  ): boolean {
    const basePermissions = Permissions.calculateBasePermissions(guild, member);
    return Permissions.validatePermissions(basePermissions, permissions);
  }

  /**
   * Checks if a member has the specified permissions in a channel.
   * @param guild The guild.
   * @param channelId The channel ID.
   * @param member The member.
   * @param permissions The permissions to check.
   * @returns True if the member has the permissions, false otherwise.
   */
  public static hasChannelPermissions(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    channelId: bigint,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
    permissions: PermissionStrings[],
  ): boolean {
    const channelOverwrites = Permissions.calculateCachedChannelOverwrites(guild, channelId, member);
    return Permissions.validatePermissions(channelOverwrites, permissions);
  }

  /**
   * Gets the missing permissions from a member in a guild.
   * @param guild The guild.
   * @param member The member.
   * @param permissions The permissions to check.
   * @returns An array of missing permissions.
   */
  public static getMissingGuildPermissions<T extends PermissionStrings>(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
    permissions: T[],
  ): PermissionStrings[] {
    const permissionBits = Permissions.calculateBasePermissions(guild, member);
    return Permissions.missingPermissions<T>(permissionBits, permissions);
  }

  /**
   * Gets the missing permissions from a member in a channel.
   * @param guild The guild.
   * @param channelId The channel ID.
   * @param member The member.
   * @param permissions The permissions to check.
   * @returns An array of missing permissions.
   */
  public static getMissingChannelPermissions<T extends PermissionStrings>(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    channelId: bigint,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
    permissions: T[],
  ): PermissionStrings[] {
    const permissionBits = Permissions.calculateCachedChannelOverwrites(guild, channelId, member);
    return Permissions.missingPermissions<T>(permissionBits, permissions);
  }

  /**
   * Returns the permissions that are not in the given permissionBits
   */
  public static missingPermissions<T extends PermissionStrings>(permissionBits: bigint, permissions: T[]): PermissionStrings[] {
    if (permissionBits & 8n) return [];

    return permissions.filter((permission) => !(permissionBits & BigInt(BitwisePermissionFlags[permission])));
  }

  /**
   * Converts a bitwise string to an array of permission strings.
   * @param permissionBits The bitwise string.
   * @returns An array of permission strings.
   */
  public static calculatePermissions(permissionBits: bigint): string[] {
    const permissions: string[] = [];
    for (const [permission, flag] of Object.entries(BitwisePermissionFlags)) {
      if (typeof flag === 'number' && (permissionBits & BigInt(flag))) {
        permissions.push(permission);
      }
    }
    return permissions;
  }

  /**
   * Converts an array of permission strings to a bitwise string.
   * @param permissions The array of permission strings.
   * @returns The bitwise string.
   */
  public static calculateBits(permissions: PermissionStrings[]): string {
    return permissions.reduce((bits, perm) => bits | BigInt(BitwisePermissionFlags[perm] ?? 0), 0n).toString();
  }

  /**
   * Gets the highest role of a member in a guild.
   * @param guild The guild.
   * @param member The member.
   * @returns The highest role or undefined if the member has no roles.
   */
  public static highestRole(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
  ): typeof Bootstrap.bot.cache.$inferredTypes.role | typeof Bootstrap.bot.transformers.$inferredTypes.role | undefined {
    const memberRoles = member.roles;
    if (!memberRoles?.length) {
      return guild.roles?.get(guild.id);
    }

    let highestRole: typeof Bootstrap.bot.cache.$inferredTypes.role | undefined;
    for (const roleId of memberRoles) {
      const role = guild.roles?.get(roleId);
      if (!role) continue;

      if (!highestRole || role.position > highestRole.position || (role.position === highestRole.position && role.id < highestRole.id)) {
        highestRole = role;
      }
    }
    return highestRole;
  }

  /**
   * Checks if the first role has a higher position than the second role.
   * @param guild The guild.
   * @param roleId The ID of the first role.
   * @param otherRoleId The ID of the second role.
   * @returns True if the first role is higher, false otherwise.
   */
  public static higherRolePosition(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    roleId: bigint,
    otherRoleId: bigint,
  ): boolean {
    const role = guild.roles?.get(roleId);
    const otherRole = guild.roles?.get(otherRoleId);

    if (!role || !otherRole) return false;

    return role.position > otherRole.position || (role.position === otherRole.position && role.id < otherRole.id);
  }

  /**
   * Checks if a member has a higher role position than the given role ID.
   * @param guild The guild.
   * @param member The member.
   * @param compareRoleId The role ID to compare with.
   * @returns True if the member has a higher role position, false otherwise.
   */
  public static isHigherPosition(
    guild: typeof Bootstrap.bot.cache.$inferredTypes.guild,
    member: typeof Bootstrap.bot.cache.$inferredTypes.member | typeof Bootstrap.bot.transformers.$inferredTypes.member,
    compareRoleId: bigint,
  ): boolean {
    if (guild.ownerId === member.id) return true;
    const memberHighestRole = Permissions.highestRole(guild, member);
    return Permissions.higherRolePosition(guild, memberHighestRole?.id ?? 0n, compareRoleId);
  }
}
