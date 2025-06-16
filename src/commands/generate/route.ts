import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toCamelCase, toKebabCase, pluralize } from '../../utils/stringUtils';
import { getSrcPath, getApiPrefix } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';

interface RouteOptions {
  prefix?: string;
  methods?: string;
  resource?: boolean;
  auth?: string;
  feature?: string; // Added to know where handlers are located
}

// Register Handlebars helpers (if not already globally registered in a central place)
Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);
Handlebars.registerHelper('pluralize', pluralize);
Handlebars.registerHelper('eq', (a, b) => a === b);


const defaultMethods = 'getById,post,put,delete,getAll'; // Matched to typical REST operations

// Maps CLI method names to handler function prefixes and template processing details
const methodDetails: { [key: string]: { handlerName: string, httpMethod: string } } = {
  'getbyid': { handlerName: 'get', httpMethod: 'GET' }, // Assumes get<Name>Handler
  'post': { handlerName: 'create', httpMethod: 'POST' },  // Assumes create<Name>Handler
  'put': { handlerName: 'update', httpMethod: 'PUT' },    // Assumes update<Name>Handler
  'delete': { handlerName: 'delete', httpMethod: 'DELETE' },// Assumes delete<Name>Handler
  'getall': { handlerName: 'getAll', httpMethod: 'GET' }, // Assumes getAll<Name>Handler (you might need a different handler for this)
};


export function generateRoute(name: string, options: RouteOptions) {
  const kebabCaseName = toKebabCase(name);
  const camelCaseName = toCamelCase(name);
  const pascalCaseName = toPascalCase(name);
  const feature = options.feature || kebabCaseName; // Default feature to kebab-case name

  let methodsToGenerate: string[];
  if (options.resource) {
    methodsToGenerate = ['getbyid', 'post', 'put', 'delete', 'getall'];
  } else {
    methodsToGenerate = (options.methods || defaultMethods).split(',').map(m => m.trim().toLowerCase());
  }

  const templateContent = getTemplateContent('route', 'route.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const templateMethods = methodsToGenerate.map(methodKey => {
    const detail = methodDetails[methodKey];
    if (!detail) {
      console.warn(`Warning: Route method '${methodKey}' is not recognized. Skipping.`);
      return null;
    }
    return {
      method: methodKey, // e.g., 'getById', 'post'
      handlerName: detail.handlerName, // e.g., 'get', 'create'
      httpMethod: detail.httpMethod // e.g., 'GET', 'POST'
    };
  }).filter(Boolean);

  const content = compiledTemplate({
    name: name,
    pascalCaseName,
    camelCaseName,
    kebabCaseName,
    feature, // Used to locate handlers
    prefix: options.prefix || getApiPrefix(),
    methods: templateMethods,
    // TODO: Add auth options to template context
  });

  const targetDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'routes');
  const targetFilePath = path.join(targetDir, `${kebabCaseName}.route.ts`);

  fs.ensureDirSync(targetDir);
  fs.writeFileSync(targetFilePath, content);

  console.log(`Route generated: ${targetFilePath}`);

  // Create dummy DTO file if it doesn't exist (similar to handler generation)
  const dtoDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', 'dto');
  fs.ensureDirSync(dtoDir);
  const dtoPath = path.join(dtoDir, `${toKebabCase(name)}.dto.ts`); // Corrected to use kebabCaseName
  if (!fs.existsSync(dtoPath)) {
    fs.writeFileSync(dtoPath, `
// Placeholder for ${pascalCaseName}Dto
import { z } from 'zod';
export const ${pascalCaseName}Dto = z.object({});
export const New${pascalCaseName}Dto = z.object({});
export const Update${pascalCaseName}Dto = z.object({});
`);
  }
  // Create dummy Handler files if they don't exist
  const handlerDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', feature);
  fs.ensureDirSync(handlerDir);
  const handlerFilePath = path.join(handlerDir, `${kebabCaseName}.handlers.ts`);
  if (!fs.existsSync(handlerFilePath)) {
      let handlerContent = `// Placeholder for ${pascalCaseName} Handlers
import { NoonyHandler } from '../../../../types/noony.types';
`;
      templateMethods.forEach(m => {
          if(m) {
            handlerContent += `
export const ${m.handlerName}${pascalCaseName}Handler: NoonyHandler = async (context) => { return { statusCode: 501, body: { message: "Not Implemented" } }; };
`;
          }
      });
      fs.writeFileSync(handlerFilePath, handlerContent);
  }
}

export function registerGenerateRouteCommand(program: Command) {
  program
    .command('route <name>')
    .alias('r')
    .description('Generate Fastify route definitions, linking to handlers. Creates placeholder DTO and Handler files if they do not exist.')
    .option('-p, --prefix <path>', `API URL prefix (e.g., "/users"). Default: From .noonyrc.json or "${getApiPrefix()}"`)
    .option('-m, --methods <methods>', 'Comma-separated list of methods for the route (e.g., "getById,post,put,delete,getAll"). Determines which handlers are imported and which route configurations are generated.')
    .option('--resource', 'Shorthand to generate standard RESTful resource routes (implies getById, post, put, delete, getAll). Overrides --methods if present.')
    .option('--auth <type>', 'Authentication type to be mentioned in generated comments (e.g., "jwt", "apiKey"). Informational only.')
    .option('-f, --feature <feature>', 'Feature group name, used to correctly path to handlers (e.g., "user-management"). Defaults to kebab-case of <name>.')
    .addHelpText('after', `
Examples:
  noony generate route item --resource --feature "inventory"
  noony generate route auth --methods "post" --prefix "/api/auth" --feature "authentication"`)
    .action(generateRoute);
}
