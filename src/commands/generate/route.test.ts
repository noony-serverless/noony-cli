import * as fs from 'fs-extra';
import * as path from 'path';
import { generateRoute, registerGenerateRouteCommand } from './route';
import * as templateManager from '../../utils/templateManager';
import * as configLoader from '../../utils/configLoader';
import { logger } from '../../utils/logger';
import { Command } from 'commander';
// import * as stringUtils from '../../utils/stringUtils'; // Not strictly needed if functions are simple
import * as Handlebars from 'handlebars';

// Mocks
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

jest.mock('../../utils/templateManager');
const mockedTemplateManager = templateManager as jest.Mocked<typeof templateManager>;

jest.mock('../../utils/configLoader');
const mockedConfigLoader = configLoader as jest.Mocked<typeof configLoader>;

jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

jest.mock('handlebars', () => ({
    ...jest.requireActual('handlebars'),
    compile: jest.fn(),
}));
const mockedHandlebars = Handlebars as jest.Mocked<typeof Handlebars>;


describe('generate Route Command', () => {
  const baseSrcPath = 'test-src';
  const routeName = 'item'; // Example name
  const kebabRouteName = 'item'; // Assuming toKebabCase(routeName)
  const pascalRouteName = 'Item'; // Assuming toPascalCase(routeName)
  const camelRouteName = 'item';   // Assuming toCamelCase(routeName)
  const defaultApiPrefix = '/v1';

  let mockTemplateFn: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);
    mockedConfigLoader.getApiPrefix.mockReturnValue(defaultApiPrefix);

    mockTemplateFn = jest.fn().mockReturnValue('compiled route template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw route template');

    mockedFs.existsSync.mockReturnValue(false);
  });

  it('should generate a route file with default options', () => {
    generateRoute(routeName, {});

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'routes', `${kebabRouteName}.route.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('route', 'route.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw route template');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: routeName, prefix: defaultApiPrefix }));
    expect(mockedFs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled route template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalRouteName} Route`);
  });

  it('should use --prefix option for route prefix in template data', () => {
    generateRoute(routeName, { prefix: '/api/v2' });

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      prefix: '/api/v2'
    }));
  });

  it('should use default API prefix from config if --prefix option is not provided', () => {
    mockedConfigLoader.getApiPrefix.mockReturnValue('/conf/v1'); // Different default for test
    generateRoute(routeName, {});

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      prefix: '/conf/v1'
    }));
  });

  it('should pass correct methods to template based on default methods', () => {
    generateRoute(routeName, {});

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: expect.arrayContaining([
        expect.objectContaining({ method: 'getbyid', handlerName: 'get' }),
        expect.objectContaining({ method: 'post', handlerName: 'create' }),
        expect.objectContaining({ method: 'put', handlerName: 'update' }),
        expect.objectContaining({ method: 'delete', handlerName: 'delete' }),
        expect.objectContaining({ method: 'getall', handlerName: 'getAll' }),
      ])
    }));
  });

  it('should use --methods option and map to correct handler names', () => {
    generateRoute(routeName, { methods: 'getById,post' });

    const calledWithContext = mockTemplateFn.mock.calls[0][0];
    expect(calledWithContext.methods).toHaveLength(2);
    expect(calledWithContext.methods).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: 'getbyid', handlerName: 'get' }),
      expect.objectContaining({ method: 'post', handlerName: 'create' }),
    ]));
  });

  it('should use --resource option to generate all standard CRUD methods', () => {
    generateRoute(routeName, { resource: true });

    const calledWithContext = mockTemplateFn.mock.calls[0][0];
    expect(calledWithContext.methods).toHaveLength(5);
    expect(calledWithContext.methods).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: 'getbyid', handlerName: 'get' }),
      expect.objectContaining({ method: 'post', handlerName: 'create' }),
      expect.objectContaining({ method: 'put', handlerName: 'update' }),
      expect.objectContaining({ method: 'delete', handlerName: 'delete' }),
      expect.objectContaining({ method: 'getall', handlerName: 'getAll' }),
    ]));
  });

  it('should create placeholder DTO and Handler files if they do not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    generateRoute(routeName, { methods: 'getById,post' });

    const dtoDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'dto');
    // Corrected DTO path to use kebabRouteName as per generateRoute logic for placeholders
    const dtoPath = path.join(dtoDir, `${kebabRouteName}.dto.ts`);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(dtoPath, expect.stringContaining(`${pascalRouteName}Dto`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${dtoPath}`);

    const handlerDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', kebabRouteName);
    const handlerPath = path.join(handlerDir, `${kebabRouteName}.handlers.ts`);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(handlerPath, expect.stringContaining(`get${pascalRouteName}Handler`));
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(handlerPath, expect.stringContaining(`create${pascalRouteName}Handler`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${handlerPath}`);
  });

  it('should log an error if route file generation fails', () => {
    mockedFs.writeFileSync.mockImplementation(() => {
      throw new Error('Disk write error');
    });
    generateRoute(routeName, {});
    // The error is caught for the main file write, then placeholder logic might still run or also error.
    // We primarily care that the initial error was logged.
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to generate route '${routeName}': Disk write error`));
  });

  describe('registerGenerateRouteCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateRouteCommand(program);
    });

    afterEach(() => {
      commandSpy.mockRestore();
    });

    it('should register "route <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('route <name>');
    });

    it('should set alias "r" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.alias()).toBe('r');
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate Fastify route definitions'));
    });

    it('should register all required options with descriptions and defaults', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description, defaultValue: opt.defaultValue }));

      expect(options).toContainEqual(expect.objectContaining({
        flags: '-p, --prefix <path>',
        description: expect.stringContaining('API URL prefix'),
        defaultValue: defaultApiPrefix, // Default comes from getApiPrefix()
      }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '-m, --methods <methods>',
        description: expect.stringContaining('Comma-separated list of methods for the route'),
      }));
       expect(options).toContainEqual(expect.objectContaining({
        flags: '--resource',
        description: expect.stringContaining('Shorthand to generate standard RESTful resource routes'),
      }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '--auth <type>',
        description: expect.stringContaining('Authentication type to be mentioned'),
      }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '-f, --feature <feature>',
        description: expect.stringContaining('Feature group name, used to correctly path to handlers'),
      }));
    });

    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
