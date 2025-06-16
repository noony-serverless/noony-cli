import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob'; // For file pattern matching

interface ValidationResult {
  check: string;
  status: '✅ PASSED' | '⚠️ WARNING' | '❌ FAILED';
  message: string;
  details?: string;
}

async function checkFileExists(filePath: string, checkName: string, importance: 'must' | 'should' = 'must'): Promise<ValidationResult> {
  const fullPath = path.join(process.cwd(), filePath);
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
}

async function checkDirectoryExists(dirPath: string, checkName: string, importance: 'must' | 'should' = 'must'): Promise<ValidationResult> {
  // Similar to checkFileExists, but for directories
  return checkFileExists(dirPath, checkName, importance);
}

async function checkHandlerNamingConvention(): Promise<ValidationResult> {
  const checkName = 'Handler Naming Convention';
  const handlersBasePath = path.join(process.cwd(), 'src', 'chrome', 'handlers');
  if (!await fs.pathExists(handlersBasePath)) {
    return { check: checkName, status: '⚠️ WARNING', message: 'No src/chrome/handlers directory found to check conventions.' };
  }

  // Find all files that might be handlers, then check their names.
  // This is a simplified check. A real check would be more sophisticated.
  const files = await glob('**/*.ts', { cwd: handlersBasePath });
  let incorrectFiles: string[] = [];
  files.forEach(file => {
    if (file.endsWith('.handlers.ts') || file.endsWith('.handler.ts')) {
      // Potentially correct by our convention
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
      // Could be a handler not following the convention
      // For this basic check, let's assume any .ts file not ending in .handlers.ts is a "warning"
      // if it's not a test file. This is very naive.
      if (!file.includes('/') && !file.startsWith('.')) { // Only top-level files in a feature for this naive check
        // This check is too broad, let's refine it or make it more specific
      }
    }
  });

  // For this example, let's just check if any file *doesn't* end with .handlers.ts
  // and isn't a test file, directly under a feature folder.
  const pattern = path.join(handlersBasePath, '*', '*.ts').replace(/\\/g, '/'); // platform-agnostic glob
  const allHandlerDirFiles = await glob(pattern);

  let nonConformingHandlers: string[] = [];
  for (const file of allHandlerDirFiles) {
     const baseName = path.basename(file);
     if (!baseName.endsWith('.handlers.ts') && !baseName.endsWith('.test.ts') && !baseName.endsWith('.spec.ts')) {
         nonConformingHandlers.push(path.relative(process.cwd(), file));
     }
  }

  if (nonConformingHandlers.length > 0) {
    return {
      check: checkName,
      status: '⚠️ WARNING',
      message: 'Some files in handler directories might not follow the *.handlers.ts convention.',
      details: `Files: ${nonConformingHandlers.join(', ')}`
    };
  }

  return { check: checkName, status: '✅ PASSED', message: 'Handler files seem to follow basic naming convention (*.handlers.ts).' };
}


export async function validateProject(options: any) {
  console.log("
🔍 Validating project structure and conventions...");
  console.log("-------------------------------------------------");

  const results: ValidationResult[] = [];

  results.push(await checkFileExists('package.json', 'package.json Presence'));
  results.push(await checkFileExists('tsconfig.json', 'tsconfig.json Presence'));
  results.push(await checkDirectoryExists('src', 'src Directory Presence'));
  results.push(await checkDirectoryExists('src/chrome', 'src/chrome Directory Presence', 'should'));
  results.push(await checkDirectoryExists('src/chrome/handlers', 'src/chrome/handlers Directory', 'should'));
  results.push(await checkDirectoryExists('src/chrome/services', 'src/chrome/services Directory', 'should'));
  results.push(await checkDirectoryExists('src/chrome/domain', 'src/chrome/domain Directory', 'should'));
  results.push(await checkDirectoryExists('src/infra', 'src/infra Directory', 'should'));
  results.push(await checkDirectoryExists('src/infra/db', 'src/infra/db Directory', 'should'));
  results.push(await checkDirectoryExists('tests', 'tests Directory Presence', 'should'));

  // Naming convention check (very basic)
  results.push(await checkHandlerNamingConvention());

  // TODO: Add more checks:
  // - .noonyrc.json presence and schema (once implemented)
  // - TypeDI container registration checks (complex)
  // - Zod schema presence in DTOs (complex)
  // - etc.

  console.log("
Validation Results:");
  let issuesFound = 0;
  results.forEach(res => {
    console.log(`  [${res.status}] ${res.check}: ${res.message}`);
    if (res.details) {
      console.log(`    Details: ${res.details}`);
    }
    if (res.status === '❌ FAILED' || res.status === '⚠️ WARNING') {
      issuesFound++;
    }
  });

  console.log("-------------------------------------------------");
  if (issuesFound === 0) {
    console.log("🎉 Project validation completed. No major issues found!");
  } else {
    console.log(`Project validation completed. Found ${issuesFound} potential issue(s).`);
  }
}

export function registerValidateCommand(program: Command) {
  program
    .command('validate')
    .aliases(['v', 'check'])
    .description('Validates existing project structure and identifies inconsistencies.')
    // .option('-s, --strict', 'Enable stricter validation checks') // Future option
    .action(validateProject);
}
