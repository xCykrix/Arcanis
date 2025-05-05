import type { MessageComponent } from '@discordeno';
import { Bootstrap } from '../../../mod.ts';
import { DatabaseConnector } from '../../database/database.ts';
import type { Component } from '../../database/model/component.model.ts';
import { Responses } from '../helper/responses.ts';

export class ComponentHandler {
  #initialized = false;
  #expectations: Expectations | null = null;
  #handle: (interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction, self: ComponentHandler) => Promise<void> = async () => {};

  /**
   * Creates a Component Handler Instance Builder.
   *
   * @returns A {@link ComponentHandler}.
   */
  public static builder(expectations: Expectations): ComponentHandler {
    const state = new ComponentHandler();
    state.#expectations = expectations;
    return state;
  }

  public static parseModal<T extends Record<string, string>>(components?: MessageComponent[]): Partial<T> {
    const records: Record<string, string | undefined> = {};

    for (const component of components ?? []) {
      if (component.type === 1) {
        for (const subcomponent of component.components) {
          if (subcomponent.type === 4) {
            if (subcomponent.customId === undefined) continue;
            records[subcomponent.customId] = subcomponent.value;
          }
        }
      }
    }

    return records as Partial<T>;
  }

  /** Set the Callback Handler. */
  public handle(handle: (interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction, self: ComponentHandler) => Promise<void>): ComponentHandler {
    this.#handle = handle;
    return this;
  }

  /** Make a Unique Component ID. */
  public async makeId(packet: {
    userId: string | null;
    constants: string[];
  }): Promise<string> {
    if (this.#expectations === null) throw new Deno.errors.InvalidData('Expectations for ComponentHandler were not set. This is required to make an identifier.');
    const ruid = crypto.randomUUID();
    await DatabaseConnector.appd.component.add({
      moduleId: this.#expectations.moduleId,
      callbackId: ruid,
      userId: packet.userId,
      createdAt: Date.now(),
      constants: packet.constants,
    }, {
      expireIn: ((this.#expectations?.within ?? null) !== null) ? this.#expectations!.within! * 1000 : undefined,
    });
    return `${this.#expectations.moduleId}/${ruid}`;
  }

  public async getCallbackId(customId: string): Promise<Component | null> {
    customId = customId.split('/')[1];
    return (await DatabaseConnector.appd.component.findByPrimaryIndex('callbackId', customId))?.value ?? null;
  }

  /** Called to 'build' the Component Handler. Must be called as last step and only once. */
  public build(): void {
    // Initialization Guard
    if (this.#initialized) return;
    this.#initialized = true;

    // Register
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!(await this.enforce(interaction))) return;
      await this.#handle(interaction, this);
    });
  }

  /** Enforce the {@link Expectations}. */
  private async enforce(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): Promise<boolean> {
    if (interaction.data === undefined) return false;
    if (interaction.data.customId === undefined) return false;
    if (!interaction.data.customId.includes(this.#expectations?.moduleId ?? 'ffffffff')) return false;

    // Get Callback and Validate
    const callback = await this.getCallbackId(interaction.data.customId);
    if (callback === null) {
      interaction.respond({
        embeds: Responses.error.make()
          .setDescription('I have timed out waiting on this request and will no longer respond to this interaction. Please issue the original request again.'),
      }, {
        isPrivate: true,
      });
      return false;
    }
    if (callback?.moduleId !== this.#expectations?.moduleId) return false;

    // Enforce Author
    if (this.#expectations?.requireAuthor && (interaction.user.id.toString() !== callback.userId)) {
      interaction.respond({
        embeds: Responses.error.make()
          .setDescription('I will not respond to this request unless you are the original author if this interaction. Please issue the original request again.'),
      }, {
        isPrivate: true,
      });
      return false;
    }

    // Success! Expectations are enforced.
    return true;
  }
}

export interface Expectations {
  /** The filtering module identifier. Unique to each module. */
  moduleId: string;
  /** If only the original user can perform this interaction. */
  requireAuthor: boolean;
  /** The time, within seconds, that you must respond with this component (Message Only). */
  within: number | null;
}
