import { ApplicationCommandOptionTypes, ChannelTypes, type CreateSlashApplicationCommand } from '@discordeno';
import type { CommandOptions } from '../../lib/builder/group.ts';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

const definition = {
  name: 'pinger',
  description: 'Manager server and personal pinger configurations.',
  options: [
    {
      name: 'manage',
      description: 'Manage the available pinger channels, restrictions, and settings.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'add-channel',
          description: 'Add a channel to the available personal pinger list.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to add.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ],
        },
        {
          name: 'remove-channel',
          description: 'Remove a channel from the available personal pinger list.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'channel',
              description: 'The channel to remove.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ],
        },
        {
          name: 'list-channels',
          description: 'List the currently configured pinger channels.',
          type: ApplicationCommandOptionTypes.SubCommand,
        },
        {
          name: 'add-role',
          description: "Adds a role's restrictions to be available to the use the personal pingers.",
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'role',
              description: 'The role to set the restrictions of.',
              type: ApplicationCommandOptionTypes.Role,
              required: true,
            },
            {
              name: 'pingers',
              description: 'Set the maximum number of personal pingers this role can create.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 0,
              maxValue: 50,
              required: true,
            },
            {
              name: 'channels',
              description: 'Set the maximum channels per pinger for this role.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 0,
              maxValue: 200,
              required: true,
            },
            {
              name: 'keywords',
              description: 'Set the maximum number of individal keywords that will process per pinger for this role.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 0,
              maxValue: 1000,
              required: true,
            },
          ],
        },
        {
          name: 'remove-role',
          description: "Removes a role's access and retrictions to the use of personal pingers.",
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'role',
              description: 'The role to remove the access restrictions of.',
              type: ApplicationCommandOptionTypes.Role,
              required: true,
            },
          ],
        },
        {
          name: 'list-roles',
          description: 'Lists the roles configured with access and restrictions to the personal pingers.',
          type: ApplicationCommandOptionTypes.SubCommand,
        },
        {
          name: 'configure',
          description: 'Set the cooldown for the server and personal pingers by product title and/or SKU.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'cooldown',
              description: 'The time in seconds between alerts from the pingers by product. 0 will disable. Default 5.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 0,
              maxValue: 30,
              required: true,
            },
            {
              name: 'delete-after',
              description: 'The time in seconds to delete the alert after it has been sent. 0 will disable. Default 120.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 0,
              maxValue: 900,
              required: true,
            },
            {
              name: 'alert-message',
              description: 'The message to send when a pinger is triggered.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 200,
              required: false,
            },
          ],
        },
      ],
    },
    {
      name: 'server',
      description: 'Manage the in-server pinger notification groups.',
      type: ApplicationCommandOptionTypes.SubCommandGroup,
      options: [
        {
          name: 'create',
          description: 'Create a pinger.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The unique name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
            },
            // TODO: Add Options from Update Command
          ],
        },
        {
          name: 'get',
          description: 'Get the current configuration of a pinger.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
          ],
        },
        {
          name: 'delete',
          description: 'Delete a in-server pinger notification group.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
          ],
        },
        {
          name: 'add-channels',
          description: 'Adds a channel to be watched by a pinger.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
            {
              name: 'channels',
              description: 'A list of channels to add to the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 6000,
              required: true,
            },
          ],
        },
        {
          name: 'remove-channel',
          description: 'Remove a specific channel being watched by a pinger.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
            {
              name: 'channel',
              description: 'The channel to remove from the pinger.',
              type: ApplicationCommandOptionTypes.Channel,
              channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
              required: true,
            },
          ],
        },
        {
          name: 'add-alert-role',
          description: 'Adds a role to be alerted by the pinger.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
            {
              name: 'roles',
              description: 'A list of roles to add to the pinger.',
              type: ApplicationCommandOptionTypes.String,
              required: true,
            },
          ],
        },
        {
          name: 'remove-alert-role',
          description: 'Remove a specific channel being watched by a pinger.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
            {
              name: 'role',
              description: 'A role to remove from the pinger alert.',
              type: ApplicationCommandOptionTypes.Role,
              required: true,
            },
          ],
        },
        {
          name: 'keywords',
          description: 'Open a editor for the pinger keywords.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'name',
              description: 'The name of the pinger.',
              type: ApplicationCommandOptionTypes.String,
              minLength: 1,
              maxLength: 100,
              required: true,
              autocomplete: true,
            },
          ],
        },
      ],
    },
    // {
    //   name: 'personal',
    //   description: 'Manage personal pinger notification groups.',
    //   type: ApplicationCommandOptionTypes.SubCommandGroup,
    //   options: [
    //     {
    //       name: 'create',
    //       description: 'Create a pinger.',
    //       type: ApplicationCommandOptionTypes.SubCommand,
    //       options: [
    //         {
    //           name: 'name',
    //           description: 'The unique name of the pinger.',
    //           type: ApplicationCommandOptionTypes.String,
    //           minLength: 1,
    //           maxLength: 100,
    //           required: true,
    //         },
    //       ],
    //     },
    //     {
    //       name: 'get',
    //       description: 'Get the current configuration of a pinger.',
    //       type: ApplicationCommandOptionTypes.SubCommand,
    //       options: [
    //         {
    //           name: 'name',
    //           description: 'The name of the pinger.',
    //           type: ApplicationCommandOptionTypes.String,
    //           minLength: 1,
    //           maxLength: 100,
    //           required: true,
    //           autocomplete: true,
    //         },
    //       ],
    //     },
    //     {
    //       name: 'keywords',
    //       description: 'Open a editor for the pinger keywords.',
    //       type: ApplicationCommandOptionTypes.SubCommand,
    //       options: [
    //         {
    //           name: 'name',
    //           description: 'The name of the pinger.',
    //           type: ApplicationCommandOptionTypes.String,
    //           minLength: 1,
    //           maxLength: 100,
    //           required: true,
    //           autocomplete: true,
    //         },
    //       ],
    //     },
    //     {
    //       name: 'delete',
    //       description: 'Delete a in-server pinger notification group.',
    //       type: ApplicationCommandOptionTypes.SubCommand,
    //       options: [
    //         {
    //           name: 'name',
    //           description: 'The name of the pinger.',
    //           type: ApplicationCommandOptionTypes.String,
    //           minLength: 1,
    //           maxLength: 100,
    //           required: true,
    //           autocomplete: true,
    //         },
    //       ],
    //     },
    //     {
    //       name: 'add-channel',
    //       description: 'Adds a channel to be watched by a pinger.',
    //       type: ApplicationCommandOptionTypes.SubCommand,
    //       options: [
    //         {
    //           name: 'name',
    //           description: 'The name of the pinger.',
    //           type: ApplicationCommandOptionTypes.String,
    //           minLength: 1,
    //           maxLength: 100,
    //           required: true,
    //           autocomplete: true,
    //         },
    //         {
    //           name: 'channel',
    //           description: 'The channel to add to the pinger.',
    //           type: ApplicationCommandOptionTypes.Channel,
    //           channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
    //           required: true,
    //         },
    //       ],
    //     },
    //     {
    //       name: 'remove-channel',
    //       description: 'Remove a specific channel being watched by a pinger.',
    //       type: ApplicationCommandOptionTypes.SubCommand,
    //       options: [
    //         {
    //           name: 'name',
    //           description: 'The name of the pinger.',
    //           type: ApplicationCommandOptionTypes.String,
    //           minLength: 1,
    //           maxLength: 100,
    //           required: true,
    //           autocomplete: true,
    //         },
    //         {
    //           name: 'channel',
    //           description: 'The channel to remove from the pinger.',
    //           type: ApplicationCommandOptionTypes.Channel,
    //           channelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
    //           required: true,
    //         },
    //       ],
    //     },
    //   ],
    // },
  ],
} as const satisfies CreateSlashApplicationCommand;
export type PingerDefinition = CommandOptions<typeof definition.options>;

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.guildChatInputInteraction.add(definition);
  }
}
