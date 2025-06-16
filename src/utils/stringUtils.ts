// Add to existing src/utils/stringUtils.ts
import * as pluralizeLib from 'pluralize';

export function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, (match) => match.replace(/-/, '').toUpperCase());
}

export function toCamelCase(str: string): string {
  return str.replace(/-\w/g, (match) => match.charAt(1).toUpperCase());
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function pluralize(str: string): string {
  return pluralizeLib.plural(str);
}
