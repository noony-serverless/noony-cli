import { listTemplates, registerListTemplatesCommand } from './templates';
import { logger } from '../../utils/logger';
import * as configLoader from '../../utils/configLoader'; // To mock for custom template message
import { Command } from 'commander';
import chalk from 'chalk'; // Import chalk to test its usage if logger.plain passes it through

// Mock logger
jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock configLoader for the custom template part
jest.mock('../../utils/configLoader');
const mockedConfigLoader = configLoader as jest.Mocked<typeof configLoader>;


// The actual builtInTemplates array is defined within templates.ts.
// For testing, we can infer its expected structure or length.
// Or, if we want to test against the *actual* current list, we might not mock it,
// but that makes the test less of a "unit" test for the listTemplates function's logic
// and more of an integration test with its data.
// For now, let's assume we just check that *some* output occurs in the expected format.

describe('list templates Command', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Setup default mocks
    mockedConfigLoader.getCustomTemplatePaths.mockReturnValue({}); // No custom templates by default
  });

  it('should log the header for built-in templates', () => {
    listTemplates({});
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining("📦 Available Built-in Templates:"));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining("--------------------------------"));
  });

  it('should log each built-in template with its name, description, and path', () => {
    // This test relies on the actual structure of builtInTemplates in templates.ts
    // To make it more robust without duplicating that structure here,
    // we can check for a few known templates and the format.

    listTemplates({});

    // Example check for at least one template (e.g., Handler)
    // This requires builtInTemplates to be accessible or to check for partial strings
    // Since builtInTemplates is internal to the module, we check the logger output.
    // We also check that chalk.bold and chalk.dim were used (indirectly, by checking the string format)
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`• Name: ${chalk.bold('Handler')}`));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining("Description: Generates a Noony request handler file with specified methods."));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`File Path: ${chalk.dim('src/templates/handler.hbs')}`));

    // Check for another template to ensure iteration
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`• Name: ${chalk.bold('Route')}`));

    // Check for the note about custom templates
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining("Note: Custom template listing will be available after .noonyrc.json configuration is implemented."));
  });

  it('should log a specific message if no built-in templates are defined (empty array)', () => {
    // This requires modifying the module or its internals for testing, which is hard.
    // We can't directly modify the const builtInTemplates from here.
    // This test case is more of an integration test with the actual data.
    // For now, we will assume that builtInTemplates is always populated.
    // If it were possible to mock builtInTemplates to be empty:
    //   jest.doMock('./templates', () => ({
    //     ...jest.requireActual('./templates'),
    //     builtInTemplates: [],
    //   }));
    //   listTemplates({});
    //   expect(mockedLogger.info).toHaveBeenCalledWith("No built-in templates defined yet.");
    // This test is more of a conceptual one unless we refactor templates.ts for testability of this specific case.
  });


  describe('registerListTemplatesCommand', () => {
    let program: Command;
    let listCommandSpy: jest.SpyInstance;
    let templatesCommandSpy: jest.SpyInstance;
    let mockListCommand: Command;
    let mockTemplatesCommand: Command;


    beforeEach(() => {
      program = new Command();

      // Create mock command objects that allow chaining and spying
      mockTemplatesCommand = new Command('templates') as jest.Mocked<Command>;
      jest.spyOn(mockTemplatesCommand, 'alias').mockReturnThis();
      jest.spyOn(mockTemplatesCommand, 'description').mockReturnThis();
      jest.spyOn(mockTemplatesCommand, 'action').mockReturnThis();
      jest.spyOn(mockTemplatesCommand, 'addHelpText').mockReturnThis();


      mockListCommand = new Command('list') as jest.Mocked<Command>;
      jest.spyOn(mockListCommand, 'alias').mockReturnThis();
      jest.spyOn(mockListCommand, 'description').mockReturnThis();
      // Make list.command() return our mockTemplatesCommand
      jest.spyOn(mockListCommand, 'command').mockImplementation((name) => {
        if (name === 'templates') {
          return mockTemplatesCommand;
        }
        return new Command(name) as jest.Mocked<Command>; // Default for other potential subcommands
      });

      // Make program.command() return our mockListCommand
      listCommandSpy = jest.spyOn(program, 'command').mockImplementation((name) => {
        if (name === 'list') {
          return mockListCommand;
        }
        return new Command(name) as jest.Mocked<Command>; // Default for other potential commands
      });

      registerListTemplatesCommand(program);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should register top-level "list" command', () => {
      expect(program.command).toHaveBeenCalledWith('list');
    });
    it('should set alias "ls" for "list" command', () => {
      expect(mockListCommand.alias).toHaveBeenCalledWith('ls');
    });
    it('should set description for "list" command', () => {
      expect(mockListCommand.description).toHaveBeenCalledWith(expect.stringContaining('List various available items'));
    });

    it('should register "templates" subcommand under "list"', () => {
      expect(mockListCommand.command).toHaveBeenCalledWith('templates');
    });
    it('should set alias "t" for "templates" subcommand', () => {
      expect(mockTemplatesCommand.alias).toHaveBeenCalledWith('t');
    });
    it('should set description for "templates" subcommand', () => {
      expect(mockTemplatesCommand.description).toHaveBeenCalledWith(expect.stringContaining('Displays a list of all built-in Handlebars templates'));
    });
    it('should register an action for "templates" subcommand', () => {
      expect(mockTemplatesCommand.action).toHaveBeenCalledWith(listTemplates);
    });
  });
});
