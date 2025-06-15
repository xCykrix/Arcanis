import { walk } from '@fs/walk';
import { AsyncInitializable } from '../generic/initializable.ts';
import { Optic } from './optic.ts';

/**
 * Dynamic Runtime Loader
 */
Array.fromAsync;
export class DynamicModuleLoader extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    const opts = {
      exts: ['.ts'],
      skip: [
        /\/logic\//g,
      ],
    };
    for (
      const ent of [
        ...(await Array.fromAsync(walk(new URL('../../module', import.meta.url), opts))),
        ...(await Array.fromAsync(walk(new URL('../task', import.meta.url), opts))),
      ]
    ) {
      const imported = await import(ent.path).catch((e: Error) => e) as {
        default: new () => AsyncInitializable;
      } | Error;
      if (imported instanceof Error) {
        await Optic.incident({
          moduleId: 'DynamicModuleLoader',
          message: `Failed to Import Module: ${ent.path}`,
          err: imported,
          dispatch: false,
        });
      } else {
        try {
          await (new imported.default()).initialize().catch((e) => {
            Optic.incident({
              moduleId: 'DynamicModuleLoader',
              message: `Failed to Register Module: ${ent.path}`,
              err: e,
              dispatch: false,
            });
          });
        } catch (e: unknown) {
          Optic.incident({
            moduleId: 'DynamicModuleLoader',
            message: `Failed to Construct Module: ${ent.path}`,
            err: e as Error,
            dispatch: false,
          });
        }
      }
    }
  }
}
