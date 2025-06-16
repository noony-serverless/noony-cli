import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob'; // For file pattern matching
import { logger } from '../../utils/logger';
  check: string;
  status: '✅ PASSED' | '⚠️ WARNING' | '❌ FAILED';
  message: string;
  details?: string;
}

async function checkFileExistsWithLogger(filePath: string, checkName: string, importance: 'must' | 'should' = 'must'): Promise<ValidationResult> {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    const exists = await fs.pathExists(fullPath);
    if (exists) {
      return { check: checkName, status: '✅ PASSED', message: `${filePath} exists.` };
    } else {
      return {
        check: checkName,
        status: importance === 'must' ? '❌ FAILED' : '⚠️ WARNING',
        message: `${filePath} does not exist.`
      };
    }
  } catch (e: any) {
    logger.error(`Error checking existence of ${filePath}: ${e.message}`);
    return {
      check: checkName,
      status: '❌ FAILED',
      message: `Could not verify existence of ${filePath} due to an error.`,
      details: e.message
    };
  }
}

async function checkDirectoryExistsWithLogger(dirPath: string, checkName: string, importance: 'must' | 'should' = 'must'): Promise<ValidationResult> {
  return checkFileExistsWithLogger(dirPath, checkName, importance);
}

async function checkHandlerNamingConvention(): Promise<ValidationResult> {
  const checkName = 'Handler Naming Convention';
  const handlersBasePath = path.join(process.cwd(), 'src', 'chrome', 'handlers'); // Assuming srcPath is 'src' for this specific check

  try {
    if (!await fs.pathExists(handlersBasePath)) {
      return { check: checkName, status: '⚠️ WARNING', message: 'No src/chrome/handlers directory found to check conventions.' };
    }

    const pattern = path.join(handlersBasePath, '*', '*.ts').replace(/\\/g, '/');
    const allHandlerDirFiles = await glob(pattern);

    let nonConformingHandlers: string[] = [];
    for (const file of allHandlerDirFiles) {
       const baseName = path.basename(file);
       if (!baseName.endsWith('.handlers.ts') && !baseName.endsWith('.test.ts') && !baseName.endsWith('.spec.ts') && !baseName.endsWith('Api.ts') && !baseName.endsWith('.dto.ts')) { // Also exclude Api.ts and .dto.ts
           nonConformingHandlers.push(path.relative(process.cwd(), file));
       }
    }

    if (nonConformingHandlers.length > 0) {
      return {
        check: checkName,
        status: '⚠️ WARNING',
        message: 'Some files in handler feature directories might not follow the *.handlers.ts convention.',
        details: `Files: ${nonConformingHandlers.join(', ')}`
      };
    }
    return { check: checkName, status: '✅ PASSED', message: 'Handler files seem to follow basic naming convention (*.handlers.ts) or are recognized auxiliary files (Api, Dto).' };

  } catch (e: any) {
    logger.error(`Error during handler naming convention check: ${e.message}`);
    return {
      check: checkName,
      status: '❌ FAILED',
      message: 'Could not perform handler naming convention check due to an error.',
      details: e.message
    };
  }
}


export async function validateProject(options: any) {
  logger.plain("
🔍 Validating project structure and conventions...");
  logger.plain("-------------------------------------------------");

  const results: ValidationResult[] = [];

  results.push(await checkFileExistsWithLogger('package.json', 'package.json Presence'));
  results.push(await checkFileExistsWithLogger('tsconfig.json', 'tsconfig.json Presence'));
  results.push(await checkDirectoryExistsWithLogger('src', 'src Directory Presence')); // Assuming default srcPath for this check
  results.push(await checkDirectoryExistsWithLogger('src/chrome', 'src/chrome Directory Presence', 'should'));
  results.push(await checkDirectoryExistsWithLogger('src/chrome/handlers', 'src/chrome/handlers Directory', 'should'));
  results.push(await checkDirectoryExistsWithLogger('src/chrome/services', 'src/chrome/services Directory', 'should'));
  results.push(await checkDirectoryExistsWithLogger('src/chrome/domain', 'src/chrome/domain Directory', 'should'));
  results.push(await checkDirectoryExistsWithLogger('src/infra', 'src/infra Directory', 'should'));
  results.push(await checkDirectoryExistsWithLogger('src/infra/db', 'src/infra/db Directory', 'should'));
  results.push(await checkDirectoryExistsWithLogger('tests', 'tests Directory Presence', 'should')); // Assuming default testPath

  results.push(await checkHandlerNamingConvention());

  // TODO: Add more checks using configLoader for paths:
  // - .noonyrc.json presence and schema (once implemented)
  // - TypeDI container registration checks (complex)
  // - Zod schema presence in DTOs (complex)

  logger.plain("
Validation Results:");
  let issuesFound = 0;
  results.forEach(res => {
    const logFn = res.status === '❌ FAILED' ? logger.error : (res.status === '⚠️ WARNING' ? logger.warn : logger.success);
    logFn(`[${res.status.substring(0,1)}] ${res.check}: ${res.message}`); // Using first char of status as icon already in logFn
    if (res.details) {
      logger.plain(`    Details: ${res.details}`);
    }
    if (res.status === '❌ FAILED' || res.status === '⚠️ WARNING') {
      issuesFound++;
    }
  });

  logger.plain("-------------------------------------------------");
  if (issuesFound === 0) {
    logger.success("Project validation completed. No major issues found!");
  } else {
    logger.warn(`Project validation completed. Found ${issuesFound} potential issue(s).`);
  }
}

export function registerValidateCommand(program: Command) {
  program
    .command('validate')
    .aliases(['v', 'check'])
    .description('Validates project structure, naming conventions, and checks for common configuration issues against Noony CLI best practices.')
    // .option('-s, --strict', 'Enable stricter validation checks') // Future option
    .addHelpText('after', `
Examples:
  noony validate
  noony v`)
    .action(validateProject);
}
