import type { MessageComponent } from '@discordeno';
import { Bootstrap } from '../../../mod.ts';
import { createIncidentEvent } from '../../logging/optic.ts';
import { Responses } from '../helper/responses.ts';

export class ComponentHandler {
  #initialized = false;
  #expectations: Expectations = {
    header: 'not configured',
    allowApplicationUser: false,
    allowBotUser: false,
    requireAuthor: false,
    within: 600,
  };
  #handle: (interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction) => Promise<void> = async () => {};

  /**
   * Creates a Component Handler Instance Builder.
   *
   * @returns A {@link ComponentHandler}.
   */
  public static builder(): ComponentHandler {
    return new ComponentHandler();
  }

  public static makeCustomId(header: string, userId: string | null, packet: string[]): string {
    const chunks: string[] = [header];
    if (userId !== null) {
      chunks.push(`${userId}+${Date.now()}`);
    } else {
      chunks.push(`null+${Date.now()}`);
    }
    chunks.push(...packet);
    return chunks.join('/');
  }

  public static unmakeCustomId(customId: string): {
    header: string;
    userId: string | null;
    timestamp: number;
    packet: string[];
  } {
    const chunks = customId.split('/');
    const header = chunks.shift()!;
    const gid: string[] | null = chunks.shift()!.split('+')!;
    return {
      header,
      userId: gid[0] === 'null' ? null : gid[0],
      timestamp: parseInt(gid[1]!),
      packet: chunks,
    };
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

  /** Set the {@link Expectations}. */
  public expectation(expectations: Expectations): ComponentHandler {
    this.#expectations = expectations;
    return this;
  }

  /** Set the callback handler. */
  public handle(handle: (interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction) => Promise<void>): ComponentHandler {
    this.#handle = handle;
    return this;
  }

  /** Called to 'build' the Component Handler. Must be called as last step and only once. */
  public build(): void {
    // Initialization Guard
    if (this.#initialized) return;
    this.#initialized = true;

    // Warning
    if (this.#expectations.header === 'not configured') {
      createIncidentEvent(crypto.randomUUID(), 'Expectations for ComponentHandlerBuilder were not set. This handler will not process events.', new Deno.errors.InvalidData('ComponentHandlerBuilder#expectation must be called.'));
    }

    // Register
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!this.enforce(interaction)) return;
      await this.#handle(interaction);
    });
  }

  /** Enforce the {@link Expectations}. */
  private enforce(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): boolean {
    if (interaction.data === undefined) return false;
    if (interaction.data.customId === undefined) return false;
    if (!this.#expectations.allowApplicationUser && interaction.user.id === Bootstrap.bot.applicationId) return false;
    if (!this.#expectations.allowBotUser && interaction.user.bot) return false;

    // Break Chunks
    const customIdChunks = ComponentHandler.unmakeCustomId(interaction.data.customId);

    // Enforce Header
    if (customIdChunks.header !== this.#expectations.header) return false;

    // Enforce Author
    if (this.#expectations.requireAuthor && interaction.user.id.toString() !== customIdChunks.userId) {
      interaction.respond({
        embeds: Responses.error.make()
          .setDescription('I will not respond to this request unless you are the original author if this interaction. Please issue the original request again.'),
      }, {
        isPrivate: true,
      });
      return false;
    }

    // Enforce Timestamp
    if ((this.#expectations.within !== -1) && ((interaction.message?.timestamp ?? customIdChunks.timestamp ?? Number.MAX_SAFE_INTEGER) < (Date.now() - this.#expectations.within * 1000))) {
      interaction.respond({
        embeds: Responses.error.make()
          .setDescription('I have timed out waiting on this request and will no longer respond to this interaction. Please issue the original request again.'),
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
  /** The header (first chunk) routing identifier. */
  header: string;
  /** The time, within seconds, that you must respond with this component (Message Only). */
  within: number | -1;
  /** If the bot application can create this interaction. */
  allowApplicationUser: boolean;
  /** If a bot can create this interaction. */
  allowBotUser: boolean;
  /** If only the original user can perform this interaction. */
  requireAuthor: boolean;
}
