import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toKebabCase, toCamelCase } from '../../utils/stringUtils';
import { parseSchemaFields, ParsedField } from '../../utils/schemaParser';
import { getSrcPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';

interface DtoOptions {
  fields?: string;
  validation?: boolean; // For future use
  nested?: boolean;     // For future use
}

Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);

export function generateDto(name: string, options: DtoOptions) {
  const pascalCaseName = toPascalCase(name);
  const kebabCaseName = toKebabCase(name);
  const allFields = parseSchemaFields(options.fields);

  // Separate 'id' field if present, as it's handled specially in DTOs
  const idField = allFields.find(f => f.isIdField);
  const regularFields = allFields.filter(f => !f.isIdField);

  // For New Dto, id is usually omitted or specifically defined (e.g. optional UUID)
  // For Main Dto, id is usually a required string (from DB _id.toString())
  // For Update Dto, all fields are partial, id is omitted from body

  const templateContent = getTemplateContent('dto', 'dto.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name: name,
    pascalCaseName,
    kebabCaseName,
    fields: regularFields, // Fields for the base schema
    idIsOptional: idField ? idField.isOptional : true, // If 'id' is in fields, respect its optionality for main DTO
                                                      // Otherwise, assume it's optional (typical for responses before creation)
    // For more complex DTOs, you might need separate field lists for New/Update/Main DTOs
    // e.g. newDtoFields, mainDtoFields, updateDtoFields
    // For now, the template uses baseSchema.omit().extend() or .partial()
    options: { // Pass CLI options for future template enhancements
      validation: options.validation,
      nested: options.nested,
    }
  });

  const targetDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', 'dto');
  const targetFilePath = path.join(targetDir, `${kebabCaseName}.dto.ts`);

  fs.ensureDirSync(targetDir);
  fs.writeFileSync(targetFilePath, content);
  console.log(`DTO generated: ${targetFilePath}`);

  if (options.validation) {
    console.log("Note: --validation flag was passed. You may need to manually add custom validation rules to the generated DTO file.");
  }
  if (options.nested) {
    console.log("Note: --nested flag was passed. You may need to manually define nested DTO schemas in the generated file.");
  }
}

export function registerGenerateDtoCommand(program: Command) {
  program
    .command('dto <name>')
    .aliases(['dt', 'gdt'])
    .description('Generate new DTO (Data Transfer Object) with Zod schemas')
    .option('-f, --fields <fields>', 'Comma-separated list of DTO fields (e.g., "name:string,email:string,age?:number,tags:string[]")')
    // .option('--validation', 'Add custom validation rules structure (Not fully implemented)')
    // .option('--nested', 'Generate nested object schemas structure (Not fully implemented)')
    .action(generateDto);
}
