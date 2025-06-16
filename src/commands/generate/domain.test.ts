import * as Gfs from 'fs-extra';
import * as path from 'path';
import { generateDomain, registerGenerateDomainCommand } from './domain';
import * as templateManager from '../../utils/templateManager';
import * as configLoader from '../../utils/configLoader';
import * as schemaParser from '../../utils/schemaParser';
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

jest.mock('../../utils/schemaParser');
const mockedSchemaParser = schemaParser as jest.Mocked<typeof schemaParser>;

jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

jest.mock('handlebars', () => ({
    ...jest.requireActual('handlebars'),
    compile: jest.fn(),
}));
const mockedHandlebars = Handlebars as jest.Mocked<typeof Handlebars>;


describe('generate Domain Command', () => {
  const baseSrcPath = 'test-src';
  const domainName = 'order';
  const kebabDomainName = 'order';
  const pascalDomainName = 'Order';

  const mockDefaultFields = [
    { name: 'item', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false },
    { name: 'quantity', type: 'number', zodType: 'z.number()', typescriptType: 'number', isOptional: false, isIdField: false },
  ];
  let mockTemplateFn: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);

    mockTemplateFn = jest.fn().mockReturnValue('compiled domain template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw domain template');

    mockedSchemaParser.parseSchemaFields.mockReturnValue(mockDefaultFields);
  });

  it('should generate a domain interface file with default options (using mocked fields)', () => {
    generateDomain(domainName, {}); // Empty options

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'domain', `${kebabDomainName}.do.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('domain', 'domain.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw domain template');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: domainName }));
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled domain template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalDomainName} Domain Object`);
  });

  it('should call parseSchemaFields with --fields option', () => {
    const fieldsArg = "productName:string,amount?:number";
    generateDomain(domainName, { fields: fieldsArg });
    expect(mockedSchemaParser.parseSchemaFields).toHaveBeenCalledWith(fieldsArg);
  });

  it('should pass correct field data to template, excluding "id" field from explicit fields list', () => {
    const mockIdField = { name: 'id', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: true, isIdField: true };
    const mockRegularField = { name: 'customer', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false };
    mockedSchemaParser.parseSchemaFields.mockReturnValue([mockIdField, mockRegularField]);

    generateDomain(domainName, { fields: "id?:string,customer:string" });

    // The 'id' field is hardcoded in the domain.hbs template, so it should be filtered from the 'fields' array passed to the template.
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      fields: [mockRegularField]
    }));
  });

  it('should log an error if domain file generation fails', () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('Domain write error');
    });
    generateDomain(domainName, {});
    expect(mockedLogger.error).toHaveBeenCalledWith(`Failed to generate domain object '${domainName}': Domain write error`);
  });

  describe('registerGenerateDomainCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateDomainCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "domain <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('domain <name>');
    });

    it('should set aliases "do", "gdo" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.aliases()).toEqual(['do', 'gdo']);
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a new Domain Object TypeScript interface.'));
    });

    it('should register option: --fields', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '-f, --fields <fields>',
        description: expect.stringContaining('Comma-separated list of domain object fields'),
      }));
    });

    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
