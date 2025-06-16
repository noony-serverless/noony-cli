import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toCamelCase, toKebabCase, pluralize, lowerCase } from '../../utils/stringUtils';
import { getSrcPath, getTestPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';
import { logger } from '../../utils/logger';
  unit?: boolean;
  e2e?: boolean;
  feature?: string; // For handler unit tests: feature group where handler is located
  methods?: string; // For handler unit tests: which methods to generate tests for
}

// Handler method details - this might be better shared or imported if identical to other command files
const defaultHandlerMethods = 'get,post,put,delete,getAll';
const handlerMethodDetails: { [key: string]: { methodName: string; action: string; statusCode: number; hasParams: boolean; hasBody: boolean, returnsList?: boolean } } = {
    get: { methodName: 'get', action: 'retrieved', statusCode: 200, hasParams: true, hasBody: false, returnsList: false },
    post: { methodName: 'create', action: 'created', statusCode: 201, hasParams: false, hasBody: true, returnsList: false },
    put: { methodName: 'update', action: 'updated', statusCode: 200, hasParams: true, hasBody: true, returnsList: false },
    delete: { methodName: 'delete', action: 'deleted', statusCode: 200, hasParams: true, hasBody: false, returnsList: false },
    getall: { methodName: 'getAll', action: 'retrieved', statusCode: 200, hasParams: false, hasBody: false, returnsList: true }
};

// E2E method details for feature file generation - simplified for now
const e2eFeatureMethods = {
    post: true, getById: true, getAll: true, put: true, delete: true,
};

Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);
Handlebars.registerHelper('pluralize', pluralize);
Handlebars.registerHelper('lowerCase', lowerCase);

function generateHandlerUnitTest(name: string, options: TestOptions) {
  const pascalCaseName = toPascalCase(name);
  const camelCaseName = toCamelCase(name);
  const kebabCaseName = toKebabCase(name);
  // If --feature is not provided, default to the kebab-case name of the handler
  const featureName = options.feature || kebabCaseName;

  const methodsOpt = (options.methods || defaultHandlerMethods).split(',').map(m => m.trim().toLowerCase());
  const methodsForTemplate = methodsOpt.map(mKey => handlerMethodDetails[mKey]).filter(Boolean);

  const templateContent = getTemplateContent('testUnitHandler', 'test-unit-handler.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name, // original name
    pascalCaseName,
    camelCaseName,
    kebabCaseName,
    feature: featureName, // for path and imports
    methods: methodsForTemplate,
  });

  const targetDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', featureName);
  const targetFilePath = path.join(targetDir, `${kebabCaseName}.handlers.test.ts`);

  try {
    fs.ensureDirSync(targetDir);
    fs.writeFileSync(targetFilePath, content);
    logger.generated(targetFilePath, `${pascalCaseName} Handler Unit Test`);

    // Create dummy API and Handler files
    const apiDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', 'api');
    fs.ensureDirSync(apiDir);
    const apiPath = path.join(apiDir, `${pascalCaseName}Api.ts`);
    if (!fs.existsSync(apiPath)) {
      let apiMethodsContent = '';
      methodsForTemplate.forEach(m => {
        if (m) apiMethodsContent += `  async ${m.methodName}${pascalCaseName}(...args: any[]): Promise<any> {return {};}\n`;
      });
      fs.writeFileSync(apiPath, `// Placeholder for ${pascalCaseName}Api\nexport class ${pascalCaseName}Api {\n${apiMethodsContent}}\n`);
      logger.info(`Placeholder created: ${apiPath}`);
    }

    const handlerActualFileDir = path.join(process.cwd(), getSrcPath(), 'chrome', 'handlers', featureName);
    fs.ensureDirSync(handlerActualFileDir);
    const handlerPath = path.join(handlerActualFileDir, `${kebabCaseName}.handlers.ts`);
    if (!fs.existsSync(handlerPath)) {
        let handlerMethodsContent = '';
        methodsForTemplate.forEach(m => {
          if (m) handlerMethodsContent += `export const ${m.methodName}${pascalCaseName}Handler: NoonyHandler = async (ctx) => ({statusCode: 200, body: {data: {}, message: "ok"}});\n`;
        });
        fs.writeFileSync(handlerPath, `// Placeholder for ${pascalCaseName} Handlers\nimport { NoonyHandler } from '../../../../types/noony.types';\n${handlerMethodsContent}`);
        logger.info(`Placeholder created: ${handlerPath}`);
    }
    const typesDir = path.join(process.cwd(), getSrcPath(), 'types');
    fs.ensureDirSync(typesDir);
    const noonyTypesPath = path.join(typesDir, 'noony.types.ts');
    if(!fs.existsSync(noonyTypesPath)) {
      fs.writeFileSync(noonyTypesPath, "// Placeholder for NoonyHandler type\nexport type NoonyHandler = (context: any) => Promise<any>;\n");
      logger.info(`Placeholder created: ${noonyTypesPath}`);
    }
  } catch (e: any) {
    logger.error(`Failed to generate Handler Unit Test for '${name}': ${e.message}`);
  }
}

