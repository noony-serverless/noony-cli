import chalk from 'chalk';

export const logger = {
  info: (message: string, ...optionalParams: any[]) => {
    console.log(chalk.blue('ℹ'), message, ...optionalParams);
  },
  success: (message: string, ...optionalParams: any[]) => {
    console.log(chalk.green('✅'), message, ...optionalParams);
  },
  warn: (message: string, ...optionalParams: any[]) => {
    console.warn(chalk.yellow('⚠️'), message, ...optionalParams);
  },
  error: (message: string, ...optionalParams: any[]) => {
    console.error(chalk.red('❌'), message, ...optionalParams);
  },
  // For messages that shouldn't have an icon/color prefix
  plain: (message: string, ...optionalParams: any[]) => {
    console.log(message, ...optionalParams);
  },
  // Specific for generator output, less verbose than success for each file
  generated: (filePath: string, componentName?: string) => {
    const name = componentName ? `${componentName} ` : '';
    console.log(chalk.cyan('📄'), `${name}generated: ${chalk.dim(filePath)}`);
  }
};
