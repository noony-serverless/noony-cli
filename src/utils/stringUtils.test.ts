import { toPascalCase, toCamelCase, toKebabCase, pluralize, lowerCase } from './stringUtils';

describe('stringUtils', () => {
  describe('toPascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
    });
    it('should convert single word to PascalCase', () => {
      expect(toPascalCase('hello')).toBe('Hello');
    });
    it('should handle already PascalCase string', () => {
      expect(toPascalCase('HelloWorld')).toBe('HelloWorld');
    });
    it('should handle empty string', () => {
      expect(toPascalCase('')).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });
    it('should convert single word to camelCase (no change)', () => {
      expect(toCamelCase('hello')).toBe('hello');
    });
    it('should handle already camelCase string', () => {
      expect(toCamelCase('helloWorld')).toBe('helloWorld');
    });
    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });
    it('should convert single word to kebab-case (no change)', () => {
      expect(toKebabCase('hello')).toBe('hello');
    });
     it('should handle spaces', () => {
      expect(toKebabCase('Hello World')).toBe('hello-world');
    });
    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('');
    });
  });

  describe('pluralize', () => {
    it('should pluralize a singular noun', () => {
      expect(pluralize('apple')).toBe('apples');
    });
    it('should not pluralize an already plural noun', () => {
      expect(pluralize('apples')).toBe('apples');
    });
    it('should handle irregular nouns (basic cases from library)', () => {
      expect(pluralize('person')).toBe('people');
      expect(pluralize('mouse')).toBe('mice');
    });
  });

  describe('lowerCase', () => {
    it('should convert an uppercase string to lowercase', () => {
      expect(lowerCase('HELLO')).toBe('hello');
    });
    it('should convert a mixed-case string to lowercase', () => {
      expect(lowerCase('HeLlO')).toBe('hello');
    });
    it('should leave a lowercase string as is', () => {
      expect(lowerCase('hello')).toBe('hello');
    });
  });
});