function generateE2eFeatureFile(name: string, options: TestOptions) {
  const kebabCaseName = toKebabCase(name);

  const templateContent = getTemplateContent('testE2eFeature', 'test-e2e-feature.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name,
    pascalCaseName: toPascalCase(name),
    camelCaseName: toCamelCase(name),
    kebabCaseName,
    methods: e2eFeatureMethods // Pass the methods for conditional scenario generation
  });

  const targetDir = path.join(process.cwd(), getTestPath(), 'features');
  const targetFilePath = path.join(targetDir, `${kebabCaseName}.feature`);
  try {
    fs.ensureDirSync(targetDir);
    fs.writeFileSync(targetFilePath, content);
    logger.generated(targetFilePath, `${pascalCaseName} E2E Feature`);
  } catch (e: any) {
    logger.error(`Failed to generate E2E Feature for '${name}': ${e.message}`);
  }
}

function generateE2eStepDefinitions(name: string, options: TestOptions) {
  const kebabCaseName = toKebabCase(name);

  const templateContent = getTemplateContent('testE2eSteps', 'test-e2e-steps.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name,
    pascalCaseName: toPascalCase(name),
    camelCaseName: toCamelCase(name),
    kebabCaseName,
  });

  const targetDirSteps = path.join(process.cwd(), getTestPath(), 'step_definitions');
  const targetFilePath = path.join(targetDirSteps, `${kebabCaseName}.steps.ts`);
  try {
    fs.ensureDirSync(targetDirSteps);
    fs.writeFileSync(targetFilePath, content);
    logger.generated(targetFilePath, `${pascalCaseName} E2E Steps`);
  } catch (e: any) {
    logger.error(`Failed to generate E2E Steps for '${name}': ${e.message}`);
  }
}

export function generateTest(type: string, name: string, options: TestOptions) {
  const lcType = type.toLowerCase();

  if (!options.unit && !options.e2e) {
    // If no specific flag is given, decide based on type.
    // For 'e2e' type, generate E2E tests.
    // For component types like 'handler', 'service', generate unit tests.
    if (lcType === 'e2e') {
      options.e2e = true;
    } else if (['handler', 'service', 'dao', 'api'].includes(lcType)) { // Add other unit-testable types here
      options.unit = true;
    } else {
      logger.warn(`No test type specified with --unit or --e2e, and type "${type}" is not a recognized component for default test generation. Please use --unit or --e2e.`);
      return;
    }
  }

  if (options.unit) {
    switch (lcType) {
      case 'handler':
        generateHandlerUnitTest(name, options);
        break;
      // case 'service':
      //   generateServiceUnitTest(name, options); // Placeholder for future
      //   break;
      // case 'dao':
      //   generateDaoUnitTest(name, options); // Placeholder for future
      //   break;
      default:
        logger.warn(`Unit test generation for type "${type}" is not currently supported. Supported types for --unit: 'handler'.`);
    }
  }

  if (options.e2e) {
    // For E2E tests, 'name' usually refers to the feature name.
    // The 'type' argument might be 'e2e' or the main component name being tested end-to-end.
    generateE2eFeatureFile(name, options);
    generateE2eStepDefinitions(name, options);
  }
}

export function registerGenerateTestCommand(program: Command) {
  program
    .command('test <type> <name>')
    .aliases(['gt', 't'])
    .description('Generate test files. <type> can be "handler" (for unit tests) or "e2e" (for feature-wide E2E tests). <name> is the component or feature name.')
    .option('--unit', 'Generate unit tests for the specified <type> (e.g., handler) and <name>.')
    .option('--e2e', 'Generate E2E tests (.feature & .steps.ts) for the feature specified by <name>. If <type> is "e2e", this flag is implied.')
    .option('-f, --feature <featureName>', 'Feature group name, used for handler unit test directory structure. Defaults to kebab-case of <name>.')
    .option('-m, --methods <methodList>', `Comma-separated list of methods for handler unit tests (e.g., "get,post"). Default: "${defaultHandlerMethods}"`)
    .addHelpText('after', `
Examples:
  noony generate test handler user --unit --feature "user-auth" --methods "get,post"
  noony generate test e2e shopping-cart`)
    .action(generateTest);
}
