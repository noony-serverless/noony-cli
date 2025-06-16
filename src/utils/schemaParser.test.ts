import { parseSchemaFields, ParsedField } from './schemaParser';
// Note: ObjectId might not be needed directly for tests if not deeply asserting its instance

describe('schemaParser', () => {
  describe('parseSchemaFields', () => {
    it('should return an empty array for undefined input', () => {
      expect(parseSchemaFields(undefined)).toEqual([]);
    });

    it('should return an empty array for an empty string input', () => {
      expect(parseSchemaFields('')).toEqual([]);
    });

    it('should parse a single field with type', () => {
      const expected: ParsedField[] = [
        { name: 'name', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false },
      ];
      expect(parseSchemaFields('name:string')).toEqual(expected);
    });

    it('should parse a single field without type (defaults to string)', () => {
      const expected: ParsedField[] = [
        { name: 'title', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: false, isIdField: false },
      ];
      expect(parseSchemaFields('title')).toEqual(expected);
    });

    it('should parse multiple fields', () => {
      const result = parseSchemaFields('name:string,age:number,isActive:boolean');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ name: 'name', type: 'string', zodType: 'z.string()', typescriptType: 'string' });
      expect(result[1]).toMatchObject({ name: 'age', type: 'number', zodType: 'z.number()', typescriptType: 'number' });
      expect(result[2]).toMatchObject({ name: 'isActive', type: 'boolean', zodType: 'z.boolean()', typescriptType: 'boolean' });
    });

    it('should handle optional fields correctly', () => {
      const expected: ParsedField[] = [
        { name: 'email', type: 'string', zodType: 'z.string()', typescriptType: 'string', isOptional: true, isIdField: false },
      ];
      expect(parseSchemaFields('email?:string')).toEqual(expected);
      const result = parseSchemaFields('address?'); // Optional without explicit type
      expect(result[0]).toMatchObject({ name: 'address', isOptional: true, type: 'string' });
    });

    it('should correctly identify "id" field', () => {
      const result = parseSchemaFields('id:string,name:string');
      expect(result[0]).toMatchObject({ name: 'id', isIdField: true });
      expect(result[1]).toMatchObject({ name: 'name', isIdField: false });
    });

    it('should parse various types correctly', () => {
      const fields = 'birthDate:date,refId:objectid,uniqueId:uuid,tags:string[],count:number,active:boolean,settings:CustomType,relatedIds:MyDto[]';
      const result = parseSchemaFields(fields);
      expect(result.find(f => f.name === 'birthDate')).toMatchObject({ type: 'date', zodType: 'z.date()', typescriptType: 'Date' });
      expect(result.find(f => f.name === 'refId')).toMatchObject({ type: 'objectid', zodType: 'z.string()', typescriptType: 'string' }); // DTOs represent ObjectId as string
      expect(result.find(f => f.name === 'uniqueId')).toMatchObject({ type: 'uuid', zodType: 'z.string().uuid()', typescriptType: 'string' });
      expect(result.find(f => f.name === 'tags')).toMatchObject({ type: 'string[]', zodType: 'z.array(z.string())', typescriptType: 'string[]' });
      expect(result.find(f => f.name === 'settings')).toMatchObject({ type: 'CustomType', zodType: 'z.custom<CustomType>()', typescriptType: 'CustomType' });
      expect(result.find(f => f.name === 'relatedIds')).toMatchObject({ type: 'MyDto[]', zodType: 'z.array(z.custom<MyDto>())', typescriptType: 'MyDto[]' });
    });

    it('should handle mixed optional and required fields', () => {
        const result = parseSchemaFields('name:string,description?:string,age:number');
        expect(result.find(f => f.name === 'name')?.isOptional).toBe(false);
        expect(result.find(f => f.name === 'description')?.isOptional).toBe(true);
        expect(result.find(f => f.name === 'age')?.isOptional).toBe(false);
    });
  });
});
