import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from '@discordeno';
import { walk } from '@std/fs';
import { deepMerge } from 'deep-merge';
import { AsyncInitializable } from '../generic/initializable.ts';
import type { ChatInputCommandJSON, DynamicInjectedHandler, HandlerOptions } from '../generic/leafs.ts';
import { Optic } from './optic.ts';

/**
 * Dynamic Runtime Loader
 */
export class InjectionManager extends AsyncInitializable {
  public schema: Map<string, ChatInputCommandJSON> = new Map();
  public options: Map<string, HandlerOptions> = new Map();
  public handlers: Map<string, DynamicInjectedHandler<ChatInputCommandJSON>> = new Map();

  public inject(schema: ChatInputCommandJSON, options: HandlerOptions, handler: DynamicInjectedHandler<ChatInputCommandJSON>): void {
    function getOptionPaths(
      base: string,
      options?: readonly { name: string; type?: number; options?: unknown[] }[],
    ): string[] {
      if (!options) return [];
      const paths: string[] = [];
      for (const option of options) {
        // Only include if type is ChatInput, SubCommand, or SubCommandGroup
        if (
          option.type === ApplicationCommandTypes.ChatInput ||
          option.type === ApplicationCommandOptionTypes.SubCommand ||
          option.type === ApplicationCommandOptionTypes.SubCommandGroup
        ) {
          const currentPath = `${base}.${option.name}`;
          paths.push(currentPath);
          if ('options' in option && Array.isArray(option.options)) {
            paths.push(...getOptionPaths(currentPath, option.options as typeof options));
          }
        }
      }
      return paths;
    }

    const allPaths = [...getOptionPaths(schema.name, schema.options)];
    for (const path of allPaths) {
      this.handlers.set(path, handler);
      this.options.set(path, options);
    }

    if (!this.schema.has(schema.name)) {
      this.schema.set(schema.name, schema);
      return;
    }
    this.schema.set(
      schema.name,
      deepMerge.withOptions<ChatInputCommandJSON>(
        {
          arrayMergeStrategy: 'combine',
          setMergeStrategy: 'combine',
          mapMergeStrategy: 'combine',
        },
        this.schema.get(schema.name)!,
        schema,
      ),
    );
  }

  public override async initialize(): Promise<void> {
    const opts = {
      exts: ['.ts'],
      skip: [
        /\/logic\//g,
      ],
    };

    // Load AsyncInitializable Modules in Directories by default export.
    for (
      const ent of [
        ...(await Array.fromAsync(walk(new URL('../state/event', import.meta.url), opts))),
        ...(await Array.fromAsync(walk(new URL('../state/task', import.meta.url), opts))),
      ]
    ) {
      Optic.f.info(`Loading Module: ${ent.path}`);

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
        continue;
      }

      try {
        await (new imported.default()).initialize().catch((e: Error) => {
          Optic.incident({
            moduleId: 'DynamicModuleLoader',
            message: `Failed to Initialize Module: ${ent.path}`,
            err: e,
            dispatch: false,
          });
          return;
        });
      } catch (e: unknown) {
        await Optic.incident({
          moduleId: 'DynamicModuleLoader',
          message: `Failed to Construct Module: ${ent.path}`,
          err: e as Error,
          dispatch: false,
        });
        continue;
      }
    }

    // Inject Schemas to Master Registration
    for (
      const ent of [
        ...(await Array.fromAsync(walk(new URL('../state/schema', import.meta.url), opts))),
      ]
    ) {
      Optic.f.info(`Loading Schema: ${ent.path}`);

      const imported = await import(ent.path).catch((e: Error) => e) as {
        default: {
          schema: ChatInputCommandJSON;
          options: HandlerOptions;
          handler: DynamicInjectedHandler<ChatInputCommandJSON>;
        };
      } | Error;
      if (imported instanceof Error) {
        await Optic.incident({
          moduleId: 'DynamicModuleLoader',
          message: `Failed to Import Schema: ${ent.path}`,
          err: imported,
          dispatch: false,
        });
        continue;
      }

      if (imported.default?.schema?.type === undefined) throw new Deno.errors.InvalidData(`Invalid Schema: ${ent.path} does not have a type defined.`);
      this.inject(imported.default.schema, imported.default.options, imported.default.handler);
    }
  }
}
