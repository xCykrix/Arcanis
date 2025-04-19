import type { PermissionStrings } from '@discordeno';
import { Bootstrap } from '../../../mod.ts';

export class PermissionsHelper {
  public role = new RolePermissionHelper();
}

class RolePermissionHelper {
  public async has(roleId: bigint | bigint[], permission: PermissionStrings): Promise<boolean> {
    if (!Array.isArray(roleId)) roleId = [roleId];
    let found = false;
    for (const id of roleId) {
      const role = await Bootstrap.bot.cache.roles.get(id) ?? null;
      if (role === null) continue;
      if (role.permissions.has(permission)) {
        found = true;
        break;
      }
    }
    return found;
  }
}
