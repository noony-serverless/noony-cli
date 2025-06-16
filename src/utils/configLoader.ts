import * as fs from 'fs-extra';
import * as path from 'path';

export interface NoonyRcConventions {
  fileNaming?: 'kebab-case' | 'PascalCase' | 'camelCase' | 'snake_case';
  classNaming?: 'PascalCase' | 'camelCase'; // Typically PascalCase
  functionNaming?: 'camelCase' | 'snake_case';
}

export interface NoonyRcTemplates {
  handler?: string; // Changed to simple names, e.g., "handler" not "customHandlerTemplate"
  route?: string;
  service?: string;
  dao?: string;
  dto?: string;
  domain?: string;
  api?: string;
  testUnitHandler?: string;
  testE2eFeature?: string;
  testE2eSteps?: string;
  // Add other template keys as needed
}

export interface NoonyRcConfig {
  projectType?: string; // e.g., "noony-fastify"
  typescript?: boolean;
  srcPath?: string;
  testPath?: string;
  defaultAuth?: 'api-key' | 'bearer' | 'basic' | string; // string for extensibility
  apiPrefix?: string;
  conventions?: NoonyRcConventions;
  templates?: NoonyRcTemplates;
}

const defaultConfig: NoonyRcConfig = {
  projectType: 'noony-fastify',
  typescript: true,
  srcPath: 'src', // Default source path
  testPath: 'tests', // Default test path
  apiPrefix: '/v1', // Default API prefix
  defaultAuth: undefined,
  conventions: {
    fileNaming: 'kebab-case',
    classNaming: 'PascalCase',
    functionNaming: 'camelCase',
  },
  templates: {},
};

let loadedConfig: NoonyRcConfig | null = null;

import { logger } from './logger'; // Import the new logger

export function loadConfig(): NoonyRcConfig {
  if (loadedConfig) {
    return loadedConfig;
  }

  const configPath = path.join(process.cwd(), '.noonyrc.json');
  try {
    if (fs.existsSync(configPath)) {
      const configFileContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configFileContent) as Partial<NoonyRcConfig>;

      // Deep merge user config with defaults (simple merge for now)
      loadedConfig = {
        ...defaultConfig,
        ...userConfig,
        conventions: {
          ...defaultConfig.conventions,
          ...(userConfig.conventions || {}),
        },
        templates: {
          ...defaultConfig.templates,
          ...(userConfig.templates || {}),
        },
      };
         logger.info("Loaded configuration from .noonyrc.json");
    } else {
      loadedConfig = { ...defaultConfig };
         logger.info("No .noonyrc.json found, using default configuration.");
    }
     } catch (error: any) { // Ensure 'error' is typed if accessing properties like .message
       logger.error(`Error loading or parsing .noonyrc.json: ${error.message}`);
    loadedConfig = { ...defaultConfig }; // Fallback to defaults on error
       logger.warn("Using default configuration due to error.");
  }
  return loadedConfig;
}

// Function to get a specific config value or a default
export function getConfigValue<K extends keyof NoonyRcConfig>(
    key: K,
    defaultValue?: NoonyRcConfig[K]
): NoonyRcConfig[K] | undefined {
    const config = loadConfig();
    return config[key] !== undefined ? config[key] : defaultValue;
}

// Specific getters for commonly used nested properties with defaults
export function getSrcPath(): string {
    return getConfigValue('srcPath', defaultConfig.srcPath) as string;
}

export function getTestPath(): string {
    return getConfigValue('testPath', defaultConfig.testPath) as string;
}

export function getApiPrefix(): string {
    return getConfigValue('apiPrefix', defaultConfig.apiPrefix) as string;
}

export function getFileNamingConvention(): NoonyRcConventions['fileNaming'] {
    const conventions = getConfigValue('conventions', defaultConfig.conventions);
    return conventions?.fileNaming || defaultConfig.conventions?.fileNaming;
}

// Getter for the whole templates object
export function getCustomTemplatePaths(): NoonyRcTemplates | undefined {
  const config = loadConfig();
  return config.templates;
}
