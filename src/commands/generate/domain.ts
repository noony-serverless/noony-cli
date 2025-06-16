import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toKebabCase } from '../../utils/stringUtils';
import { parseSchemaFields } from '../../utils/schemaParser';
import { getSrcPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';

interface DomainOptions {
  fields?: string;
}

Handlebars.registerHelper('pascalCase', toPascalCase);
// Not strictly needed for this template but good practice if other helpers are used elsewhere for domain
// Handlebars.registerHelper('camelCase', toCamelCase);
// Handlebars.registerHelper('kebabCase', toKebabCase);

export function generateDomain(name: string, options: DomainOptions) {
  const pascalCaseName = toPascalCase(name);
  const kebabCaseName = toKebabCase(name);

  // Parse fields, excluding 'id' if present, as 'id' is hardcoded in the template.
  // Or, ensure parseSchemaFields handles 'id' by not including it if it's already part of the fixed template.
  // For domain objects, 'id' is almost always `string | undefined`.
  const allFields = parseSchemaFields(options.fields);
  const regularFields = allFields.filter(f => !f.isIdField); // Exclude 'id' field from explicit generation

  const templateContent = getTemplateContent('domain', 'domain.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name: name, // original name
    pascalCaseName: pascalCaseName,
    fields: regularFields, // Pass only fields other than 'id', 'createdAt', 'updatedAt'
  });

  const targetDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'domain');
  const targetFilePath = path.join(targetDir, `${kebabCaseName}.do.ts`);

  fs.ensureDirSync(targetDir);
  fs.writeFileSync(targetFilePath, content);

  console.log(`Domain object generated: ${targetFilePath}`);
}

export function registerGenerateDomainCommand(program: Command) {
  program
    .command('domain <name>')
    .aliases(['do', 'gdo'])
    .description('Generate a new Domain Object interface')
    .option(
      '-f, --fields <fields>',
      'Comma-separated list of domain object fields (e.g., "name:string,description?:string,count:number,tags:string[]")'
    )
    .action(generateDomain);
}
