import * as fs from 'fs-extra';
import * as path from 'path';
import { getTemplateContent } from './templateManager';
import * as configLoader from './configLoader'; // To mock getCustomTemplatePaths
import { logger } from './logger'; // To spy on logger.warn/error

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock configLoader's getCustomTemplatePaths
jest.mock('./configLoader', () => ({
  ...jest.requireActual('./configLoader'), // Import and retain original behavior for other functions if needed
  getCustomTemplatePaths: jest.fn(),
}));
const mockedConfigLoader = configLoader as jest.Mocked<typeof configLoader>;

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    // Add other methods if they are called by templateManager directly
  },
}));
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('templateManager', () => {
  const builtInTemplateDir = path.join(__dirname, '../templates'); // Relative from templateManager.ts to templates dir
  const defaultHandlerTemplatePath = 'handler.hbs'; // Path relative to templates dir
  const fullBuiltInHandlerPath = path.join(builtInTemplateDir, defaultHandlerTemplatePath);

  beforeEach(() => {
    mockedFs.existsSync.mockReset();
    mockedFs.readFileSync.mockReset();
    mockedConfigLoader.getCustomTemplatePaths.mockReset();
    mockedLogger.warn.mockReset();
    mockedLogger.error.mockReset();
    mockedLogger.info.mockReset(); // If info is used for "Using custom template..."
  });

  it('should load built-in template if no custom path is provided', () => {
    mockedConfigLoader.getCustomTemplatePaths.mockReturnValue({}); // No custom templates configured
    mockedFs.readFileSync.mockReturnValue('built-in handler content');

    const content = getTemplateContent('handler', defaultHandlerTemplatePath);

    expect(mockedFs.readFileSync).toHaveBeenCalledWith(fullBuiltInHandlerPath, 'utf-8');
    expect(content).toBe('built-in handler content');
    // expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Using built-in template for 'handler'`));
  });

  it('should load custom template if path is provided and file exists', () => {
    const customPath = './custom/my-handler.hbs';
    const resolvedCustomPath = path.resolve(process.cwd(), customPath);
    mockedConfigLoader.getCustomTemplatePaths.mockReturnValue({ handler: customPath });
    mockedFs.existsSync.mockReturnValueOnce(true); // For custom path
    mockedFs.readFileSync.mockReturnValueOnce('custom handler content'); // For custom path

    const content = getTemplateContent('handler', defaultHandlerTemplatePath);

    expect(mockedFs.existsSync).toHaveBeenCalledWith(resolvedCustomPath);
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(resolvedCustomPath, 'utf-8');
    expect(content).toBe('custom handler content');
    expect(mockedLogger.info).toHaveBeenCalledWith(`Using custom template for 'handler' from: ${resolvedCustomPath}`);
  });

  it('should fall back to built-in template and warn if custom path is provided but file does not exist', () => {
    const customPath = './custom/non-existent-handler.hbs';
    const resolvedCustomPath = path.resolve(process.cwd(), customPath);
    mockedConfigLoader.getCustomTemplatePaths.mockReturnValue({ handler: customPath });
    mockedFs.existsSync.mockReturnValueOnce(false); // Custom path does not exist
    mockedFs.readFileSync.mockReturnValueOnce('built-in handler content'); // For fallback built-in

    const content = getTemplateContent('handler', defaultHandlerTemplatePath);

    expect(mockedFs.existsSync).toHaveBeenCalledWith(resolvedCustomPath);
    expect(mockedLogger.warn).toHaveBeenCalledWith(`Warning: Custom template for 'handler' not found at '${resolvedCustomPath}'. Falling back to built-in template.`);
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(fullBuiltInHandlerPath, 'utf-8');
    expect(content).toBe('built-in handler content');
  });

  it('should fall back to built-in template and warn if custom template read fails', () => {
    const customPath = './custom/unreadable-handler.hbs';
    const resolvedCustomPath = path.resolve(process.cwd(), customPath);
    mockedConfigLoader.getCustomTemplatePaths.mockReturnValue({ handler: customPath });
    mockedFs.existsSync.mockReturnValueOnce(true); // Custom path exists
    mockedFs.readFileSync
      .mockImplementationOnce(() => { throw new Error('Read permission denied'); }) // Custom read fails
      .mockReturnValueOnce('built-in handler content'); // Fallback built-in read

    const content = getTemplateContent('handler', defaultHandlerTemplatePath);

    expect(mockedFs.existsSync).toHaveBeenCalledWith(resolvedCustomPath);
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(resolvedCustomPath, 'utf-8'); // Attempted to read custom
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining(`Warning: Error reading custom template '${resolvedCustomPath}'. Falling back to built-in. Error:`));
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(fullBuiltInHandlerPath, 'utf-8'); // Fallback read
    expect(content).toBe('built-in handler content');
  });

  it('should throw error if built-in template is not found (critical error)', () => {
    mockedConfigLoader.getCustomTemplatePaths.mockReturnValue({}); // No custom path
    mockedFs.readFileSync.mockImplementation(() => { // Simulate built-in not found
      throw new Error('Built-in file not found');
    });

    expect(() => {
      getTemplateContent('handler', defaultHandlerTemplatePath);
    }).toThrow(`Built-in template ${defaultHandlerTemplatePath} is missing.`);
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining(`FATAL: Built-in template '${defaultHandlerTemplatePath}' not found at '${fullBuiltInHandlerPath}'. Error:`));
  });
});
