import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toCamelCase, toKebabCase } from '../../utils/stringUtils';
import { getSrcPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';

interface ApiOptions {
  service?: boolean; // Not actively used yet, but kept from spec
  methods?: string;
}

Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);

const defaultApiMethods = 'get,create,update,delete,getAll'; // getAll added

export function generateApi(name: string, options: ApiOptions) {
  const pascalCaseName = toPascalCase(name);
  const camelCaseName = toCamelCase(name);
  const kebabCaseName = toKebabCase(name);

  const methodsArg = (options.methods || defaultApiMethods).split(',').map(m => m.trim().toLowerCase());
  const methodsForTemplate = {
    get: methodsArg.includes('get'),
    create: methodsArg.includes('create'),
    update: methodsArg.includes('update'),
    delete: methodsArg.includes('delete'),
    getAll: methodsArg.includes('getall'), // Added getAll
  };

  const templateContent = getTemplateContent('api', 'api.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name: name,
    pascalCaseName,
    camelCaseName,
    kebabCaseName,
    methods: methodsForTemplate,
  });

  // Corrected path as per issue doc: src/chrome/handlers/api/<name>Api.ts
  const targetDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', 'api');
  const targetFilePath = path.join(targetDir, `${pascalCaseName}Api.ts`); // User PascalCase for filename

  fs.ensureDirSync(targetDir);
  fs.writeFileSync(targetFilePath, content);

  console.log(`API class generated: ${targetFilePath}`);

  // Create placeholder Service file if it doesn't exist
  const serviceDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'services');
  fs.ensureDirSync(serviceDir);
  const servicePath = path.join(serviceDir, `${pascalCaseName}Service.ts`);
  if (!fs.existsSync(servicePath)) {
    fs.writeFileSync(servicePath, `
// Placeholder for ${pascalCaseName}Service
import { Service } from 'typedi';
import { ${pascalCaseName} } from '../domain/${kebabCaseName}.do'; // Assuming domain object path
// import { ${pascalCaseName}Dao } from '../../infra/db/${kebabCaseName}.dao'; // Assuming DAO path

@Service()
export class ${pascalCaseName}Service {
  // constructor(private ${camelCaseName}Dao: ${pascalCaseName}Dao) {}

  async get${pascalCaseName}(id: string): Promise<${pascalCaseName} | null> { console.log('Service: get${pascalCaseName} placeholder hit'); return null; }
  async create${pascalCaseName}(data: ${pascalCaseName}): Promise<${pascalCaseName}> { console.log('Service: create${pascalCaseName} placeholder hit'); return data; }
  async update${pascalCaseName}(id: string, data: Partial<${pascalCaseName}>): Promise<${pascalCaseName} | null> { console.log('Service: update${pascalCaseName} placeholder hit'); return null; }
  async delete${pascalCaseName}(id: string): Promise<boolean> { console.log('Service: delete${pascalCaseName} placeholder hit'); return false; }
  async getAll${pascalCaseName}s(queryParams?: any): Promise<${pascalCaseName}[]> { console.log('Service: getAll${pascalCaseName}s placeholder hit'); return []; }
}
`);
  }

  // Create placeholder Domain Object file if it doesn't exist
  const domainDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'domain');
  fs.ensureDirSync(domainDir);
  const domainPath = path.join(domainDir, `${kebabCaseName}.do.ts`);
  if (!fs.existsSync(domainPath)) {
    fs.writeFileSync(domainPath, `
// Placeholder for ${pascalCaseName} Domain Object
export interface ${pascalCaseName} {
  id?: string;
  // Add other fields here
  createdAt?: Date;
  updatedAt?: Date;
}
`);
  }
}

export function registerGenerateApiCommand(program: Command) {
  program
    .command('api <name>')
    .aliases(['ga'])
    .description('Generate a new API class')
    .option('--service', 'Corresponds to a service (implicit for now)') // Kept from spec
    .option('-m, --methods <methods>', 'Comma-separated list of API methods (get,create,update,delete,getAll)', defaultApiMethods)
    .action(generateApi);
}
