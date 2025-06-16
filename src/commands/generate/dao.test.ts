import * as Gfs from 'fs-extra';
import * as path from 'path';
import { generateDao, registerGenerateDaoCommand } from './dao';
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

describe('generate DAO Command', () => {
  const baseSrcPath = 'test-src';
  const daoName = 'product';
  const kebabDaoName = 'product';
  const pascalDaoName = 'Product';

  let mockTemplateFn: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);

    mockTemplateFn = jest.fn().mockReturnValue('compiled dao template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw dao template');

    fs.existsSync.mockReturnValue(false); // Default to placeholders not existing

    mockedSchemaParser.parseSchemaFields.mockReturnValue([
      { name: 'name', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false },
      { name: 'price', type: 'number', zodType: 'z.number()', typescriptType: 'number', isOptional: false, isIdField: false },
    ]);
  });

  it('should generate a DAO file with default options', () => {
    generateDao(daoName, {}); // Empty options

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'infra', 'db', `${kebabDaoName}.dao.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('dao', 'dao.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw dao template');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: daoName }));
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled dao template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalDaoName} DAO`);
  });

  it('should use --collection option for collection name in template data', () => {
    generateDao(daoName, { collection: 'my_products' });
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      collectionName: 'my_products'
    }));
  });

  it('should derive collection name if --collection is not provided', () => {
    generateDao(daoName, {}); // No collection option
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      collectionName: 'products' // pluralized kebabDaoName
    }));
  });

  it('should call parseSchemaFields with --schema-fields option', () => {
    const schemaFieldsArg = "name:string,description?:string";
    generateDao(daoName, { schemaFields: schemaFieldsArg });
    expect(mockedSchemaParser.parseSchemaFields).toHaveBeenCalledWith(schemaFieldsArg);
  });

  it('should pass parsed schemaFields to template', () => {
    const mockParsedFields = [
        { name: 'sku', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false }
    ];
    mockedSchemaParser.parseSchemaFields.mockReturnValue(mockParsedFields);

    generateDao(daoName, { schemaFields: "sku:string" });
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      schemaFields: mockParsedFields
    }));
  });

  it('should use --identifier option for identifierField in template (maps "id" to "_id")', () => {
    generateDao(daoName, { identifier: 'productId' });
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ identifierField: 'productId' }));

    generateDao(daoName, { identifier: 'id' });
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ identifierField: '_id' }));

    generateDao(daoName, {}); // Default identifier 'id'
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ identifierField: '_id' }));
  });

  it('should create placeholder base DAO files if they do not exist', () => {
    fs.existsSync.mockReturnValue(false); // None exist
    generateDao(daoName, {});

    const daoBaseDir = path.join(process.cwd(), baseSrcPath, 'infra', 'db');
    const mongoDaoPath = path.join(daoBaseDir, 'mongo.dao.ts');
    expect(fs.writeFileSync).toHaveBeenCalledWith(mongoDaoPath, expect.stringContaining('MongoDao'));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${mongoDaoPath}`);

    const mongoConnectServicePath = path.join(daoBaseDir, 'mongodb-connect-service.ts');
    expect(fs.writeFileSync).toHaveBeenCalledWith(mongoConnectServicePath, expect.stringContaining('MongodbConnectService'));
    expect(mockedLogger.info).toHaveBeenCalledWith(`Placeholder created: ${mongoConnectServicePath}`);
  });

  it('should log an error if DAO file generation fails', () => {
    fs.writeFileSync.mockImplementation((filePath, _content) => {
      // Ensure this mock targets the main DAO file, not placeholders
      if (typeof filePath === 'string' && filePath.endsWith(`${kebabDaoName}.dao.ts`)) {
        throw new Error('DAO write error');
      }
    });
    generateDao(daoName, {});
    expect(mockedLogger.error).toHaveBeenCalledWith(`Failed to generate DAO '${daoName}': DAO write error`);
  });

  describe('registerGenerateDaoCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateDaoCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "dao <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('dao <name>');
    });

    it('should set alias "d" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.alias()).toBe('d');
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a new MongoDB Data Access Object (DAO)'));
    });

    it('should register options: --collection, --schema-fields, --identifier', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description, defaultValue: opt.defaultValue }));

      expect(options).toContainEqual(expect.objectContaining({
        flags: '-c, --collection <name>',
        description: expect.stringContaining('MongoDB collection name'),
      }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '-s, --schema-fields <fields>',
        description: expect.stringContaining('Comma-separated list of schema fields'),
      }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '-i, --identifier <field>',
        description: expect.stringContaining('Primary identifier field for findBy/upsertBy methods'),
        defaultValue: 'id',
      }));
    });
    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
