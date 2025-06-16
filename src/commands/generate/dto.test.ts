import * as Gfs from 'fs-extra';
import * as path from 'path';
import { generateDto, registerGenerateDtoCommand } from './dto';
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

describe('generate DTO Command', () => {
  const baseSrcPath = 'test-src';
  const dtoName = 'task';
  const kebabDtoName = 'task';
  const pascalDtoName = 'Task';

  const mockDefaultFields = [
    { name: 'title', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false },
    { name: 'isDone', type: 'boolean', zodType: 'z.boolean()', typescriptType: 'boolean', isOptional: true, isIdField: false },
  ];
  let mockTemplateFn: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    mockedConfigLoader.getSrcPath.mockReturnValue(baseSrcPath);

    mockTemplateFn = jest.fn().mockReturnValue('compiled dto template content');
    mockedHandlebars.compile.mockReturnValue(mockTemplateFn);
    mockedTemplateManager.getTemplateContent.mockReturnValue('raw dto template');

    mockedSchemaParser.parseSchemaFields.mockReturnValue(mockDefaultFields);
  });

  it('should generate a DTO file with default options (using mocked fields)', () => {
    generateDto(dtoName, {}); // Empty options

    const expectedTargetPath = path.join(process.cwd(), baseSrcPath, 'chrome', 'handlers', 'dto', `${kebabDtoName}.dto.ts`);

    expect(mockedTemplateManager.getTemplateContent).toHaveBeenCalledWith('dto', 'dto.hbs');
    expect(mockedHandlebars.compile).toHaveBeenCalledWith('raw dto template');
    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({ name: dtoName }));
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.dirname(expectedTargetPath));
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedTargetPath, 'compiled dto template content');
    expect(mockedLogger.generated).toHaveBeenCalledWith(expectedTargetPath, `${pascalDtoName} DTOs`);
  });

  it('should call parseSchemaFields with --fields option', () => {
    const fieldsArg = "name:string,status?:string";
    generateDto(dtoName, { fields: fieldsArg });
    expect(mockedSchemaParser.parseSchemaFields).toHaveBeenCalledWith(fieldsArg);
  });

  it('should pass correct field data to template, separating idField', () => {
    const mockIdField = { name: 'id', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: true, isIdField: true };
    const mockRegularField = { name: 'name', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false };
    mockedSchemaParser.parseSchemaFields.mockReturnValue([mockIdField, mockRegularField]);

    generateDto(dtoName, { fields: "id?:string,name:string" });

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      fields: [mockRegularField], // idField should be filtered out from 'fields'
      idIsOptional: true, // From the mockIdField
    }));
  });

   it('should set idIsOptional to true in template if id field is not in --fields', () => {
    mockedSchemaParser.parseSchemaFields.mockReturnValue([ // No id field
      { name: 'name', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false }
    ]);

    generateDto(dtoName, { fields: "name:string" });

    expect(mockTemplateFn).toHaveBeenCalledWith(expect.objectContaining({
      idIsOptional: true,
    }));
  });


  it('should log notes if --validation or --nested options are used (though not implemented)', () => {
    generateDto(dtoName, { validation: true });
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining("--validation flag was passed. You may need to manually add custom validation"));

    generateDto(dtoName, { nested: true });
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining("--nested flag was passed. You may need to manually define nested DTO schemas"));
  });

  it('should log an error if DTO file generation fails', () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('DTO write error');
    });
    generateDto(dtoName, {});
    expect(mockedLogger.error).toHaveBeenCalledWith(`Failed to generate DTOs for '${dtoName}': DTO write error`);
  });

  describe('registerGenerateDtoCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateDtoCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "dto <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('dto <name>');
    });

    it('should set aliases "dt", "gdt" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.aliases()).toEqual(['dt', 'gdt']); // Commander stores aliases as an array
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate new Data Transfer Object (DTO)'));
    });

    it('should register option: --fields', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const options = addedCommand.options.map((opt: any) => ({ flags: opt.flags, description: opt.description }));
      expect(options).toContainEqual(expect.objectContaining({
        flags: '-f, --fields <fields>',
        description: expect.stringContaining('Comma-separated list of DTO fields'),
      }));
    });

    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
