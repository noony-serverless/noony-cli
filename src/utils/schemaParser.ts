import { z } from 'zod'; // Required for ObjectId validation if used

type ObjectId = string;
export interface ParsedField {
  name: string;
  type: string; // The original type string from input, e.g., "string", "number[]", "MyDto"
  zodType: string;
  typescriptType: string; // The corresponding TypeScript type, e.g., "string", "number[]", "MyDto"
  isOptional: boolean;
  isIdField?: boolean;
}

export function parseSchemaFields(fieldsString?: string): Array<ParsedField> {
  if (!fieldsString) return [];
  return fieldsString.split(',').map(field => {
    let [nameWithType, typeInput] = field.trim().split(':');
    const isOptional = nameWithType.endsWith('?');
    const actualName = isOptional ? nameWithType.slice(0, -1) : nameWithType;
    const originalType = typeInput || 'string'; // Default to string if type not specified
    const lcOriginalType = originalType.toLowerCase();
    const isIdField = actualName.toLowerCase() === 'id';

    let zodType: string;
    let typescriptType: string;

    if (lcOriginalType.endsWith('[]')) {
      const arrayItemType = originalType.slice(0, -2);
      const lcArrayItemType = arrayItemType.toLowerCase();
      let itemZodSchema: string;
      let itemTsType: string;

      switch (lcArrayItemType) {
        case 'string': itemZodSchema = 'z.string()'; itemTsType = 'string'; break;
        case 'number': itemZodSchema = 'z.number()'; itemTsType = 'number'; break;
        case 'boolean': itemZodSchema = 'z.boolean()'; itemTsType = 'boolean'; break;
        // For domain objects, we refer to other domain object types directly
        default: itemZodSchema = `z.custom<${arrayItemType}>()`; itemTsType = arrayItemType; break;
      }
      zodType = `z.array(${itemZodSchema})`;
      typescriptType = `${itemTsType}[]`;
    } else {
      switch (lcOriginalType) {
        case 'string': zodType = 'z.string()'; typescriptType = 'string'; break;
        case 'number': zodType = 'z.number()'; typescriptType = 'number'; break;
        case 'boolean': zodType = 'z.boolean()'; typescriptType = 'boolean'; break;
        case 'date': zodType = 'z.date()'; typescriptType = 'Date'; break;
        // Domain 'id' is string, ObjectId is a DB concern.
        // 'objectid' type from schema usually means it's a reference to another entity's ID.
        case 'objectid': zodType = 'z.string()'; typescriptType = 'string'; break;
        case 'uuid': zodType = 'z.string().uuid()'; typescriptType = 'string'; break;
        // If it's not a primitive, assume it's a custom type (another domain object/interface)
        default:
          zodType = `z.custom<${originalType}>()`; // For Zod, treat as custom
          typescriptType = originalType; // For TS, use the type name directly
          break;
      }
    }
    return { name: actualName, type: originalType, zodType, typescriptType, isOptional, isIdField };
  });
}
