#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { registerGenerateHandlerCommand } from './commands/generate/handler';
import { registerGenerateRouteCommand } from './commands/generate/route';
import { registerGenerateServiceCommand } from './commands/generate/service';
import { registerGenerateDaoCommand } from './commands/generate/dao';
import { registerGenerateDtoCommand } from './commands/generate/dto';
import { registerGenerateDomainCommand } from './commands/generate/domain'; // Add this import

const program = new Command();

program
  .name('noony')
  .description('CLI tool to generate components for the Noony + Fastify serverless architecture')
  .version(version);

const generateCommand = program.command('generate').alias('g').description('Generate Noony components');

registerGenerateHandlerCommand(generateCommand);
registerGenerateRouteCommand(generateCommand);
registerGenerateServiceCommand(generateCommand);
registerGenerateDaoCommand(generateCommand);
registerGenerateDtoCommand(generateCommand);
registerGenerateDomainCommand(generateCommand); // Add this line
// Other generate subcommands will be registered here

program.parse(process.argv);
