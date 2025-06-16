import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toCamelCase, toKebabCase } from '../../utils/stringUtils';
import { getSrcPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';
import { logger } from '../../utils/logger';
  dao?: boolean;
  registration?: 'auto' | 'manual';
  methods?: string;
}

// Ensure Handlebars helpers are registered (if not done globally)
Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);

const defaultServiceMethods = 'get,create,update,delete';

export function generateService(name: string, options: ServiceOptions) {
  const pascalCaseName = toPascalCase(name);
  const camelCaseName = toCamelCase(name);
  const kebabCaseName = toKebabCase(name);

  const methodsArg = (options.methods || defaultServiceMethods).split(',').map(m => m.trim().toLowerCase());
  const methodsForTemplate = {
    get: methodsArg.includes('get'),
    create: methodsArg.includes('create'),
    update: methodsArg.includes('update'),
    delete: methodsArg.includes('delete'),
  };

  const templateContent = getTemplateContent('service', 'service.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name: name,
    pascalCaseName,
    camelCaseName,
    kebabCaseName,
    methods: methodsForTemplate,
    // registration: options.registration || 'auto', // For future use if template needs to adapt
  });

  const targetDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'services');
  const targetFilePath = path.join(targetDir, `${pascalCaseName}Service.ts`);

  try {
    fs.ensureDirSync(targetDir);
    fs.writeFileSync(targetFilePath, content);
    logger.generated(targetFilePath, `${pascalCaseName} Service`);

    if (options.registration === 'manual') {
      logger.info(`
NOTE: Manual registration selected. Please update your TypeDI container configuration (e.g., src/config/container.ts) to include ${pascalCaseName}Service.`);
    }

    // Create placeholder DAO file
  // This helps the service compile. Actual DAO generation is a separate step.
  // For now, always create if it doesn't exist as service depends on it.
  const daoDir = path.join(process.cwd(), getSrcPath(), 'infra', 'db');
  fs.ensureDirSync(daoDir);
  const daoPath = path.join(daoDir, `${kebabCaseName}.dao.ts`);
  if (!fs.existsSync(daoPath)) {
    fs.writeFileSync(daoPath, `
// Placeholder for ${pascalCaseName}Dao
import { Service } from 'typedi';
import { ObjectId } from 'mongodb';
import { MongoDao } from './mongo.dao'; // Assuming a base MongoDao exists
import { MongodbConnectService } from './mongodb-connect-service'; // Assuming this service exists

export const ${pascalCaseName}MongoSchema = z.object({ /* TODO: Define schema */ _id: z.instanceof(ObjectId).optional() });
export type ${pascalCaseName}Document = z.infer<typeof ${pascalCaseName}MongoSchema>;

// @Service() // DAOs might not always be TypeDI services if instantiated by services
export class ${pascalCaseName}Dao extends MongoDao<${pascalCaseName}Document> {
  constructor(mongoService: MongodbConnectService) {
    super(mongoService, '${toKebabCase(name)}s', ${pascalCaseName}MongoSchema);
  }
  async findById(id: string): Promise<${pascalCaseName}Document | null> { return null; }
  async insertOne(doc: Partial<${pascalCaseName}Document>): Promise<${pascalCaseName}Document | null> { return null; }
  async updateById(id: string, doc: Partial<${pascalCaseName}Document>): Promise<${pascalCaseName}Document | null> { return null; }
  async deleteById(id: string): Promise<boolean> { return false; }
}
`);
    logger.info(`Placeholder created: ${daoPath}`);

    // mongo.dao.ts placeholder
    const mongoDaoPath = path.join(process.cwd(), getSrcPath(), 'infra', 'db', 'mongo.dao.ts');
    if (!fs.existsSync(mongoDaoPath)) {
        fs.writeFileSync(mongoDaoPath, \`
import { z } from 'zod';
import { Collection, ObjectId } from 'mongodb';
import { MongodbConnectService } from './mongodb-connect-service';
export abstract class MongoDao<T extends { _id?: ObjectId }> {
    protected collection: Collection<T>;
    constructor(
        protected mongoService: MongodbConnectService,
        collectionName: string,
        protected schema: z.ZodType<T>
    ) {
        this.collection = this.mongoService.db.collection<T>(collectionName);
    }
    // Basic placeholder methods
    async findOne(filter: any): Promise<T | null> { return null; }
    // Add other common methods
}
    \`);
        logger.info(`Placeholder created: ${mongoDaoPath}`);
    }

    // mongodb-connect-service.ts placeholder
    const mongoConnectServicePath = path.join(process.cwd(), getSrcPath(), 'infra', 'db', 'mongodb-connect-service.ts');
    if (!fs.existsSync(mongoConnectServicePath)) {
        fs.writeFileSync(mongoConnectServicePath, \`
import { Service } from 'typedi';
import { Db } from 'mongodb';
// @Service()
export class MongodbConnectService {
    public db!: Db;
    constructor() { /* TODO: Initialize MongoDB connection */ }
}
    \`);
        logger.info(`Placeholder created: ${mongoConnectServicePath}`);
    }
  }

  // Create placeholder Domain Object file
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
    logger.info(`Placeholder created: ${domainPath}`);
  }

  // Import Zod into the placeholder DAO for the schema if DAO was created/modified
  if (fs.existsSync(daoPath)) { // Check if DAO path actually exists (it should if no skip)
    let daoContent = fs.readFileSync(daoPath, 'utf-8');
    if (!daoContent.includes("import { z } from 'zod';")) {
      // This might be risky if the file is not what we expect.
      // A safer approach would be to include it in the template or ensure the placeholder has it.
      // For now, proceeding with caution.
      try {
        fs.writeFileSync(daoPath, "import { z } from 'zod';\n" + daoContent);
      } catch (e:any) {
        logger.warn(`Could not prepend "import { z } from 'zod';" to ${daoPath}: ${e.message}`);
      }
    }
  }
  } catch (e: any) {
    logger.error(`Failed to generate Service '${name}': ${e.message}`);
  }
}

export function registerGenerateServiceCommand(program: Command) {
  program
    .command('service <name>')
    .alias('s')
    .description('Generate a new Service class with mappers. Creates placeholder DAO and Domain Object if they do not exist.')
    .option('--dao', 'Corresponds to a DAO (currently implicit, future use for specific DAO linkage)')
    .option('--registration <type>', 'Service registration pattern for TypeDI (auto|manual). Default: "auto". Currently informational.')
    .option('-m, --methods <methods>', `Comma-separated list of service methods to generate (e.g., "get,create,update,delete"). Default: "${defaultServiceMethods}"`)
    .addHelpText('after', `
Examples:
  noony generate service user
  noony generate service product --methods "get,create,update,delete,customMethod"`)
    .action(generateService);
}
