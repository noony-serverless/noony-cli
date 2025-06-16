import { Command } from 'commander';
import { generateFeature } from './feature'; // Import the main feature generator
// import { toKebabCase } from '../../utils/stringUtils';

interface ResourceOptions {
  // Fields for Domain, DTO, DAO
  fields?: string;

  // Collection name for DAO (optional, can be derived)
  collection?: string;
  // Identifier for DAO (optional, defaults in underlying generators)
  daoIdentifier?: string;

  // Route prefix (optional, defaults in underlying generators)
  routePrefix?: string;

  // Auth for Handler/Route (future use, pass along)
  auth?: string;

  // Skip certain parts (less likely to be used for 'resource' but possible)
  skipDomain?: boolean;
  skipDto?: boolean;
  skipDao?: boolean;
  skipService?: boolean;
  skipApi?: boolean;
  skipHandlers?: boolean;
  skipRoutes?: boolean;
  skipTests?: boolean;
  skipUnitTests?: boolean;
  skipE2eTests?: boolean;
}

// Standard CRUD methods for a RESTful resource
const resourceCrudMethods = 'get,post,put,delete,getAll';

export async function generateResource(name: string, options: ResourceOptions) {
  console.log(`🧱 Generating RESTful resource: ${name}`);
  console.log('------------------------------------------');

  // Prepare options for the core 'generateFeature' command
  // 'generateResource' acts as a specialized preset for 'generateFeature'
  await generateFeature(name, {
    fields: options.fields,
    daoSchemaFields: options.fields, // Use the same fields for DAO by default for resource
    collection: options.collection,
    daoIdentifier: options.daoIdentifier,
    crudMethods: resourceCrudMethods, // Enforce standard REST CRUD methods
    routePrefix: options.routePrefix,
    // featureGroupName will be derived from 'name' by generateFeature if not set
    // auth will be passed through if provided
    auth: options.auth,

    // Pass skip options through
    skipDomain: options.skipDomain,
    skipDto: options.skipDto,
    skipDao: options.skipDao,
    skipService: options.skipService,
    skipApi: options.skipApi,
    skipHandlers: options.skipHandlers,
    skipRoutes: options.skipRoutes,
    skipTests: options.skipTests,
    skipUnitTests: options.skipUnitTests,
    skipE2eTests: options.skipE2eTests,
  });

  // No need for separate console messages here as generateFeature handles them.
  // console.log(`✅ RESTful resource generation for ${name} (using feature generator) complete!`);
}

export function registerGenerateResourceCommand(program: Command) {
  program
    .command('resource <name>')
    .aliases(['gres', 'res'])
    .description(
      'Generate a RESTful CRUD resource (domain, DTO, DAO, service, API, handlers, routes, tests)'
    )
    .option(
      '-f, --fields <fields>',
      'Comma-separated fields for Domain, DTO, and DAO (e.g., "name:string,price:number,category:string")'
    )
    .option(
      '--collection <name>',
      'MongoDB collection name for DAO (defaults to pluralized name)'
    )
    .option(
      '--dao-identifier <field>',
      'Primary identifier for DAO methods (default: id)'
    )
    .option('--route-prefix <prefix>', 'Prefix for API routes (e.g., /v1)')
    .option('--auth <type>', 'Authentication type for handlers/routes')
    .option('--skip-domain', 'Skip Domain Object generation')
    .option('--skip-dto', 'Skip DTO generation')
    .option('--skip-dao', 'Skip DAO generation')
    .option('--skip-service', 'Skip Service generation')
    .option('--skip-api', 'Skip API class generation')
    .option('--skip-handlers', 'Skip Handlers generation')
    .option('--skip-routes', 'Skip Routes generation')
    .option('--skip-tests', 'Skip all Test generation')
    .option('--skip-unit-tests', 'Skip Unit Test generation')
    .option('--skip-e2e-tests', 'Skip E2E Test generation')
    .action(generateResource);
}
