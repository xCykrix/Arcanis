import { walk } from '@std/fs';
import { deepMerge, type DeepMergeOptions } from 'deep-merge';
import { AsyncInitializable } from '../generic/initializable.ts';
import type { ChatInputCommandJSON, DynamicInjectedHander } from '../generic/leafs.ts';

import { Optic } from './optic.ts';

/**
 * Dynamic Runtime Loader
 */
export class DynamicInjectionModule extends AsyncInitializable {
  public static schema: Map<string, ChatInputCommandJSON> = new Map();
  public static handlers: Map<string, DynamicInjectedHander<ChatInputCommandJSON>> = new Map();

  private static options: DeepMergeOptions = {
    arrayMergeStrategy: 'combine',
    setMergeStrategy: 'combine',
    mapMergeStrategy: 'combine',
  };

  public static inject(schema: ChatInputCommandJSON, handler: DynamicInjectedHander<ChatInputCommandJSON>): void {
    // Recursively generate all option paths (e.g., conf.set-alert, conf.set-alert.channel)
    function getOptionPaths(base: string, options?: readonly any[]): string[] {
      if (!options) return [];
      const paths: string[] = [];
      for (const option of options) {
        const currentPath = `${base}.${option.name}`;
        paths.push(currentPath);
        if ('options' in option && Array.isArray(option.options)) {
          paths.push(...getOptionPaths(currentPath, option.options));
        }
      }
      return paths;
    }

    const allPaths = [...getOptionPaths(schema.name, schema.options)];
    for (const path of allPaths) {
      this.handlers.set(path, handler);
    }

    if (!this.schema.has(schema.name)) {
      this.schema.set(schema.name, schema);
      return;
    }
    this.schema.set(schema.name, deepMerge.withOptions<ChatInputCommandJSON>(this.options, this.schema.get(schema.name)!, schema));
  }

  public override async initialize(): Promise<void> {
    const opts = {
      exts: ['.ts'],
      skip: [
        /\/logic\//g,
      ],
    };
    for (
      const ent of [
        ...(await Array.fromAsync(walk(new URL('../schema', import.meta.url), opts))),
      ]
    ) {
      const imported = await import(ent.path).catch((e: Error) => e) as {
        default: {
          schema: ChatInputCommandJSON;
          handler: DynamicInjectedHander<ChatInputCommandJSON>;
        };
      } | Error;
      if (imported instanceof Error) {
        await Optic.incident({
          moduleId: 'DynamicModuleLoader',
          message: `Failed to Import Module: ${ent.path}`,
          err: imported,
          dispatch: false,
        });
      } else {
        if (imported.default?.schema?.type === undefined) throw new Deno.errors.InvalidData(`Invalid Schema: ${ent.path} does not have a type defined.`);
        DynamicInjectionModule.inject(imported.default.schema, imported.default.handler);
      }
    }
  }
}

// setTimeout(() => {
//   new DynamicInjectionModule().initialize().catch((e) => {
//     console.error('Failed to initialize DynamicInjectionModule:', e);
//   });
//   setTimeout(() => {
//     console.info(`DynamicInjectionModule loaded ${DynamicInjectionModule.schema.size} schemas.`);
//     // console.info(JSON.stringify(DynamicInjectionModule.schema.values().toArray(), null, 2));
//   }, 2000);
// }, 1);
