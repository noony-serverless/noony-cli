#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { registerGenerateHandlerCommand } from './commands/generate/handler';
import { registerGenerateRouteCommand } from './commands/generate/route';
import { registerGenerateServiceCommand } from './commands/generate/service';
import { registerGenerateDaoCommand } from './commands/generate/dao';
import { registerGenerateDtoCommand } from './commands/generate/dto';
import { registerGenerateDomainCommand } from './commands/generate/domain';
import { registerGenerateApiCommand } from './commands/generate/api';
import { registerGenerateTestCommand } from './commands/generate/test';
import { registerGenerateFeatureCommand } from './commands/generate/feature';
import { registerGenerateResourceCommand } from './commands/generate/resource';
import { registerListTemplatesCommand } from './commands/list/templates';
import { registerValidateCommand } from './commands/validate/project';
import { registerUpdateDepsCommand } from './commands/update/deps'; // Add this import

const program = new Command();

program
  .name('noony')
  .description(
    'CLI tool to generate components for the Noony + Fastify serverless architecture'
  )
  .version(version);

const generateCommand = program
  .command('generate')
  .alias('g')
  .description('Generate Noony components');

registerGenerateHandlerCommand(generateCommand);
registerGenerateRouteCommand(generateCommand);
registerGenerateServiceCommand(generateCommand);
registerGenerateDaoCommand(generateCommand);
registerGenerateDtoCommand(generateCommand);
registerGenerateDomainCommand(generateCommand);
registerGenerateApiCommand(generateCommand);
registerGenerateTestCommand(generateCommand);
registerGenerateFeatureCommand(generateCommand);
registerGenerateResourceCommand(generateCommand);

// Register the 'list' command and its subcommands
registerListTemplatesCommand(program);
registerValidateCommand(program);
registerUpdateDepsCommand(program); // Add this line

program.parse(process.argv);
