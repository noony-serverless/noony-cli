import * as Gfs from 'fs-extra';
import * as path from 'path';
import { generateTest, registerGenerateTestCommand } from './test';
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

describe('generate Test Command', () => {
  const baseSrcPath = 'test-src';
  const baseTestPath = 'test-tests';
  const componentName = 'user'; // e.g., for user handlers, user feature
  const kebabComponentName = 'user';
  const pascalComponentName = 'User';
  // const camelComponentName = 'user'; // Not directly used here

  let mockTemplateFn: jest.Mock;


  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);
    mockedConfigLoader.getTestPath.mockReturnValue(baseTestPath);

    mockTemplateFn = jest.fn(); // Reset mock function for each test
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);

    mockedTemplateManager.getTemplateContent.mockImplementation((templateType: string) => {
      if (templateType === 'testUnitHandler') {
        mockTemplateFn.mockReturnValueOnce('handler unit test content');
        return 'raw handler unit test template';
      }
      if (templateType === 'testE2eFeature') {
        mockTemplateFn.mockReturnValueOnce('e2e feature content');
        return 'raw e2e feature template';
      }
      if (templateType === 'testE2eSteps') {
        mockTemplateFn.mockReturnValueOnce('e2e steps content');
        return 'raw e2e steps template';
      }
      return 'unknown template';
    });
    fs.existsSync.mockReturnValue(false);
  });

  describe('Unit Test Generation (Handler)', () => {
    it('should generate a handler unit test with --unit flag and type "handler"', () => {
      generateTest('handler', componentName, { unit: true });
      const expectedPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', kebabComponentName, `${kebabComponentName}.handlers.test.ts`);

      expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('testUnitHandler', 'test-unit-handler.hbs');
      expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw handler unit test template');
      expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: componentName }));
      expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, 'handler unit test content');
      expect(mockedLogger.generated).toHaveBeenCalledWith(expectedPath, `${pascalComponentName} Handler Unit Test`);
    });

    it('should use --feature for handler unit test path', () => {
      generateTest('handler', componentName, { unit: true, feature: 'custom-feature' });
      const expectedPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'custom-feature', `${kebabComponentName}.handlers.test.ts`);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, 'handler unit test content');
    });

    it('should pass methods to handler unit test template', () => {
      // Reset for this specific template content expectation
      mockedTemplateManager.getTemplateContent.mockReturnValueOnce('{{#each methods}}{{this.methodName}}{{/each}}');
      mockTemplateFn.mockClear(); // Clear previous calls if any
      mockedHandlebars.compile.mockClear().mockReturnValue(mockTemplateFn);


      generateTest('handler', componentName, { unit: true, methods: 'get,post' });

      expect(mockedHandlebars.compile).toHaveBeenCalledWith('{{#each methods}}{{this.methodName}}{{/each}}');
      expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
        methods: expect.arrayContaining([
          expect.objectContaining({ methodName: 'get' }),
          expect.objectContaining({ methodName: 'create' }) // post maps to create
        ])
      }));
      expect(mockTemplateFn.mock.calls[0][0].methods).toHaveLength(2);
    });

    it('should create placeholders for handler unit tests if they do not exist', () => {
        fs.existsSync.mockReturnValue(false);
        generateTest('handler', componentName, { unit: true });

        const apiPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'api', `${pascalComponentName}Api.ts`);
        expect(fs.writeFileSync).toHaveBeenCalledWith(apiPath, expect.stringContaining(`${pascalComponentName}Api`));
        expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${apiPath}`);

        const handlerActualPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', kebabComponentName, `${kebabComponentName}.handlers.ts`);
        expect(fs.writeFileSync).toHaveBeenCalledWith(handlerActualPath, expect.stringContaining(`${pascalComponentName} Handlers`));
        expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${handlerActualPath}`);

        const typesPath = path.join(process.cwd(), baseSrcPath, 'types', `noony.types.ts`);
        expect(fs.writeFileSync).toHaveBeenCalledWith(typesPath, expect.stringContaining("NoonyHandler"));
        expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${typesPath}`);
    });
  });

  describe('E2E Test Generation', () => {
    it('should generate E2E feature and steps files with --e2e flag', () => {
      generateTest('anyTypeOrFeatureName', componentName, { e2e: true });

      const featurePath = path.join(process.cwd(), baseTestPath, 'features', `${kebabComponentName}.feature`);
      expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('testE2eFeature', 'test-e2e-feature.hbs');
      expect(fs.writeFileSync).toHaveBeenCalledWith(featurePath, 'e2e feature content');
      expect(mockedLogger.generated).toHaveBeenCalledWith(featurePath, `${pascalComponentName} E2E Feature`);

      const stepsPath = path.join(process.cwd(), baseTestPath, 'step_definitions', `${kebabComponentName}.steps.ts`);
      expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('testE2eSteps', 'test-e2e-steps.hbs');
      expect(fs.writeFileSync).toHaveBeenCalledWith(stepsPath, 'e2e steps content');
      expect(mockedLogger.generated).toHaveBeenCalledWith(stepsPath, `${pascalComponentName} E2E Steps`);
    });
  });

  describe('Default Behavior (No --unit or --e2e flags)', () => {
    it('should default to unit test for "handler" type', () => {
      generateTest('handler', componentName, {});
      const expectedPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', kebabComponentName, `${kebabComponentName}.handlers.test.ts`);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, 'handler unit test content');
      expect(mockedLogger.generated).toHaveBeenCalledWith(expectedPath, `${pascalComponentName} Handler Unit Test`);
    });

    it('should default to e2e tests for "e2e" type', () => {
      generateTest('e2e', componentName, {});
      const featurePath = path.join(process.cwd(), baseTestPath, 'features', `${kebabComponentName}.feature`);
      expect(fs.writeFileSync).toHaveBeenCalledWith(featurePath, 'e2e feature content');
      const stepsPath = path.join(process.cwd(), baseTestPath, 'step_definitions', `${kebabComponentName}.steps.ts`);
      expect(fs.writeFileSync).toHaveBeenCalledWith(stepsPath, 'e2e steps content');
    });

    it('should warn if type is not recognized for default behavior and no flags provided', () => {
        generateTest('unknownType', componentName, {});
        expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No test type specified with --unit or --e2e, and type "unknownType" is not a recognized component for default test generation.'));
        // Check that writeFileSync was not called for main test files (placeholders might still be if logic flows that far)
        const mainTestFileWrites = fs.writeFileSync.mock.calls.filter(
            call => call[0].toString().endsWith('.test.ts') || call[0].toString().endsWith('.feature') || call[0].toString().endsWith('.steps.ts')
        );
        expect(mainTestFileWrites.length).toBe(0);
    });
  });

  it('should warn if unit test generation for a specific type is not supported', () => {
    generateTest('service', componentName, { unit: true });
    expect(mockedLogger.warn).toHaveBeenCalledWith("Unit test generation for type \"service\" is not currently supported. Supported types for --unit: 'handler'.");
  });

  it('should log an error if file generation fails', () => {
    fs.writeFileSync.mockImplementation(() => { throw new Error('Test write error'); });
    generateTest('handler', componentName, { unit: true });
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to generate Handler Unit Test for '${componentName}'`));
  });

  describe('registerGenerateTestCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateTestCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "test <type> <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('test <type> <name>');
    });

    it('should set aliases "gt", "t" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.aliases()).toEqual(['gt', 't']);
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate test files.'));
    });
    it('should register options: --unit, --e2e, --feature, --methods', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description }));
      expect(options).toContainEqual(expect.objectContaining({flags: '--unit', description: expect.stringContaining('Generate unit tests')}));
      expect(options).toContainEqual(expect.objectContaining({flags: '--e2e', description: expect.stringContaining('Generate E2E tests')}));
      expect(options).toContainEqual(expect.objectContaining({flags: '-f, --feature <featureName>', description: expect.stringContaining('Feature group name')}));
      expect(options).toContainEqual(expect.objectContaining({flags: '-m, --methods <methodList>', description: expect.stringContaining('Comma-separated list of methods for handler unit tests')}));
    });
    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
