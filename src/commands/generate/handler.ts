import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
} from '../../utils/stringUtils'; // Adjust path as needed
import { getSrcPath } from '../../utils/configLoader';
// import { getTemplateContent } from '../../utils/templateManager';

interface HandlerOptions {
  methods?: string;
  feature?: string;
  validation?: boolean;
  auth?: string;
}

// Helper for Handlebars to register string utils
Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);

const defaultMethods = 'get,post,put,delete';

const methodDetails: {
  [key: string]: {
    methodName: string;
    action: string;
    statusCode: number;
    hasParams: boolean;
    hasBody: boolean;
  };
} = {
  get: {
    methodName: 'get',
    action: 'retrieved',
    statusCode: 200,
    hasParams: true,
    hasBody: false,
  },
  post: {
    methodName: 'create',
    action: 'created',
    statusCode: 201,
    hasParams: false,
    hasBody: true,
  },
  put: {
    methodName: 'update',
    action: 'updated',
    statusCode: 200,
    hasParams: true,
    hasBody: true,
  },
  delete: {
    methodName: 'delete',
    action: 'deleted',
    statusCode: 200,
    hasParams: true,
    hasBody: false,
  },
};

export function generateHandler(name: string, options: HandlerOptions) {
  const methods = (options.methods || defaultMethods)
    .split(',')
    .map(m => m.trim().toLowerCase());
  const feature = options.feature || toKebabCase(name); // Default feature to kebab-case name
  const pascalCaseName = toPascalCase(name);
  const camelCaseName = toCamelCase(name);

  const templatePath = path.join(__dirname, '../../templates/handler.hbs'); // Adjust path to templates
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const compiledTemplate = Handlebars.compile(templateContent);

  const methodsData = methods
    .map(method => {
      if (!methodDetails[method]) {
        console.warn(
          `Warning: Method '${method}' is not recognized. Skipping.`
        );
        return null;
      }
      return {
        ...methodDetails[method],
      };
    })
    .filter(Boolean);

  const content = compiledTemplate({
    name: name, // original name
    pascalCaseName: pascalCaseName, // for ClassName
    camelCaseName: camelCaseName, // for variableName
    feature: feature,
    methods: methodsData,
    // TODO: Add validation and auth options to template context
  });

  const targetDir = path.join(
    process.cwd(),
    getSrcPath(),
    'chrome',
    'handlers',
    feature
  );
  const targetFilePath = path.join(
    targetDir,
    `${toKebabCase(name)}.handlers.ts`
  );

  fs.ensureDirSync(targetDir);
  fs.writeFileSync(targetFilePath, content);

  console.log(`Handler generated: ${targetFilePath}`);
  // TODO: Create dummy files for Api and Dto if they don't exist to allow compilation
  // This is a temporary measure for development
  const apiDir = path.join(
    process.cwd(),
    getSrcPath(),
    'chrome',
    'handlers',
    'api'
  );
  fs.ensureDirSync(apiDir);
  const apiPath = path.join(apiDir, `${pascalCaseName}Api.ts`); // Corrected from camelCaseName to pascalCaseName for API file
  if (!fs.existsSync(apiPath)) {
    fs.writeFileSync(
      apiPath,
      `// Placeholder for ${pascalCaseName}Api
export class ${pascalCaseName}Api {}
`
    );
  }

  const dtoDir = path.join(
    process.cwd(),
    getSrcPath(),
    'chrome',
    'handlers',
    'dto'
  );
  fs.ensureDirSync(dtoDir);
  const dtoPath = path.join(dtoDir, `${toKebabCase(name)}.dto.ts`); // Corrected from camelCaseName to toKebabCase(name) for DTO file
  if (!fs.existsSync(dtoPath)) {
    fs.writeFileSync(
      dtoPath,
      `// Placeholder for ${pascalCaseName}Dto
export class ${pascalCaseName}Dto {}
`
    );
  }

  const typesDir = path.join(process.cwd(), getSrcPath(), 'types');
  fs.ensureDirSync(typesDir);
  const noonyTypesPath = path.join(typesDir, 'noony.types.ts');
  if (!fs.existsSync(noonyTypesPath)) {
    fs.writeFileSync(
      noonyTypesPath,
      `// Placeholder for NoonyHandler type
export type NoonyHandler = (context: any) => Promise<any>;
`
    );
  }

  const utilsDir = path.join(process.cwd(), getSrcPath(), 'utils');
  fs.ensureDirSync(utilsDir);
  const loggerPath = path.join(utilsDir, 'logger.ts');
  if (!fs.existsSync(loggerPath)) {
    fs.writeFileSync(
      loggerPath,
      `// Placeholder for logger
export const logger = { info: console.log, error: console.error };
`
    );
  }
}

export function registerGenerateHandlerCommand(program: Command) {
  program
    .command('handler <name>')
    .alias('h')
    .description('Generate a new handler')
    .option(
      '-m, --methods <methods>',
      'Comma-separated list of HTTP methods (get,post,put,delete)',
      defaultMethods
    )
    .option('-f, --feature <feature>', 'Feature name to group handlers')
    .option(
      '--validation',
      'Include Zod validation parsing (Not yet implemented)'
    )
    .option(
      '--auth <type>',
      'Add authentication middleware (api-key|bearer|basic) (Not yet implemented)'
    )
    .action(generateHandler);
}
