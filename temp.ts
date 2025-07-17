// import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from '@discordeno';
// import { type CommandSchema, pick } from './lib/generic/schema.ts';

// export const schema = {
//   name: 'test',
//   description: 'Test Command',
//   type: ApplicationCommandTypes.ChatInput,
//   flags: {
//     requireGuild: true,
//     supportedChannelType: [],
//     requireUserGuildPermissions: [],
//     requireUserChannelPermissions: [],
//     requireBotGuildPermissions: [],
//     requireBotChannelPermissions: [],
//     requireDeveloper: false,
//   },
//   options: [
//     {
//       name: 'one-level-sub',
//       description: 'A single level sub command!',
//       type: ApplicationCommandOptionTypes.SubCommand,
//       options: [
//         {
//           name: 'one-lvl-sub-opt',
//           description: 'A option!',
//           type: ApplicationCommandOptionTypes.Integer,
//         },
//       ],
//     },
//     {
//       name: 'sub',
//       description: 'Test Sub Command',
//       type: ApplicationCommandOptionTypes.SubCommandGroup,
//       flags: {
//         requireGuild: true,
//         supportedChannelType: [],
//         requireUserGuildPermissions: [],
//         requireUserChannelPermissions: [],
//         requireBotGuildPermissions: [],
//         requireBotChannelPermissions: [],
//         requireDeveloper: false,
//       },
//       options: [
//         {
//           name: 'sub-sub',
//           description: 'A sub command of the sub command group!',
//           type: ApplicationCommandOptionTypes.SubCommand,
//           options: [
//             {
//               name: 'sub-sub-opt',
//               description: 'Deepest opts!',
//               type: ApplicationCommandOptionTypes.Boolean,
//               required: true,
//             },
//           ],
//         },
//         {
//           name: 'sub-opt',
//           description: 'Deeper opts!',
//           type: ApplicationCommandOptionTypes.String,
//           required: true,
//         },
//       ],
//       execute: async ({
//         subCommandGroup,
//         subCommand,
//         args,
//       }) => {
//         if (!subCommand) return;
//         if (subCommandGroup[0] === '')
//       },
//     },
//   ],
// } as const satisfies CommandSchema;

// export const picked = pick(schema);
