import * as Gfs from 'fs-extra';
import * as path from 'path';
import { validateProject, registerValidateCommand } from './project';
import { logger } from '../../utils/logger';
import { glob } from 'glob'; // For mocking
import { Command } from 'commander';

// Mocks
const fs = Gfs as jest.Mocked<typeof Gfs>;
jest.mock('fs-extra');

jest.mock('glob');
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('validate project Command', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default: all paths exist
    fs.pathExists.mockResolvedValue(true as never);
    // Default: glob finds no non-conforming files for naming convention check initially
    // This will be overridden in specific tests for naming conventions.
    // The pattern for glob in checkHandlerNamingConvention is '**/src/chrome/handlers/*/*.ts'
    // So, if it returns empty, it means no files, or all files conform.
    // To simulate conforming files, we can have it return files that do conform.
    const handlersBasePath = path.join(process.cwd(), 'src', 'chrome', 'handlers');
    mockedGlob.mockImplementation(async (pattern, options) => {
        if (options?.cwd === handlersBasePath) { // This was the old glob pattern, now it's absolute
            return [] as never;
        }
        // New glob pattern is absolute path.join(handlersBasePath, '*', '*.ts')
        const expectedPattern = path.join(handlersBasePath, '*', '*.ts').replace(/\\/g, '/');
        if(pattern.toString().replace(/\\/g, '/') === expectedPattern) {
            return [
                path.join(handlersBasePath, 'featureA', 'a.handlers.ts'),
                path.join(handlersBasePath, 'featureB', 'b.handlers.ts')
            ] as never;
        }
        return [] as never;
    });
  });

  it('should log "PASSED" for all checks if project structure is valid and conventions met', async () => {
    await validateProject({});

    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('[✅] package.json Presence: package.json exists.'));
    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('[✅] tsconfig.json Presence: tsconfig.json exists.'));
    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('[✅] src Directory Presence: src exists.'));
    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('[✅] Handler Naming Convention: Handler files seem to follow basic naming convention'));
    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('Project validation completed. No major issues found!'));
  });

  it('should log "FAILED" if a required file (package.json) does not exist', async () => {
    fs.pathExists.mockImplementation(async (p) => !p.toString().endsWith('package.json'));

    await validateProject({});
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('[❌] package.json Presence: package.json does not exist.'));
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Found 1 potential issue(s).'));
  });

  it('should log "WARNING" if a recommended directory (e.g. src/chrome) does not exist', async () => {
    fs.pathExists.mockImplementation(async (p) => !p.toString().includes('src/chrome'));

    await validateProject({});
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[⚠️] src/chrome Directory Presence: src/chrome does not exist.'));
  });

  it('should log "WARNING" for handler naming convention if non-conforming files are found', async () => {
    const handlersBasePath = path.join(process.cwd(), 'src', 'chrome', 'handlers');
    const nonConformingFile = 'badname.ts';
    const nonConformingPath = path.join(handlersBasePath, 'myfeature', nonConformingFile);

    mockedGlob.mockImplementation(async (pattern) => {
        const expectedPattern = path.join(handlersBasePath, '*', '*.ts').replace(/\\/g, '/');
        if(pattern.toString().replace(/\\/g, '/') === expectedPattern) {
            return [nonConformingPath] as never;
        }
        return [] as never;
    });

    await validateProject({});
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[⚠️] Handler Naming Convention: Some files in handler feature directories might not follow the *.handlers.ts convention.'));
    expect(mockedLogger.plain).toHaveBeenCalledWith(expect.stringContaining(`Details: Files: ${path.relative(process.cwd(), nonConformingPath)}`));
  });

  it('should log "WARNING" for handler naming convention if src/chrome/handlers dir does not exist', async () => {
    fs.pathExists.mockImplementation(async (p) => {
        const normalizedPath = p.toString().replace(/\\/g, '/');
        if (normalizedPath.endsWith('src/chrome/handlers')) return false;
        return !normalizedPath.endsWith('nonExistentFile.json'); // Make package.json etc. exist
    });

    await validateProject({});
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[⚠️] Handler Naming Convention: No src/chrome/handlers directory found to check conventions.'));
  });


  describe('registerValidateCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerValidateCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "validate" command', () => {
      expect(program.command).toHaveBeenCalledWith('validate');
    });

    it('should set aliases "v", "check" and correct description', () => {
        const addedCommand = commandSpy.mock.results[0].value;
        expect(addedCommand.aliases()).toEqual(['v', 'check']);
        expect(addedCommand.description()).toEqual(expect.stringContaining('Validates project structure, naming conventions'));
    });

    it('should register an action', () => {
        const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toHaveBeenCalledWith(validateProject);
    });
  });
});
