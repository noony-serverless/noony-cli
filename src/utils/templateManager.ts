import * as fs from 'fs-extra';
import * as path from 'path';
import { getCustomTemplatePaths, NoonyRcTemplates } from './configLoader';
import { logger } from './logger';
function getCustomTemplatePath(templateType: keyof NoonyRcTemplates): string | undefined {
    const customTemplatesConfig = getCustomTemplatePaths();
    return customTemplatesConfig?.[templateType];
}

export function getTemplateContent(
    templateType: keyof NoonyRcTemplates, // e.g., 'handler', 'route'
    defaultBuiltInPath: string // Path relative to the templates directory, e.g., 'handler.hbs'
): string {
    const customPathString = getCustomTemplatePath(templateType);
    const builtInTemplateFullPath = path.join(__dirname, '../templates', defaultBuiltInPath); // Adjusted to standard CLI structure

    if (customPathString) {
        const userCustomPath = path.resolve(process.cwd(), customPathString);
        try {
            if (fs.existsSync(userCustomPath)) {
                logger.info(`Using custom template for '${templateType}' from: ${userCustomPath}`);
                return fs.readFileSync(userCustomPath, 'utf-8');
            } else {
                logger.warn(`Custom template for '${templateType}' not found at '${userCustomPath}'. Falling back to built-in template.`);
            }
        } catch (e: any) {
            logger.warn(`Error checking or reading custom template '${userCustomPath}'. Falling back to built-in. Error: ${e.message}`);
        }
    }

    // Fallback to built-in template
    try {
        // logger.info(`Using built-in template for '${templateType}': ${builtInTemplateFullPath}`);
        return fs.readFileSync(builtInTemplateFullPath, 'utf-8');
    } catch (e: any) {
        logger.error(`FATAL: Built-in template '${defaultBuiltInPath}' not found at '${builtInTemplateFullPath}'. Error: ${e.message}`);
        throw new Error(`Built-in template ${defaultBuiltInPath} is missing. CLI might be corrupted.`);
    }
}
