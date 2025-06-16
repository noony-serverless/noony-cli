// Add to existing src/utils/stringUtils.ts
// Make sure to handle imports correctly if not already present for pluralize
import * as pluralizeLib from 'pluralize';

export function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, match =>
    match.replace(/-/, '').toUpperCase()
  );
}

export function toCamelCase(str: string): string {
  return str.replace(/-\w/g, match => match.charAt(1).toUpperCase());
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Assuming pluralize is already imported or handled, e.g.:
// import * as pluralizeLib from 'pluralize';
// export const pluralize = pluralizeLib.plural;
// For this subtask, if it's not, this simplified version will be used by generate/test.ts later
export function pluralize(str: string): string {
  return pluralizeLib.plural(str);
}

export function lowerCase(str: string): string {
  return str.toLowerCase();
}
