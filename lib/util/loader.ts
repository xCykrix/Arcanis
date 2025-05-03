import { walk } from '@fs/walk';
import type { AsyncInitializable } from '../generic/initializable.ts';
import { createIncidentEvent } from './optic.ts';

export class Loader {
  public static async load(): Promise<void> {
    for await (
      const ent of walk(new URL('../../module', import.meta.url), {
        exts: ['.ts'],
        skip: [
          /\/logic\//g,
        ],
      })
    ) {
      const imported = await import(ent.path).catch((e: Error) => e) as {
        default: new () => AsyncInitializable;
      } | Error;
      if (imported instanceof Error) {
        await createIncidentEvent(
          crypto.randomUUID(),
          `Failed to Import Module: ${ent.path}`,
          imported,
        );
      } else {
        try {
          await (new imported.default()).initialize().catch((e) => {
            createIncidentEvent(
              crypto.randomUUID(),
              `Failed to Register Module: ${ent.path}`,
              e,
            );
          });
        } catch (e: unknown) {
          await createIncidentEvent(
            crypto.randomUUID(),
            `Failed to Construct Module: ${ent.path}`,
            e as Error,
          );
        }
      }
    }
  }
}
