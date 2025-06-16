import * as Gfs from 'fs-extra'; // Renamed to avoid conflict with fs in scope
import * as path from 'path';
import { generateService, registerGenerateServiceCommand } from './service';
import * as templateManager from '../../utils/templateManager';
import * as configLoader from '../../utils/configLoader';
import { logger } from '../../utils/logger';
import { Command } from 'commander';
import * as Handlebars from 'handlebars';

// Mocks
const fs = Gfs as jest.Mocked<typeof Gfs>; // Use the renamed import for mocked fs
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


describe('generate Service Command', () => {
  const baseSrcPath = 'test-src';
  const serviceName = 'profile';
  const kebabServiceName = 'profile';
  const pascalServiceName = 'Profile';
  // const camelServiceName = 'profile'; // Not used directly in these tests

  let mockTemplateFn: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);

    mockTemplateFn = jest.fn().mockReturnValue('compiled service template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw service template');

    fs.existsSync.mockReturnValue(false); // Default to placeholders not existing
    fs.readFileSync.mockReturnValue(''); // Default for readFileSync if called (e.g. for existing DAO)
  });

  it('should generate a service file with default options', () => {
    generateService(serviceName, {}); // Empty options

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'services', `${pascalServiceName}Service.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('service', 'service.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw service template');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: serviceName }));
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled service template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalServiceName} Service`);
  });

  it('should pass correct methods to template based on default methods', () => {
    generateService(serviceName, {});

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: {
        get: true, create: true, update: true, delete: true
      }
    }));
  });

  it('should use --methods option to control methods in template', () => {
    generateService(serviceName, { methods: 'get,create' });

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: {
        get: true, create: true, update: false, delete: false
      }
    }));
  });

  it('should log a note if --registration=manual is used', () => {
    generateService(serviceName, { registration: 'manual' });
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Manual registration selected. Please update your TypeDI container'));
  });

  it('should not log for auto registration (default)', () => {
    // Clear info mock calls before these specific tests
    mockedLogger.info.mockClear();
    generateService(serviceName, { registration: 'auto' });
    expect(mockedLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Manual registration selected'));

    mockedLogger.info.mockClear();
    generateService(serviceName, {}); // Also test default
    expect(mockedLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Manual registration selected'));
  });

  it('should create placeholder DAO and Domain Object files if they do not exist', () => {
    fs.existsSync.mockReturnValue(false); // None exist

    generateService(serviceName, {});

    const daoDir = path.join(process.cwd(), baseSrcPath, 'infra', 'db');
    const daoPath = path.join(daoDir, `${kebabServiceName}.dao.ts`);
    expect(fs.writeFileSync).toHaveBeenCalledWith(daoPath, expect.stringContaining(`${pascalServiceName}Dao`));
    // Check for Zod import in new DAO placeholder (it's part of the string written)
    expect(fs.writeFileSync.mock.calls.find(call => call[0] === daoPath)?.[1]).toContain("import { z } from 'zod';");
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${daoPath}`);

    const mongoDaoPath = path.join(process.cwd(), baseSrcPath, 'infra', 'db', 'mongo.dao.ts');
    expect(fs.writeFileSync).toHaveBeenCalledWith(mongoDaoPath, expect.stringContaining('MongoDao'));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${mongoDaoPath}`);

    const mongoConnectServicePath = path.join(process.cwd(), baseSrcPath, 'infra', 'db', 'mongodb-connect-service.ts');
    expect(fs.writeFileSync).toHaveBeenCalledWith(mongoConnectServicePath, expect.stringContaining('MongodbConnectService'));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${mongoConnectServicePath}`);

    const domainDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'domain');
    const domainPath = path.join(domainDir, `${kebabServiceName}.do.ts`);
    expect(fs.writeFileSync).toHaveBeenCalledWith(domainPath, expect.stringContaining(`${pascalServiceName}`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${domainPath}`);
  });

  it('should ensure Zod is imported into an existing placeholder DAO if it was missing', () => {
    const daoDir = path.join(process.cwd(), baseSrcPath, 'infra', 'db');
    const daoPath = path.join(daoDir, `${kebabServiceName}.dao.ts`);

    // Simulate DAO exists but without Zod import
    fs.existsSync.mockImplementation(p => p === daoPath);
    fs.readFileSync.mockReturnValueOnce(`// Placeholder for ${pascalServiceName}Dao\nexport class ${pascalServiceName}Dao {}`);

    generateService(serviceName, {});

    expect(fs.writeFileSync).toHaveBeenCalledWith(daoPath, `import { z } from 'zod';\n// Placeholder for ${pascalServiceName}Dao\nexport class ${pascalServiceName}Dao {}`);
    // This info message is not in the original code, if it was added, this test would be valid.
    // For now, let's assume the direct write is the check.
    // expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder updated with Zod import: ${daoPath}`);
  });


  it('should log an error if service file generation fails', () => {
    fs.writeFileSync.mockImplementation((filePath, _content) => {
      if (typeof filePath === 'string' && filePath.endsWith('Service.ts')) {
        throw new Error('Disk quota exceeded');
      }
    });
    generateService(serviceName, {});
    expect(mockedLogger.error).toHaveBeenCalledWith(`Failed to generate Service '${serviceName}': Disk quota exceeded`);
  });

  describe('registerGenerateServiceCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateServiceCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });


    it('should register "service <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('service <name>');
    });

    it('should set alias "s" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.alias()).toBe('s');
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a new Service class'));
    });

    it('should register options: --dao, --registration, --methods', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description, defaultValue: opt.defaultValue }));

      expect(options).toContainEqual(expect.objectContaining({ flags: '--dao' }));
      expect(options).toContainEqual(expect.objectContaining({ flags: '--registration <type>', defaultValue: 'auto' }));
      expect(options).toContainEqual(expect.objectContaining({ flags: '-m, --methods <methods>', defaultValue: 'get,create,update,delete' }));
    });

    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
