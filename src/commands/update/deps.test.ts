import * as Gfs from 'fs-extra';
import * as path from 'path';
import { updateDeps, registerUpdateDepsCommand } from './deps';
import { logger } from '../../utils/logger';
import { glob } from 'glob'; // For mocking
import { Command } from 'commander';
import * as configLoader from '../../utils/configLoader'; // Import the actual module

// Mocks
const fs = Gfs as jest.Mocked<typeof Gfs>;
jest.mock('fs-extra');

jest.mock('glob');
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock configLoader for getSrcPath
jest.mock('../../utils/configLoader', () => ({
  // Keep other exports if any, though for this test, only getSrcPath is relevant
  ...jest.requireActual('../../utils/configLoader'),
  getSrcPath: jest.fn(() => 'src'), // Default mock value
}));
// We don't need to assign to mockedConfigLoader as we call getSrcPath directly from the import

describe('update deps Command', () => {
  const projectRoot = process.cwd();
  // srcPath will be 'src' due to the mock above
  const servicesPath = path.join(projectRoot, 'src', 'chrome', 'services');
  const apiPath = path.join(projectRoot, 'src', 'chrome', 'handlers', 'api');
  const daoPath = path.join(projectRoot, 'src', 'infra', 'db');

  beforeEach(() => {
    jest.resetAllMocks();
    // Default mocks
    fs.pathExists.mockResolvedValue(true as never);
    mockedGlob.mockResolvedValue([] as never);
    fs.readFile.mockResolvedValue('' as never);
    // Reset getSrcPath mock calls if needed, though it's simple for now
    (configLoader.getSrcPath as jest.Mock).mockClear().mockReturnValue('src');
  });

  it('should log introductory and concluding advisory messages', async () => {
    await updateDeps({});
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining("Checking for potential dependency updates"));
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining("This command lists potential services, APIs, and DAOs"));
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining("ACTION REQUIRED: Please review the list above"));
  });

  it('should find and list service classes', async () => {
    // Glob in findPotentialServices uses absolute: true, so it returns absolute paths
    mockedGlob.mockImplementation(async (pattern, options) => {
      if (options?.cwd === servicesPath && pattern === '*Service.ts') {
        return [path.join(servicesPath, 'UserService.ts'), path.join(servicesPath, 'OrderService.ts')] as never;
      }
      return [] as never;
    });
    fs.readFile
      .mockImplementation(async (p) => {
        if (p === path.join(servicesPath, 'UserService.ts')) return "export class UserService {}" as never;
        if (p === path.join(servicesPath, 'OrderService.ts')) return "export class OrderService {}" as never;
        return "" as never;
      });

    await updateDeps({});

    expect(mockedLogger.info).toHaveBeenCalledWith("Found potential Services (@Service classes usually):");
    // path.relative will be called with absolute paths from glob and projectRoot
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`  - UserService (in ${path.relative(projectRoot, servicesPath)} )`));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`  - OrderService (in ${path.relative(projectRoot, servicesPath)} )`));
  });

  it('should find and list API classes', async () => {
    mockedGlob.mockImplementation(async (pattern, options) => {
      if (options?.cwd === apiPath && pattern === '*Api.ts') {
        return [path.join(apiPath, 'UserApi.ts')] as never;
      }
      return [] as never;
    });
    fs.readFile.mockImplementation(async (p) => {
        if (p === path.join(apiPath, 'UserApi.ts')) return "export class UserApi {}" as never;
        return "" as never;
    });

    await updateDeps({});
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining("Found potential API classes (@Service classes usually):"));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`  - UserApi (in ${path.relative(projectRoot, apiPath)} )`));
  });

  it('should find and list DAO classes, filtering out MongoDao', async () => {
    mockedGlob.mockImplementation(async (pattern, options) => {
      if (options?.cwd === daoPath && pattern === '*.dao.ts') {
        return [
            path.join(daoPath,'User.dao.ts'),
            path.join(daoPath,'Product.dao.ts'),
            path.join(daoPath,'mongo.dao.ts')
        ] as never;
      }
      return [] as never;
    });
    fs.readFile.mockImplementation(async (p) => {
        if (p === path.join(daoPath, 'User.dao.ts')) return "export class UserDao {}" as never;
        if (p === path.join(daoPath, 'Product.dao.ts')) return "export class ProductDao {}" as never;
        if (p === path.join(daoPath, 'mongo.dao.ts')) return "export abstract class MongoDao {}" as never;
        return "" as never;
    });

    await updateDeps({});
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining("Found potential DAOs (some might be @Service):"));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`  - UserDao (in ${path.relative(projectRoot, daoPath)} )`));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`  - ProductDao (in ${path.relative(projectRoot, daoPath)} )`));
    expect(mockedLogger.plain).not.toHaveBeenCalledWith(expect.stringContaining("  - MongoDao"));
  });

  it('should log messages if standard directories are not found', async () => {
    fs.pathExists.mockResolvedValue(false as never);
    await updateDeps({});
    expect(mockedLogger.warn).toHaveBeenCalledWith(`Service directory not found: ${path.join('src', 'chrome', 'services')}`);
    expect(mockedLogger.warn).toHaveBeenCalledWith(`API Class directory not found: ${path.join('src', 'chrome', 'handlers', 'api')}`);
    expect(mockedLogger.warn).toHaveBeenCalledWith(`DAO directory not found: ${path.join('src', 'infra', 'db')}`);
  });

  it('should log a message if no potential dependencies are found in standard locations', async () => {
    // Defaults are: pathExists=true, glob finds no files.
    await updateDeps({});
    expect(mockedLogger.info).toHaveBeenCalledWith("No potential services, APIs, or DAOs found in standard locations.");
  });

   it('should handle errors during glob search gracefully', async () => {
    mockedGlob.mockImplementation(async () => { throw new Error('Glob error'); });
    await updateDeps({});
    // The error is caught inside findPotentialServices
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error scanning for Service in"));
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error scanning for API Class in"));
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error scanning for DAO in"));
  });

  it('should handle errors during readFile gracefully', async () => {
    mockedGlob.mockImplementation(async (pattern, options) => {
        if (options?.cwd === servicesPath && pattern === '*Service.ts') {
            return [path.join(servicesPath, 'UserService.ts')] as never;
        }
        return [] as never;
    });
    fs.readFile.mockRejectedValue(new Error('Read file error') as never);

    await updateDeps({});
    // The error is caught inside findPotentialServices and logged there.
    // This test might be tricky if findPotentialServices itself is not returning anything due to the error.
    // The current findPotentialServices catches and logs, then returns empty `classNames`.
    // So, the main `updateDeps` will report "No potential services..."
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Error reading file ${path.join(servicesPath, 'UserService.ts')}`));
    expect(mockedLogger.info).toHaveBeenCalledWith("No potential services, APIs, or DAOs found in standard locations.");
  });


  describe('registerUpdateDepsCommand', () => {
    let program: Command;
    let updateCommandSpy: jest.SpyInstance;
    let mockUpdateCommand: Command;
    let mockDepsCommand: Command;

    beforeEach(() => {
      program = new Command();

      mockDepsCommand = new Command('deps') as jest.Mocked<Command>;
      jest.spyOn(mockDepsCommand, 'alias').mockReturnThis();
      jest.spyOn(mockDepsCommand, 'description').mockReturnThis();
      jest.spyOn(mockDepsCommand, 'action').mockReturnThis();
      jest.spyOn(mockDepsCommand, 'addHelpText').mockReturnThis();


      mockUpdateCommand = new Command('update') as jest.Mocked<Command>;
      jest.spyOn(mockUpdateCommand, 'alias').mockReturnThis();
      jest.spyOn(mockUpdateCommand, 'description').mockReturnThis();
      jest.spyOn(mockUpdateCommand, 'command').mockImplementation((name) => {
        if (name === 'deps') return mockDepsCommand;
        return new Command(name) as jest.Mocked<Command>;
      });

      updateCommandSpy = jest.spyOn(program, 'command').mockImplementation((name) => {
        if (name === 'update') return mockUpdateCommand;
        return new Command(name) as jest.Mocked<Command>;
      });

      registerUpdateDepsCommand(program);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should register top-level "update" command', () => {
      expect(program.command).toHaveBeenCalledWith('update');
    });
    it('should set alias "u" for "update" command', () => {
      expect(mockUpdateCommand.alias).toHaveBeenCalledWith('u');
    });
    it('should set description for "update" command', () => {
      expect(mockUpdateCommand.description).toHaveBeenCalledWith(expect.stringContaining('Provides utilities for project updates'));
    });

    it('should register "deps" subcommand under "update"', () => {
      expect(mockUpdateCommand.command).toHaveBeenCalledWith('deps');
    });
    it('should set alias "d" for "deps" subcommand', () => {
      expect(mockDepsCommand.alias).toHaveBeenCalledWith('d');
    });
    it('should set description for "deps" subcommand', () => {
      expect(mockDepsCommand.description).toHaveBeenCalledWith(expect.stringContaining('Scans the project for Services, APIs, and DAOs'));
    });
    it('should register an action for "deps" subcommand', () => {
      expect(mockDepsCommand.action).toHaveBeenCalledWith(updateDeps);
    });
  });
});
