import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { logger } from '../../utils/logger';
import { getSrcPath } from '../../utils/configLoader'; // To respect custom src paths

async function findPotentialServices(basePath: string, pattern: string, componentType: string): Promise<string[]> {
  const classNames: string[] = [];
  try {
    const files = await glob(pattern, { cwd: basePath, absolute: true }); // Use absolute for easier readFile
    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');
      const match = content.match(/export\s+class\s+(\w+)/);
      if (match && match[1]) {
        classNames.push(match[1]);
      }
    }
  } catch (e: any) {
    logger.error(`Error scanning for ${componentType} in ${basePath}: ${e.message}`);
  }
  return classNames;
}

export async function updateDeps(options: any) {
  logger.plain("
🔄 Checking for potential dependency updates (TypeDI container)...");
  logger.plain("------------------------------------------------------------------");
  logger.info("This command lists potential services, APIs, and DAOs that might need to be registered in your TypeDI container.");
  logger.warn("It does NOT automatically modify any files.
");

  const projectRoot = process.cwd();
  const srcDir = getSrcPath(); // Get src path from config or default

  const servicesPath = path.join(projectRoot, srcDir, 'chrome', 'services');
  const apiPath = path.join(projectRoot, srcDir, 'chrome', 'handlers', 'api');
  const daoPath = path.join(projectRoot, srcDir, 'infra', 'db');

  let foundSomething = false;

  try {
    if (await fs.pathExists(servicesPath)) {
      const serviceClasses = await findPotentialServices(servicesPath, '*Service.ts', 'Service');
      if (serviceClasses.length > 0) {
        foundSomething = true;
        logger.info("Found potential Services (@Service classes usually):");
        serviceClasses.forEach(sc => logger.plain(`  - ${sc} (in ${path.relative(projectRoot, servicesPath)} )`));
      }
    } else {
      logger.warn(`Service directory not found: ${path.join(srcDir, 'chrome', 'services')}`);
    }

    if (await fs.pathExists(apiPath)) {
      const apiClasses = await findPotentialServices(apiPath, '*Api.ts', 'API Class');
       if (apiClasses.length > 0) {
        foundSomething = true;
        logger.info("
Found potential API classes (@Service classes usually):");
        apiClasses.forEach(ac => logger.plain(`  - ${ac} (in ${path.relative(projectRoot, apiPath)} )`));
      }
    } else {
      logger.warn(`API Class directory not found: ${path.join(srcDir, 'chrome', 'handlers', 'api')}`);
    }

    if (await fs.pathExists(daoPath)) {
      const daoClasses = await findPotentialServices(daoPath, '*.dao.ts', 'DAO');
      const filteredDaoClasses = daoClasses.filter(dc => dc !== 'MongoDao');
      if (filteredDaoClasses.length > 0) {
        foundSomething = true;
        logger.info("
Found potential DAOs (some might be @Service):");
        filteredDaoClasses.forEach(dc => logger.plain(`  - ${dc} (in ${path.relative(projectRoot, daoPath)} )`));
      }
    } else {
      logger.warn(`DAO directory not found: ${path.join(srcDir, 'infra', 'db')}`);
    }
  } catch (e: any) {
    logger.error(`An error occurred while scanning project directories: ${e.message}`);
    foundSomething = true; // To ensure the final actionable message is displayed
  }


  if (!foundSomething) {
     logger.info("No potential services, APIs, or DAOs found in standard locations.");
  }

  logger.plain("
------------------------------------------------------------------");
  logger.warn("ACTION REQUIRED: Please review the list above and ensure these components are correctly registered in your TypeDI container file (e.g., src/config/container.ts or where you manage your TypeDI setup).");
  logger.info("For components decorated with @Service(), TypeDI might handle them automatically if your setup scans for them. For others, manual registration might be needed.");
}

export function registerUpdateDepsCommand(program: Command) {
  const updateCommand = program.command('update').alias('u').description('Provides utilities for project updates and maintenance.');

  updateCommand
    .command('deps')
    .alias('d')
    .description('Scans the project for Services, APIs, and DAOs, then advises on their TypeDI container registration. Does not modify files.')
    .addHelpText('after', `
Examples:
  noony update deps
  noony u d`)
    .action(updateDeps);
}
