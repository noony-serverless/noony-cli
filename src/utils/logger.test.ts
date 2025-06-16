import { logger } from './logger';
import chalk from 'chalk'; // Import chalk to verify its usage if necessary

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods before each test
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock to avoid actual console output during tests
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console methods after each test
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logger.info should call console.log with blue icon and message', () => {
    logger.info('Test info message');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'), 'Test info message');
    // More specific check for chalk if needed:
    // expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue('ℹ'), 'Test info message');
  });

  it('logger.success should call console.log with green icon and message', () => {
    logger.success('Test success message');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅'), 'Test success message');
  });

  it('logger.warn should call console.warn with yellow icon and message', () => {
    logger.warn('Test warning message');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'), 'Test warning message');
  });

  it('logger.error should call console.error with red icon and message', () => {
    logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌'), 'Test error message');
  });

  it('logger.plain should call console.log with just the message', () => {
    logger.plain('Test plain message');
    expect(consoleLogSpy).toHaveBeenCalledWith('Test plain message');
  });

  it('logger.generated should call console.log with cyan icon and formatted message', () => {
    logger.generated('path/to/file.ts', 'MyComponent');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📄'), expect.stringContaining('MyComponent generated:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(chalk.dim('path/to/file.ts')));
  });

  it('logger.generated should work without componentName', () => {
    logger.generated('path/to/another/file.ts');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📄'), expect.stringContaining('generated:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(chalk.dim('path/to/another/file.ts')));
  });
});
