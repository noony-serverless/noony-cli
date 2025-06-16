import * as fs from 'fs-extra';
import * as path from 'path';
import { generateHandler, registerGenerateHandlerCommand } from './handler';
import * as templateManager from '../../utils/templateManager';
import * as configLoader from '../../utils/configLoader';
import { logger } from '../../utils/logger';
import { Command } from 'commander';
import * as Handlebars from 'handlebars'; // Import Handlebars

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock templateManager
jest.mock('../../utils/templateManager');
const mockedTemplateManager = templateManager as jest.Mocked<typeof templateManager>;

// Mock configLoader
jest.mock('../../utils/configLoader');
const mockedConfigLoader = configLoader as jest.Mocked<typeof configLoader>;

// Mock logger
jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock Handlebars - specifically the compile method
jest.mock('handlebars', () => ({
    ...jest.requireActual('handlebars'), // Retain other Handlebars functionality
    compile: jest.fn(),
  }));
const mockedHandlebars = Handlebars as jest.Mocked<typeof Handlebars>;


describe('generate Handler Command', () => {
  const baseSrcPath = 'test-src';
  const handlerName = 'user';
  const featureName = 'auth';
  const kebabHandlerName = 'user'; // toKebabCase(handlerName)
  const pascalHandlerName = 'User'; // toPascalCase(handlerName)
  // const camelHandlerName = 'user';   // toCamelCase(handlerName) - not directly used in this test logic

  let mockTemplateFn: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    // Default mock implementations
    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);

    // Setup mock for Handlebars.compile to return a new mock function each time
    mockTemplateFn = jest.fn().mockReturnValue('compiled handler template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);

    // getTemplateContent will now return the raw template string for Handlebars to compile
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw template string for {{name}}');

    mockedFs.existsSync.mockReturnValue(false); // Default to placeholders not existing
  });

  it('should generate a handler file with default options', () => {
    generateHandler(handlerName, {}); // Empty options for defaults

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', kebabHandlerName, `${kebabHandlerName}.handlers.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('handler', 'handler.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw template string for {{name}}');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: handlerName, pascalCaseName: pascalHandlerName }));
    expect(mockedFs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled handler template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalHandlerName} Handler`);
  });

  it('should use --feature option for directory path', () => {
    generateHandler(handlerName, { feature: featureName });

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', featureName, `${kebabHandlerName}.handlers.ts`);
    expect(mockedFs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, expect.any(String));
  });

  it('should pass correct methods to template (default)', () => {
    generateHandler(handlerName, {});

    expect(mockedHandlebars.compile).toHaveBeenCalled(); // Ensure compile was called
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: expect.arrayContaining([
        expect.objectContaining({ methodName: 'get' }),
        expect.objectContaining({ methodName: 'create' }),
        expect.objectContaining({ methodName: 'update' }),
        expect.objectContaining({ methodName: 'delete' }),
        expect.objectContaining({ methodName: 'getAll' }), // Default includes getAll
      ])
    }));
    expect(mockTemplateFn.mock.calls[0][0].methods).toHaveLength(5); // Check default methods length
  });

  it('should generate specified methods from --methods option', () => {
    generateHandler(handlerName, { methods: 'get,post' });

    expect(mockedHandlebars.compile).toHaveBeenCalled();
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      methods: [
        expect.objectContaining({ methodName: 'get' }),
        expect.objectContaining({ methodName: 'create' }), // maps 'post' to 'create'
      ]
    }));
    expect(mockTemplateFn.mock.calls[0][0].methods).toHaveLength(2);
  });


  it('should create placeholder files if they do not exist', () => {
    mockedFs.existsSync.mockReturnValue(false); // None of the placeholders exist

    generateHandler(handlerName, {});

    const apiDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'api');
    const apiPath = path.join(apiDir, `${pascalHandlerName}Api.ts`);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(apiPath, expect.stringContaining(`${pascalHandlerName}Api`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${apiPath}`);

    const dtoDir = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'dto');
    const dtoPath = path.join(dtoDir, `${kebabHandlerName}.dto.ts`);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(dtoPath, expect.stringContaining(`${pascalHandlerName}Dto`));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${dtoPath}`);

    const typesDir = path.join(process.cwd(), baseSrcPath, 'types');
    const noonyTypesPath = path.join(typesDir, 'noony.types.ts');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(noonyTypesPath, expect.stringContaining("NoonyHandler"));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${noonyTypesPath}`);

    // Check for utils/logger.ts placeholder (conditionally)
    const utilsDir = path.join(process.cwd(), baseSrcPath, 'utils');
    const loggerUtilPath = path.join(utilsDir, 'logger.ts');
    // Check if it was called, but it shouldn't if baseSrcPath is 'test-src' and utils path is 'src/utils/logger.ts'
    // This part of the test might need adjustment based on the exact condition in handler.ts
    // For now, let's assume it might be called if paths align to create a placeholder
    // If the actual logger path is `test-src/utils/logger.ts` and the CLI utility is `src/utils/logger.ts`
    // then a placeholder would be created.
    if(baseSrcPath !== 'src' || !loggerUtilPath.endsWith('src/utils/logger.ts')) {
         expect(mockedFs.writeFileSync).toHaveBeenCalledWith(loggerUtilPath, expect.stringContaining("Placeholder for logger"));
         expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${loggerUtilPath}`);
    }
  });

  it('should not create placeholder files if they already exist', () => {
    mockedFs.existsSync.mockReturnValue(true); // All placeholders exist

    generateHandler(handlerName, {});

    const apiPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'api', `${pascalHandlerName}Api.ts`);
    const dtoPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'dto', `${kebabHandlerName}.dto.ts`);

    const mainFileWriteCall = mockedFs.writeFileSync.mock.calls.find(call => call[0].toString().endsWith('.handlers.ts'));
    expect(mainFileWriteCall).toBeDefined(); // Main handler file is always written

    // Filter out the main file write, then check if other paths were written to
    const placeholderWrites = mockedFs.writeFileSync.mock.calls.filter(call => call[0] !== mainFileWriteCall?.[0]);

    expect(placeholderWrites.find(call => call[0] === apiPath)).toBeUndefined();
    expect(placeholderWrites.find(call => call[0] === dtoPath)).toBeUndefined();
  });

  it('should log an error if file generation fails', () => {
    mockedFs.writeFileSync.mockImplementation(() => {
      throw new Error('Disk full');
    });

    generateHandler(handlerName, {});
    expect(mockedLogger.error).toHaveBeenCalledWith(`Failed to generate handler '${handlerName}': Disk full`);
  });

  describe('registerGenerateHandlerCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance; // To spy on the actual command object returned by program.command()

    beforeEach(() => {
        program = new Command();
        // Spy on program.command to intercept the created sub-command
        commandSpy = jest.spyOn(program, 'command');
        registerGenerateHandlerCommand(program); // Call the registration function
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "handler <name>" command', () => {
        expect(program.command).toHaveBeenCalledWith('handler <name>');
    });

    it('should set alias "h" and correct description', () => {
        // To test this, we need to get the actual command object.
        // This requires a slightly different approach if program.command itself is not returning a mock.
        // For simplicity, let's assume registerGenerateHandlerCommand configures the last command added.
        // This is fragile. A better way is to have register function return the command or use a more detailed spy.
        const addedCommand = commandSpy.mock.results[0].value; // Get the command object created

        expect(addedCommand.alias()).toBe('h'); // Commander stores alias without the '-'
        expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a new handler file with associated placeholder files if they don\'t exist.'));
    });

    it('should register all required options with descriptions and defaults', () => {
        const addedCommand = commandSpy.mock.results[0].value;
        const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description, defaultValue: opt.defaultValue }));

        expect(options).toContainEqual(expect.objectContaining({
            flags: '-m, --methods <methods>',
            description: expect.stringContaining('Comma-separated list of HTTP methods'),
            defaultValue: 'get,post,put,delete,getAll',
        }));
        expect(options).toContainEqual(expect.objectContaining({
            flags: '-f, --feature <featureName>',
            description: 'Feature group name for directory structure (e.g., "user-management"). Defaults to kebab-case of <name>.',
        }));
         expect(options).toContainEqual(expect.objectContaining({
            flags: '--validation',
            description: 'Include Zod validation parsing in the template (Note: template may require manual setup).',
        }));
        expect(options).toContainEqual(expect.objectContaining({
            flags: '--auth <type>',
            description: 'Specify authentication type (e.g., "jwt", "apiKey"). (Informational for template)',
        }));
    });

    it('should register an action', () => {
        const addedCommand = commandSpy.mock.results[0].value;
        expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });

});
