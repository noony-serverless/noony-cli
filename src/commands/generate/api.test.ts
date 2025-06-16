import * as Gfs from 'fs-extra';
import * as path from 'path';
import { generateApi, registerGenerateApiCommand } from './api';
import * as templateManager from '../../utils/templateManager';
import * as configLoader from '../../utils/configLoader';
import { logger } from '../../utils/logger';
import { Command } from 'commander';
import * as Handlebars from 'handlebars';

// Mocks
const fs = Gfs as jest.Mocked<typeof Gfs>;
jest.mock('fs-extra');

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

describe('generate API Command', () => {
  const baseSrcPath = 'test-src';
  const apiName = 'user';
  const kebabApiName = 'user';
  const pascalApiName = 'User';
  // const camelApiName = 'user'; // Not directly used in path for API class file itself
  let mockTemplateFn: jest.Mock;


  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);

    mockTemplateFn = jest.fn().mockReturnValue('compiled api template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw api template');

    fs.existsSync.mockReturnValue(false); // Default to placeholders not existing
  });

  it('should generate an API class file with default options', () => {
    generateApi(apiName, {}); // Empty options

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'api', `${pascalApiName}Api.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('api', 'api.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw api template');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: apiName }));
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled api template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalApiName} API Class`); // Corrected expected log
  });

  it('should pass correct methods to template based on default methods', () => {
    generateApi(apiName, {});

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: {
        get: true, create: true, update: true, delete: true, getAll: true
      }
    }));
  });

  it('should use --methods option to control methods in template', () => {
    generateApi(apiName, { methods: 'get,create,getAll' });

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: {
        get: true, create: true, update: false, delete: false, getAll: true
      }
    }));
  });

  it('should create placeholder Service and Domain Object files if they do not exist', () => {
    fs.existsSync.mockReturnValue(false); // None exist

    generateApi(apiName, {});

    const serviceDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'services');
    const servicePath = path.join(serviceDir, `${pascalApiName}Service.ts`);
    expect(fs.writeFileSync).toHaveBeenCalledWith(servicePath, expect.stringContaining(`${pascalApiName}Service`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${servicePath}`);

    const domainDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'domain');
    const domainPath = path.join(domainDir, `${kebabApiName}.do.ts`);
    expect(fs.writeFileSync).toHaveBeenCalledWith(domainPath, expect.stringContaining(`${pascalApiName}`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${domainPath}`);
  });

  it('should not create placeholder files if they already exist', () => {
    fs.existsSync.mockReturnValue(true); // All exist
    generateApi(apiName, {});

    const servicePath = path.join(process.cwd(), baseSrcPath, 'chrome', 'services', `${pascalApiName}Service.ts`);
    const domainPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'domain', `${kebabApiName}.do.ts`);

    const mainFileWriteCall = fs.writeFileSync.mock.calls.find(call => call[0].toString().endsWith('Api.ts'));
    expect(mainFileWriteCall).toBeDefined();

    const placeholderServiceCalls = fs.writeFileSync.mock.calls.filter(call => call[0] === servicePath);
    expect(placeholderServiceCalls.length).toBe(0);

    const placeholderDomainCalls = fs.writeFileSync.mock.calls.filter(call => call[0] === domainPath);
    expect(placeholderDomainCalls.length).toBe(0);
  });


  it('should log an error if API file generation fails', () => {
    fs.writeFileSync.mockImplementation((filePath, _content) => { // Use _content to avoid unused var error
      if (typeof filePath === 'string' && filePath.endsWith('Api.ts')) {
         throw new Error('API write error');
      }
    });
    generateApi(apiName, {});
    expect(mockedLogger.error).toHaveBeenCalledWith(`Failed to generate API class '${apiName}': API write error`);
  });

  describe('registerGenerateApiCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateApiCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "api <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('api <name>');
    });

    it('should set aliases "ga" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.aliases()).toEqual(['ga']);
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a new API class that interacts with a corresponding service.'));
    });

    it('should register options: --service, --methods', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description, defaultValue: opt.defaultValue }));

      expect(options).toContainEqual(expect.objectContaining({
          flags: '--service',
          description: 'Link to a service (currently implicit, future use for specific service linkage)'
      }));
      expect(options).toContainEqual(expect.objectContaining({
          flags: '-m, --methods <methods>',
          description: expect.stringContaining('Comma-separated list of API methods to generate'),
          defaultValue: 'get,create,update,delete,getAll'
      }));
    });
    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
