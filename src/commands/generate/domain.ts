import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toKebabCase, toCamelCase } from '../../utils/stringUtils';
import { parseSchemaFields, ParsedField } from '../../utils/schemaParser';
import { getSrcPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';
import { logger } from '../../utils/logger';
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

  try {
    fs.ensureDirSync(targetDir);
    fs.writeFileSync(targetFilePath, content);
    logger.generated(targetFilePath, `${pascalCaseName} Domain Object`);
  } catch (e: any) {
    logger.error(`Failed to generate Domain Object '${name}': ${e.message}`);
  }
}

export function registerGenerateDomainCommand(program: Command) {
  program
    .command('domain <name>')
    .aliases(['do', 'gdo'])
    .description('Generate a new Domain Object TypeScript interface. This represents the core business entity.')
    .option('-f, --fields <fields>', 'Comma-separated list of domain object fields and their types (e.g., "name:string,description?:string,count:number,tags:string[],isActive:boolean,contact:ContactDto"). Use "?" for optional fields. Custom types can be used.')
    .addHelpText('after', `
Examples:
  noony generate domain user --fields "username:string,email:string,isActive?:boolean"
  noony generate domain product --fields "productName:string,price:number,category:string,details:ProductDetail"`)
    .action(generateDomain);
}
