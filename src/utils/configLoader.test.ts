import * as fs from 'fs-extra';
import { loadConfig, getConfigValue, getSrcPath, getApiPrefix, NoonyRcConfig, defaultConfig, getTestPath, getFileNamingConvention } from './configLoader';
import { logger } from './logger'; // To spy on logger.warn/error

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock logger to spy on its methods
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    // Add other methods if they are called by configLoader directly
    plain: jest.fn(), // Assuming plain might be used, though not in current configLoader
    success: jest.fn(),
    generated: jest.fn(),
  },
}));
const mockedLogger = logger as jest.Mocked<typeof logger>;


describe('configLoader', () => {
  // Function to reset the internal loadedConfig state in configLoader
  // This is done by dynamically requiring the module again or using a specific reset function if exposed.
  // For simplicity, we'll assume direct tests are okay for now, but for true isolation,
  // module cache invalidation or an explicit reset function in configLoader.ts would be needed.
  // Let's try to get a fresh state by invalidating require cache for the module.
  let actualConfigLoader: typeof import('./configLoader');
  let originalJsonParse: typeof JSON.parse;

  beforeEach(() => {
    // Reset mocks before each test
    mockedFs.existsSync.mockReset();
    mockedFs.readFileSync.mockReset();
    // (JSON.parse as jest.Mock).mockReset(); // If JSON.parse is spied on (it's global, be careful)
    mockedLogger.info.mockReset();
    mockedLogger.warn.mockReset();
    mockedLogger.error.mockReset();

    // Store original JSON.parse
    originalJsonParse = JSON.parse;

    // Reset the module cache to get a fresh `loadedConfig = null` state
    jest.resetModules();
    actualConfigLoader = require('./configLoader');
  });

  afterEach(() => {
    jest.resetModules(); // Clean up
    JSON.parse = originalJsonParse; // Restore original JSON.parse
  });


  it('should load default config if .noonyrc.json does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);
    const config = actualConfigLoader.loadConfig();
    expect(config).toEqual(defaultConfig); // Using actualConfigLoader.defaultConfig won't work due to module caching, use imported defaultConfig
    expect(mockedLogger.info).toHaveBeenCalledWith("No .noonyrc.json found, using default configuration.");
  });

  it('should load and merge config from .noonyrc.json if it exists', () => {
    const userConfig: Partial<NoonyRcConfig> = {
      srcPath: 'app',
      apiPrefix: '/api/v2',
      conventions: { fileNaming: 'PascalCase' },
    };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));

    const config = actualConfigLoader.loadConfig();

    expect(mockedLogger.info).toHaveBeenCalledWith("Loaded configuration from .noonyrc.json");
    expect(config.srcPath).toBe('app');
    expect(config.apiPrefix).toBe('/api/v2');
    expect(config.projectType).toBe(defaultConfig.projectType); // Default value
    expect(config.conventions?.fileNaming).toBe('PascalCase'); // User value
    expect(config.conventions?.classNaming).toBe(defaultConfig.conventions?.classNaming); // Default value
  });

  it('should use default config and log error if .noonyrc.json is malformed', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('{"srcPath": "app", malformed_json}'); // Invalid JSON

    // Mock JSON.parse to throw an error for this specific test case
    JSON.parse = jest.fn().mockImplementation(() => { throw new Error('Malformed JSON'); });

    const config = actualConfigLoader.loadConfig();

    expect(config).toEqual(defaultConfig); // Falls back to default
    // Check that the error message includes the original error's message
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error loading or parsing .noonyrc.json: Malformed JSON"));
    expect(mockedLogger.warn).toHaveBeenCalledWith("Using default configuration due to error.");
  });

  it('should handle error during fs.readFileSync', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('File read error');
    });

    const config = actualConfigLoader.loadConfig();
    expect(config).toEqual(defaultConfig);
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error loading or parsing .noonyrc.json: File read error"));
  });

  it('getConfigValue should return correct value or default', () => {
    const userConfig = { srcPath: 'my-src' };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));

    actualConfigLoader.loadConfig();

    expect(actualConfigLoader.getConfigValue('srcPath')).toBe('my-src');
    expect(actualConfigLoader.getConfigValue('projectType')).toBe(defaultConfig.projectType);
    expect(actualConfigLoader.getConfigValue('apiPrefix', '/fallback')).toBe(defaultConfig.apiPrefix);
    expect(actualConfigLoader.getConfigValue('nonExistentKey' as any, 'fallbackValue')).toBe('fallbackValue');
  });

  it('specific getters should return correct values', () => {
    const userConfig = { srcPath: 'custom-src', testPath: 'custom-tests', apiPrefix: '/vCustom' };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));
    actualConfigLoader.loadConfig();

    expect(actualConfigLoader.getSrcPath()).toBe('custom-src');
    expect(actualConfigLoader.getTestPath()).toBe('custom-tests');
    expect(actualConfigLoader.getApiPrefix()).toBe('/vCustom');
    expect(actualConfigLoader.getFileNamingConvention()).toBe(defaultConfig.conventions?.fileNaming);
  });

  it('specific getters should return default values if not set in user config', () => {
    mockedFs.existsSync.mockReturnValue(false);
    actualConfigLoader.loadConfig();

    expect(actualConfigLoader.getSrcPath()).toBe(defaultConfig.srcPath);
    expect(actualConfigLoader.getTestPath()).toBe(defaultConfig.testPath);
    expect(actualConfigLoader.getApiPrefix()).toBe(defaultConfig.apiPrefix);
  });
});
