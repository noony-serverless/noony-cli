import * as fs from 'fs-extra';
import * as path from 'path';
import { getCustomTemplatePaths } from './configLoader'; // Adjusted import
import { NoonyRcTemplates } from './configLoader'; // Import the interface too

// Helper function to safely get a template path from the config
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
        if (fs.existsSync(userCustomPath)) {
            try {
                console.log(`Using custom template for '${templateType}' from: ${userCustomPath}`);
                return fs.readFileSync(userCustomPath, 'utf-8');
            } catch (error) {
                console.warn(`Warning: Error reading custom template '${userCustomPath}'. Falling back to built-in. Error: ${error}`);
            }
        } else {
            console.warn(`Warning: Custom template for '${templateType}' not found at '${userCustomPath}'. Falling back to built-in template.`);
        }
    }

    // Fallback to built-in template
    try {
        // console.log(`Using built-in template for '${templateType}': ${builtInTemplateFullPath}`);
        return fs.readFileSync(builtInTemplateFullPath, 'utf-8');
    } catch (error) {
        console.error(`FATAL: Built-in template '${defaultBuiltInPath}' not found at '${builtInTemplateFullPath}'. Error: ${error}`);
        // This is a critical error if a built-in template is missing.
        throw new Error(`Built-in template ${defaultBuiltInPath} is missing.`);
    }
}
