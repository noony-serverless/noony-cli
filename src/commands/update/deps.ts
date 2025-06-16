import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

async function findPotentialServices(
  basePath: string,
  pattern: string,
  _componentType: string
): Promise<string[]> {
  const files = await glob(pattern, { cwd: basePath });
  const classNames: string[] = [];

  for (const file of files) {
    const filePath = path.join(basePath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    // Simple regex to find exported class names. Might need refinement for complex cases.
    const match = content.match(/export\s+class\s+(\w+)/);
    if (match && match[1]) {
      classNames.push(match[1]);
    }
  }
  return classNames;
}

export async function updateDeps(_options: any) {
  console.log(`
🔄 Checking for potential dependency updates (TypeDI container)...`);
  console.log(
    '------------------------------------------------------------------'
  );
  console.log(
    'This command lists potential services, APIs, and DAOs that might need to be registered in your TypeDI container.'
  );
  console.log(`It does NOT automatically modify any files.
`);

  const projectRoot = process.cwd();
  const servicesPath = path.join(projectRoot, 'src', 'chrome', 'services');
  const apiPath = path.join(projectRoot, 'src', 'chrome', 'handlers', 'api');
  const daoPath = path.join(projectRoot, 'src', 'infra', 'db');

  let foundSomething = false;

  if (await fs.pathExists(servicesPath)) {
    const serviceClasses = await findPotentialServices(
      servicesPath,
      '*Service.ts',
      'Service'
    );
    if (serviceClasses.length > 0) {
      foundSomething = true;
      console.log('Found potential Services (@Service classes usually):');
      serviceClasses.forEach(sc =>
        console.log(
          `  - ${sc} (in ${path.relative(projectRoot, servicesPath)} )`
        )
      );
    }
  } else {
    console.log(' известных Service directory not found: src/chrome/services');
  }

  if (await fs.pathExists(apiPath)) {
    const apiClasses = await findPotentialServices(
      apiPath,
      '*Api.ts',
      'API Class'
    );
    if (apiClasses.length > 0) {
      foundSomething = true;
      console.log(`
Found potential API classes (@Service classes usually):`);
      apiClasses.forEach(ac =>
        console.log(`  - ${ac} (in ${path.relative(projectRoot, apiPath)} )`)
      );
    }
  } else {
    console.log(
      ' известных API Class directory not found: src/chrome/handlers/api'
    );
  }

  if (await fs.pathExists(daoPath)) {
    // For DAOs, not all might be @Service decorated, but they are often dependencies.
    const daoClasses = await findPotentialServices(daoPath, '*.dao.ts', 'DAO');
    // Filter out the base MongoDao
    const filteredDaoClasses = daoClasses.filter(dc => dc !== 'MongoDao');
    if (filteredDaoClasses.length > 0) {
      foundSomething = true;
      console.log(`
Found potential DAOs (some might be @Service):`);
      filteredDaoClasses.forEach(dc =>
        console.log(`  - ${dc} (in ${path.relative(projectRoot, daoPath)} )`)
      );
    }
  } else {
    console.log(' известных DAO directory not found: src/infra/db');
  }

  if (!foundSomething) {
    console.log(
      'No potential services, APIs, or DAOs found in standard locations.'
    );
  }

  console.log(`
------------------------------------------------------------------`);
  console.log(
    `ACTION REQUIRED: Please review the list above and ensure these components are correctly registered in your TypeDI container file (e.g., src/config/container.ts or where you manage your TypeDI setup).`
  );
  console.log(
    'For components decorated with @Service(), TypeDI might handle them automatically if your setup scans for them. For others, manual registration might be needed.'
  );
}

export function registerUpdateDepsCommand(program: Command) {
  const updateCommand = program
    .command('update')
    .alias('u')
    .description('Utility commands for updating project parts.');

  updateCommand
    .command('deps')
    .alias('d')
    .description(
      'Checks and advises on TypeDI container registration for services, APIs, and DAOs.'
    )
    .action(updateDeps);
}
