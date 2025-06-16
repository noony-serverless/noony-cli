import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra'; // To check existence if needed, or for future dynamic loading

interface TemplateInfo {
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
  console.log(`
📦 Available Built-in Templates:`);
  console.log("--------------------------------");

  if (builtInTemplates.length === 0) {
    console.log("No built-in templates defined yet.");
  } else {
    builtInTemplates.forEach(template => {
      // Check if template file actually exists before listing (optional, good for robustness)
      // const fullPath = path.join(__dirname, '../../../', template.filePath); // Adjust relative path calculation
      // if (!fs.existsSync(fullPath)) {
      //   console.warn(`Warning: Template file not found for ${template.name} at ${template.filePath}`);
      //   return;
      // }
      console.log(`  • Name: ${template.name}`);
      console.log(`    Description: ${template.description}`);
      console.log(`    File Path: ${template.filePath}`);
      // if (template.keyPlaceholders && template.keyPlaceholders.length > 0) {
      //   console.log(`    Key Placeholders: ${template.keyPlaceholders.join(', ')}`);
      // }
    });
  }
  console.log("--------------------------------");
  // TODO: Future enhancement - Discover and list custom templates from .noonyrc.json
  console.log(`
ℹ️  Note: Custom template listing will be available after .noonyrc.json configuration is implemented.`);
}

export function registerListTemplatesCommand(program: Command) {
  const listCommand = program.command('list').alias('ls').description('List available Noony items.');

  listCommand
    .command('templates')
    .alias('t')
    .description('Shows available built-in templates and their customization options.')
    .action(listTemplates);
}
