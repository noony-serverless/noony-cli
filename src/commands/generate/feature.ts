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
import { logger } from '../../utils/logger';
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
  skipE2eTests?: boolean;  // More granular test skip
}

const defaultCrudMethods = 'get,post,put,delete,getAll';

export async function generateFeature(name: string, options: FeatureOptions) {
  logger.info(`🚀 Generating full feature: ${name}`);
  logger.plain('------------------------------------------');

  const featureNameForGroup = options.featureGroupName || toKebabCase(name);
  const methodsToUse = options.crudMethods || defaultCrudMethods;
  const fieldsToUse = options.fields; // Can be undefined

  // 1. Domain Object
  if (!options.skipDomain) {
    logger.info(`Generating Domain Object for ${name}...`);
    generateDomain(name, { fields: fieldsToUse });
  } else {
    logger.info(`Skipping Domain Object for ${name}.`);
  }

  // 2. DTO Schemas
  if (!options.skipDto) {
    logger.info(`Generating DTOs for ${name}...`);
    generateDto(name, { fields: fieldsToUse });
  } else {
    logger.info(`Skipping DTOs for ${name}.`);
  }

  // 3. DAO
  if (!options.skipDao) {
    logger.info(`Generating DAO for ${name}...`);
    generateDao(name, {
      schemaFields: options.daoSchemaFields || fieldsToUse,
      collection: options.collection,
      identifier: options.daoIdentifier
    });
  } else {
    logger.info(`Skipping DAO for ${name}.`);
  }

  // 4. Service
  if (!options.skipService) {
    logger.info(`Generating Service for ${name}...`);
    generateService(name, {
      methods: methodsToUse,
      dao: true // Assume DAO is related
    });
  } else {
    logger.info(`Skipping Service for ${name}.`);
  }

  // 5. API Class
  if (!options.skipApi) {
    logger.info(`Generating API Class for ${name}...`);
    generateApi(name, { methods: methodsToUse });
  } else {
    logger.info(`Skipping API Class for ${name}.`);
  }

  // 6. Handlers
  if (!options.skipHandlers) {
    logger.info(`Generating Handlers for ${name}...`);
    generateHandler(name, {
      methods: methodsToUse,
      feature: featureNameForGroup,
      auth: options.auth
      // validation: true // Consider if a global validation flag is needed
    });
  } else {
    logger.info(`Skipping Handlers for ${name}.`);
  }

  // 7. Routes
  if (!options.skipRoutes) {
    logger.info(`Generating Routes for ${name}...`);
    generateRoute(name, {
      methods: methodsToUse,
      prefix: options.routePrefix,
      feature: featureNameForGroup, // To link to correct handlers
      auth: options.auth
      // resource: true // Could be an option, for now methods drive it
    });
  } else {
    logger.info(`Skipping Routes for ${name}.`);
  }

  // 8. Tests
  if (!options.skipTests) {
    if (!options.skipUnitTests) {
      logger.info(`Generating Unit Tests for ${name} Handlers...`);
      generateTest('handler', name, {
        unit: true,
        feature: featureNameForGroup,
        methods: methodsToUse
      });
      // TODO: Add unit tests for services, DAOs too if desired
    } else {
      logger.info(`Skipping Unit Tests for ${name}.`);
    }

    if (!options.skipE2eTests) {
      logger.info(`Generating E2E Tests for ${name} feature...`);
      generateTest('e2e', name, { e2e: true }); // 'e2e' type for generateTest handles both feature & steps
    } else {
      logger.info(`Skipping E2E Tests for ${name}.`);
    }
  } else {
    logger.info(`Skipping all Tests for ${name}.`);
  }

  logger.plain('------------------------------------------');
  logger.success(`Feature generation for ${name} complete!`);
  logger.info("Remember to install dependencies and check generated files for TODOs or customizations.");
}

export function registerGenerateFeatureCommand(program: Command) {
  program
    .command('feature <name>')
    .alias('gf')
    .description('Generate a complete feature set: Domain, DTOs, DAO, Service, API, Handlers, Routes, and Tests. Individual parts can be skipped using --skip-<part> flags.')
    .option('-f, --fields <fields>', 'Comma-separated fields for Domain, DTO, and default DAO schema (e.g., "title:string,completed?:boolean"). Types are string, number, boolean, date, objectId, uuid, or custom types for domain/DTOs.')
    .option('--dao-schema-fields <fields>', 'Specific comma-separated fields for DAO schema if different from --fields.')
    .option('--collection <name>', 'MongoDB collection name for DAO (e.g., "user_profiles"). Defaults to pluralized <name>.')
    .option('--dao-identifier <field>', 'Primary identifier for DAO methods (e.g., "userId"). Defaults to "id".')
    .option('-m, --crud-methods <methods>', `Comma-separated list of CRUD methods to generate for applicable components (e.g., "get,post,put"). Default: "${defaultCrudMethods}"`)
    .option('--route-prefix <prefix>', 'URL prefix for API routes (e.g., "/users"). Default: From .noonyrc.json or "/v1".')
    .option('--feature-group-name <group>', 'Sub-directory name for organizing handlers and their tests (e.g., "user-management"). Defaults to kebab-case of <name>.')
    .option('--auth <type>', 'Authentication type to be mentioned in generated comments (e.g., "jwt", "apiKey"). Informational only.')
    .option('--skip-domain', 'Skip Domain Object generation.')
    .option('--skip-dto', 'Skip DTO (Data Transfer Objects) generation.')
    .option('--skip-dao', 'Skip DAO (Data Access Object) generation.')
    .option('--skip-service', 'Skip Service class generation.')
    .option('--skip-api', 'Skip API class generation (controller/handler helper).')
    .option('--skip-handlers', 'Skip request Handlers generation.')
    .option('--skip-routes', 'Skip API Routes generation.')
    .option('--skip-tests', 'Skip all Test generation (unit and E2E).')
    .option('--skip-unit-tests', 'Skip Unit Test generation for handlers.')
    .option('--skip-e2e-tests', 'Skip E2E Test generation (feature and steps files).')
    .addHelpText('after', `
Examples:
  noony generate feature product --fields "name:string,price:number,description?:string"
  noony generate feature user --fields "email:string,username:string" --crud-methods "get,post" --skip-dao --skip-tests`)
    .action(generateFeature);
}
