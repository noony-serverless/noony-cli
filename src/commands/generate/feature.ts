import { Command } from 'commander';
import { generateDomain } from './domain';
import { generateDto } from './dto';
import { generateDao } from './dao';
import { generateService } from './service';
import { generateApi } from './api';
import { generateHandler } from './handler';
import { generateRoute } from './route';
import { generateTest } from './test';
import { toKebabCase } from '../../utils/stringUtils';

interface FeatureOptions {
  // Fields for Domain, DTO, DAO
  fields?: string;
  // Schema fields specifically for DAO (if different from general fields)
  daoSchemaFields?: string;
  // Collection name for DAO
  collection?: string;
  // Identifier for DAO
  daoIdentifier?: string;

  // Methods for Handler, Route, Service, API
  // e.g., "get,post,put,delete,getAll"
  crudMethods?: string;

  // Specific to Route
  routePrefix?: string;

  // Specific to Handler/Handler Tests
  // If not provided, will default to kebab-case of 'name'
  featureGroupName?: string;

  // Auth for Handler/Route (future use, pass along)
  auth?: string;

  // Skip certain parts
  skipDomain?: boolean;
  skipDto?: boolean;
  skipDao?: boolean;
  skipService?: boolean;
  skipApi?: boolean;
  skipHandlers?: boolean;
  skipRoutes?: boolean;
  skipTests?: boolean;
  skipUnitTests?: boolean; // More granular test skip
  skipE2eTests?: boolean; // More granular test skip
}

const defaultCrudMethods = 'get,post,put,delete,getAll';

export async function generateFeature(name: string, options: FeatureOptions) {
  console.log(`🚀 Generating full feature: ${name}`);
  console.log('------------------------------------------');

  const featureNameForGroup = options.featureGroupName || toKebabCase(name);
  const methodsToUse = options.crudMethods || defaultCrudMethods;
  const fieldsToUse = options.fields; // Can be undefined

  // 1. Domain Object
  if (!options.skipDomain) {
    console.log(`
Domain Object for ${name}...`);
    generateDomain(name, { fields: fieldsToUse });
  } else {
    console.log(`
Skipping Domain Object for ${name}.`);
  }

  // 2. DTO Schemas
  if (!options.skipDto) {
    console.log(`
DTOs for ${name}...`);
    generateDto(name, { fields: fieldsToUse });
  } else {
    console.log(`
Skipping DTOs for ${name}.`);
  }

  // 3. DAO
  if (!options.skipDao) {
    console.log(`
DAO for ${name}...`);
    generateDao(name, {
      schemaFields: options.daoSchemaFields || fieldsToUse,
      collection: options.collection,
      identifier: options.daoIdentifier,
    });
  } else {
    console.log(`
Skipping DAO for ${name}.`);
  }

  // 4. Service
  if (!options.skipService) {
    console.log(`
Service for ${name}...`);
    generateService(name, {
      methods: methodsToUse,
      dao: true, // Assume DAO is related
    });
  } else {
    console.log(`
Skipping Service for ${name}.`);
  }

  // 5. API Class
  if (!options.skipApi) {
    console.log(`
API Class for ${name}...`);
    generateApi(name, { methods: methodsToUse });
  } else {
    console.log(`
Skipping API Class for ${name}.`);
  }

  // 6. Handlers
  if (!options.skipHandlers) {
    console.log(`
Handlers for ${name}...`);
    generateHandler(name, {
      methods: methodsToUse,
      feature: featureNameForGroup,
      auth: options.auth,
      // validation: true // Consider if a global validation flag is needed
    });
  } else {
    console.log(`
Skipping Handlers for ${name}.`);
  }

  // 7. Routes
  if (!options.skipRoutes) {
    console.log(`
Routes for ${name}...`);
    generateRoute(name, {
      methods: methodsToUse,
      prefix: options.routePrefix,
      feature: featureNameForGroup, // To link to correct handlers
      auth: options.auth,
      // resource: true // Could be an option, for now methods drive it
    });
  } else {
    console.log(`
Skipping Routes for ${name}.`);
  }

  // 8. Tests
  if (!options.skipTests) {
    if (!options.skipUnitTests) {
      console.log(`
Unit Tests for ${name} Handlers...`);
      generateTest('handler', name, {
        unit: true,
        feature: featureNameForGroup,
        methods: methodsToUse,
      });
      // TODO: Add unit tests for services, DAOs too if desired
    } else {
      console.log(`
Skipping Unit Tests for ${name}.`);
    }

    if (!options.skipE2eTests) {
      console.log(`
E2E Tests for ${name} feature...`);
      generateTest('e2e', name, { e2e: true }); // 'e2e' type for generateTest handles both feature & steps
    } else {
      console.log(`
Skipping E2E Tests for ${name}.`);
    }
  } else {
    console.log(`
Skipping all Tests for ${name}.`);
  }

  console.log('------------------------------------------');
  console.log(`✅ Feature generation for ${name} complete!`);
  console.log(
    'Remember to install dependencies and check generated files for TODOs or customizations.'
  );
}

export function registerGenerateFeatureCommand(program: Command) {
  program
    .command('feature <name>')
    .alias('gf')
    .description(
      'Generate a complete feature (domain, DTO, DAO, service, API, handlers, routes, tests)'
    )
    .option(
      '-f, --fields <fields>',
      'Comma-separated fields for Domain, DTO, and potentially DAO (e.g., "title:string,completed?:boolean")'
    )
    .option(
      '--dao-schema-fields <fields>',
      'Specific comma-separated fields for DAO schema (if different from --fields)'
    )
    .option('--collection <name>', 'MongoDB collection name for DAO')
    .option(
      '--dao-identifier <field>',
      'Primary identifier for DAO methods (default: id)'
    )
    .option(
      '-m, --crud-methods <methods>',
      `Comma-separated CRUD methods (default: "${defaultCrudMethods}")`
    )
    .option(
      '--route-prefix <prefix>',
      'Prefix for API routes (e.g., /v1, default is /v1 from route generator)'
    )
    .option(
      '--feature-group-name <group>',
      'Specific feature group name for handler/test paths (defaults to kebab-case of <name>)'
    )
    .option(
      '--auth <type>',
      'Authentication type for handlers/routes (e.g., api-key, bearer - for future use by underlying generators)'
    )
    .option('--skip-domain', 'Skip Domain Object generation')
    .option('--skip-dto', 'Skip DTO generation')
    .option('--skip-dao', 'Skip DAO generation')
    .option('--skip-service', 'Skip Service generation')
    .option('--skip-api', 'Skip API class generation')
    .option('--skip-handlers', 'Skip Handlers generation')
    .option('--skip-routes', 'Skip Routes generation')
    .option('--skip-tests', 'Skip all Test generation')
    .option(
      '--skip-unit-tests',
      'Skip Unit Test generation (if --skip-tests is not used)'
    )
    .option(
      '--skip-e2e-tests',
      'Skip E2E Test generation (if --skip-tests is not used)'
    )
    .action(generateFeature);
}
