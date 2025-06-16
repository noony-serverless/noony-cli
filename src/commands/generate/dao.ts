import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { toPascalCase, toCamelCase, toKebabCase, pluralize } from '../../utils/stringUtils';
import { parseSchemaFields } from '../../utils/schemaParser';
import { getSrcPath } from '../../utils/configLoader';
import { getTemplateContent } from '../../utils/templateManager';

interface DaoOptions {
  collection?: string;
  schemaFields?: string;
  identifier?: string;
}

Handlebars.registerHelper('pascalCase', toPascalCase);
Handlebars.registerHelper('camelCase', toCamelCase);
Handlebars.registerHelper('kebabCase', toKebabCase);
Handlebars.registerHelper('eq', (a, b) => a === b);

export function generateDao(name: string, options: DaoOptions) {
  const pascalCaseName = toPascalCase(name);
  const kebabCaseName = toKebabCase(name);
  const collectionName = options.collection || pluralize(kebabCaseName);
  const schemaFields = parseSchemaFields(options.schemaFields);
  // Default identifier to 'id', which will be mapped to '_id' in ObjectId context
  const identifierField = options.identifier || 'id';
  // If identifier is 'id', treat it as '_id' for MongoDB context in template
  const templateIdentifier = identifierField.toLowerCase() === 'id' ? '_id' : identifierField;


  const templateContent = getTemplateContent('dao', 'dao.hbs');
  const compiledTemplate = Handlebars.compile(templateContent);

  const content = compiledTemplate({
    name: name,
    pascalCaseName,
    kebabCaseName,
    collectionName,
    schemaFields,
    identifierField: templateIdentifier, // Use the processed identifier for the template
  });

  const targetDir = path.join(process.cwd(), getSrcPath(), 'infra', 'db');
  const targetFilePath = path.join(targetDir, `${kebabCaseName}.dao.ts`);

  fs.ensureDirSync(targetDir);
  fs.writeFileSync(targetFilePath, content);
  console.log(`DAO generated: ${targetFilePath}`);

  // Ensure mongo.dao.ts and mongodb-connect-service.ts exist (placeholders)
  const mongoDaoPath = path.join(targetDir, 'mongo.dao.ts');
  if (!fs.existsSync(mongoDaoPath)) {
    fs.writeFileSync(mongoDaoPath, `
// Placeholder for base MongoDao
import { z } from 'zod';
import { Collection, Db, ObjectId, Filter, FindOptions, UpdateFilter, UpdateOptions } from 'mongodb';
import { MongodbConnectService } from './mongodb-connect-service';

export abstract class MongoDao<TDocument extends { _id?: ObjectId }> {
  protected collection: Collection<TDocument>;
  protected schema: z.ZodType<TDocument>; // Schema for validation

  constructor(
    protected mongoService: MongodbConnectService,
    collectionName: string,
    schema: z.ZodType<TDocument>
  ) {
    // It's better to get the db instance from the mongoService after it's connected
    // For now, assuming mongoService.db is available upon instantiation
    if (!mongoService.db) {
        console.warn("MongoDB connection (mongoService.db) is not yet available. Ensure MongodbConnectService initializes it.");
        // throw new Error("MongoDB connection is not available.");
    }
    this.collection = mongoService.db.collection<TDocument>(collectionName);
    this.schema = schema;
  }

  protected validate(data: unknown, schemaToUse?: z.ZodType<any>): TDocument {
    try {
      return (schemaToUse || this.schema).parse(data) as TDocument;
    } catch (error) {
      // console.error("Validation error:", error); // Log or handle more gracefully
      throw error; // Re-throw for higher layers to handle
    }
  }

  async findOne(filter: Filter<TDocument>, options?: FindOptions): Promise<TDocument | null> {
    return await this.collection.findOne(filter, options);
  }

  async insertOne(doc: Omit<TDocument, '_id'> | Partial<TDocument>): Promise<TDocument | null> {
    const validatedDoc = this.validate(doc, this.schema.omit({ _id: true })); // Validate without _id for creation
    const result = await this.collection.insertOne(validatedDoc as any); // 'any' due to complex MongoDB types
    if (!result.insertedId) return null;
    return { _id: result.insertedId, ...validatedDoc } as TDocument;
  }

  async updateOne(filter: Filter<TDocument>, update: UpdateFilter<TDocument> | Partial<TDocument>, options?: UpdateOptions): Promise<TDocument | null> {
    // Note: Complex validation for updates might be needed (e.g. using partial schemas)
    const result = await this.collection.findOneAndUpdate(filter, update, { ...options, returnDocument: 'after' });
    return result as TDocument | null;
  }

  async deleteOne(filter: Filter<TDocument>): Promise<boolean> {
    const result = await this.collection.deleteOne(filter);
    return result.deletedCount === 1;
  }
}
`);
  }

  const mongoConnectServicePath = path.join(targetDir, 'mongodb-connect-service.ts');
  if (!fs.existsSync(mongoConnectServicePath)) {
    fs.writeFileSync(mongoConnectServicePath, `
// Placeholder for MongodbConnectService
import { Service } from 'typedi';
import { MongoClient, Db } from 'mongodb';

@Service()
export class MongodbConnectService {
  public db!: Db;
  private client!: MongoClient;

  constructor() {
    // TODO: Replace with your actual MongoDB connection string and options
    // const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';
    // this.client = new MongoClient(MONGODB_URI);
    // this.connect().catch(console.error);
    console.log("MongodbConnectService: In a real app, connect to MongoDB here.");
  }

  async connect(): Promise<void> {
    // await this.client.connect();
    // this.db = this.client.db();
    // console.log('Successfully connected to MongoDB.');
  }

  async disconnect(): Promise<void> {
    // await this.client.close();
    // console.log('Disconnected from MongoDB.');
  }
}
`);
  }
}

export function registerGenerateDaoCommand(program: Command) {
  program
    .command('dao <name>')
    .alias('d')
    .description('Generate a new MongoDB DAO with Zod schema')
    .option('-c, --collection <name>', 'MongoDB collection name (defaults to pluralized kebab-case name)')
    .option('-s, --schema-fields <fields>', 'Comma-separated list of schema fields (e.g., "name:string,email:string,age?:number,isActive:boolean,birthDate:date,refId:objectId")')
    .option('-i, --identifier <field>', 'Primary identifier field for find/upsert methods (defaults to "id", maps to "_id")', 'id')
    .action(generateDao);
}
