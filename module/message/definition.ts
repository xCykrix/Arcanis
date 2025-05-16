import { ApplicationCommandOptionTypes, ChannelTypes } from '@discordeno';
import type { ReactionType } from '../../lib/database/model/reaction.model.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.globalChatInputInteraction.add({
      name: 'message',
      description: 'Message Utilities Module',
      options: [
        {
          name: 'reaction',
          description: 'Manage Message Reaction(s)',
          type: ApplicationCommandOptionTypes.SubCommandGroup,
          options: [
            {
              name: 'set',
              description: 'Set a Reaction for the specified Media Type',
              type: ApplicationCommandOptionTypes.SubCommand,
              options: [
                {
                  name: 'channel',
                  description: 'The Channel to Set Reactions',
                  type: ApplicationCommandOptionTypes.Channel,
                  channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
                },
                {
                  name: 'type',
                  description: 'The Reactions to Add',
                  type: ApplicationCommandOptionTypes.String,
                  choices: [

                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

/** --- */

export type ReactionSet = {
  reaction?: {
    set?: {
      /** The Channel to Set Reactions. */
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** The Type of Content for the Reaction. */
      type: ReactionType;
      /** The Reactions to Add. */
      reactions: string[];
    };
  };
};

export type ReactionDelete = {
  reaction?: {
    delete?: {
      /** The Channel to Delete Reactions. */
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** The Type of Content for the Reaction. */
      type: ReactionType;
    };
  };
};

export type ReactionExclude = {
  reaction?: {
    exclusion?: {
      /** The Channel to Update Exclusions for. */
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** Type to Update */
      type: 'users' | 'roles';
    };
  };
};

export type ReactionList = {
  reaction?: {
    list?: {
      /** The Channel to List Reactions. */
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
    };
  };
};

export type ForwarderAdd = {
  forwarder?: {
    add?: {
      /** The from channel for Reactions. */
      from: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** The channel to send the message. */
      to: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** The reaction to forward with. */
      reaction: string;
      /** The required reactions to forward, including the bot's own. */
      threshold: number;
      /** How long, in seconds, a message is valid to forward. */
      within: number;
      /** The Message to Append as Alert. */
      alert?: string;
    };
  };
};

export type MessageforwardDelete = {
  forwarder?: {
    delete?: {
      /** The from channel for Reactions. */
      from: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** The reaction to delete the forwarder for. */
      reaction: string;
    };
  };
};

export type MessageForwardList = {
  forwarder?: {
    list?: {
      /** The channel to search from or to for Forwarders. */
      search: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
    };
  };
};

export type MessagePinSet = {
  pin?: {
    set?: {
      /** The Channel to Set a Pinned Message. */
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
      /** Post the pinned message after this many messages have been sent. */
      after: number;
      /** How long, in seconds, before posting the pinned message. Needs at least one message sent. */
      within: number;
      /** The message template to fill to modal builder. */
      template?: string;
    };
  };
};

export type MessagePinDelete = {
  pin?: {
    delete?: {
      /** The Channel to Delete a Pinned Message. */
      channel: typeof Bootstrap.bot.transformers.$inferredTypes.channel;
    };
  };
};

export type MessagePinList = {
  pin?: {
    list?: never;
  };
};

export type MessagePinTemplateAdd = {
  pin?: {
    'template-add'?: {
      name: string;
    };
  };
};

export type MessagePinTemplateDelete = {
  pin?: {
    'template-delete'?: {
      name: string;
    };
  };
};

export type MessagePinTemplateList = {
  pin?: {
    'template-list'?: never;
  };
};
