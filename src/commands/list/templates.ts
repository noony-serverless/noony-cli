import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra'; // To check existence if needed, or for future dynamic loading
import { logger } from '../../utils/logger';
  name: string;
  description: string;
  filePath: string; // Relative to project root or src for clarity
  // keyPlaceholders?: string[]; // Could be added later
  // associatedCommand?: string; // e.g., 'generate handler'
}

// Manually define the list of built-in templates for now
// Paths are illustrative, adjust to actual locations if different
const builtInTemplates: TemplateInfo[] = [
  {
    name: 'Handler',
    description: 'Generates a Noony request handler file with specified methods.',
    filePath: 'src/templates/handler.hbs',
  },
  {
    name: 'Route',
    description: 'Generates Fastify route definitions, linking to handlers.',
    filePath: 'src/templates/route.hbs',
  },
  {
    name: 'Service',
    description: 'Generates a service class with TypeDI integration and mappers.',
    filePath: 'src/templates/service.hbs',
  },
  {
    name: 'DAO (Data Access Object)',
    description: 'Generates a MongoDB DAO with Zod schema.',
    filePath: 'src/templates/dao.hbs',
  },
  {
    name: 'DTO (Data Transfer Object)',
    description: 'Generates Zod schemas for request/response DTOs.',
    filePath: 'src/templates/dto.hbs',
  },
  {
    name: 'Domain Object Interface',
    description: 'Generates a TypeScript interface for a domain entity.',
    filePath: 'src/templates/domain.hbs',
  },
  {
    name: 'API Class',
    description: 'Generates an API class that interacts with a service.',
    filePath: 'src/templates/api.hbs',
  },
  {
    name: 'Handler Unit Test',
    description: 'Generates a Jest unit test file for handlers.',
    filePath: 'src/templates/test-unit-handler.hbs',
  },
  {
    name: 'E2E Feature File',
    description: 'Generates a Cucumber .feature file for E2E tests.',
    filePath: 'src/templates/test-e2e-feature.hbs',
  },
  {
    name: 'E2E Step Definitions',
    description: 'Generates a TypeScript file for Cucumber step definitions.',
    filePath: 'src/templates/test-e2e-steps.hbs',
  },
  // Add other templates as they are created
];

export function listTemplates(options: any) {
  logger.plain(`
📦 Available Built-in Templates:`);
  logger.plain("--------------------------------");

  if (builtInTemplates.length === 0) {
    logger.info("No built-in templates defined yet.");
  } else {
    builtInTemplates.forEach(template => {
      // Optional: Check if template file actually exists
      // const fullPath = path.join(__dirname, '../../../', template.filePath);
      // if (!fs.existsSync(fullPath)) {
      //   logger.warn(`Template file not found for ${template.name} at ${template.filePath}`);
      //   // return; // Skip listing if not found, or list with a warning
      // }
      logger.plain(`
  • Name: ${chalk.bold(template.name)}`); // Using chalk directly for specific formatting
      logger.plain(`    Description: ${template.description}`);
      logger.plain(`    File Path: ${chalk.dim(template.filePath)}`);
    });
  }
  logger.plain("--------------------------------");
  logger.info("Note: Custom template listing will be available after .noonyrc.json configuration is implemented.");
}

export function registerListTemplatesCommand(program: Command) {
  const listCommand = program.command('list').alias('ls').description('List various available items within the Noony CLI ecosystem.');

  listCommand
    .command('templates')
    .alias('t')
    .description('Displays a list of all built-in Handlebars templates used for code generation, showing their names, descriptions, and file paths.')
    .addHelpText('after', `
Examples:
  noony list templates
  noony ls t`)
    .action(listTemplates);
}

// Direct chalk import for specific formatting not covered by logger
import chalk from 'chalk';
