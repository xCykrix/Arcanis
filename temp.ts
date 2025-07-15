import { schema, SlashCommand } from './lib/generic/command.ts';

@SlashCommand('test', 'Test Command')
export class TestCommand {
}

console.info(schema);
