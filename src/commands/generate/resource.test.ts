import { generateResource, registerGenerateResourceCommand } from './resource';
import * as featureGenerator from './feature'; // To spy on generateFeature
import { logger } from '../../utils/logger';
import { Command } from 'commander';

// Mock the feature generator
jest.mock('./feature');

// Mock logger
jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('generate Resource Command', () => {
  const resourceName = 'product';

  // Spy on generateFeature
  const spiedGenerateFeature = jest.spyOn(featureGenerator, 'generateFeature');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call generateFeature with standard RESTful CRUD methods and pass through options', async () => {
    const options = {
      fields: "name:string,price:number",
      collection: "all_products",
      daoIdentifier: "sku",
      routePrefix: "/store",
      auth: "api-key" as const,
      skipDto: true, // Example of a skip flag
    };

    await generateResource(resourceName, options);

    expect(mockedLogger.info).toHaveBeenCalledWith(`🧱 Generating RESTful resource: ${resourceName}`);
    expect(spiedGenerateFeature).toHaveBeenCalledWith(resourceName, {
      fields: options.fields,
      daoSchemaFields: options.fields, // For resource, daoSchemaFields defaults to fields
      collection: options.collection,
      daoIdentifier: options.daoIdentifier,
      crudMethods: 'get,post,put,delete,getAll', // Enforced for resource
      routePrefix: options.routePrefix,
      auth: options.auth,
      // featureGroupName is not set by resource, so generateFeature will default it

      // Pass skip options through
      skipDomain: undefined, // Not skipped in this test case
      skipDto: true,
      skipDao: undefined,
      skipService: undefined,
      skipApi: undefined,
      skipHandlers: undefined,
      skipRoutes: undefined,
      skipTests: undefined,
      skipUnitTests: undefined,
      skipE2eTests: undefined,
    });
  });

  it('should call generateFeature with defaults if no specific options are provided to resource command', async () => {
    await generateResource(resourceName, {});

    expect(spiedGenerateFeature).toHaveBeenCalledWith(resourceName, {
      fields: undefined,
      daoSchemaFields: undefined,
      collection: undefined,
      daoIdentifier: undefined,
      crudMethods: 'get,post,put,delete,getAll', // Enforced
      routePrefix: undefined,
      auth: undefined,

      skipDomain: undefined,
      skipDto: undefined,
      skipDao: undefined,
      skipService: undefined,
      skipApi: undefined,
      skipHandlers: undefined,
      skipRoutes: undefined,
      skipTests: undefined,
      skipUnitTests: undefined,
      skipE2eTests: undefined,
    });
  });

  it('should pass all skip flags to generateFeature', async () => {
    const options = {
      skipDomain: true, skipDto: true, skipDao: true, skipService: true,
      skipApi: true, skipHandlers: true, skipRoutes: true, skipTests: true,
      // skipUnitTests and skipE2eTests are covered by skipTests in generateFeature if skipTests is true
      // but resource command passes them explicitly so feature can decide
      skipUnitTests: true,
      skipE2eTests: true,
    };
    await generateResource(resourceName, options);

    // We expect generateFeature to be called with an object that includes all these skip options
    expect(spiedGenerateFeature).toHaveBeenCalledWith(resourceName, expect.objectContaining(options));
  });


  describe('registerGenerateResourceCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateResourceCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });

    it('should register "resource <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('resource <name>');
    });

    it('should set aliases "gres", "res" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.aliases()).toEqual(['gres', 'res']);
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a standard RESTful CRUD resource.'));
    });

    it('should register relevant options (subset of feature options)', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const registeredOptionsFlags = addedCommand.options.map((opt: any) => opt.flags);

      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--fields <fields>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--collection <name>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--dao-identifier <field>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--route-prefix <prefix>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--auth <type>'));
      expect(registeredOptionsFlags).toContainEqual('--skip-domain');
      expect(registeredOptionsFlags).toContainEqual('--skip-dto');
      expect(registeredOptionsFlags).toContainEqual('--skip-dao');
      expect(registeredOptionsFlags).toContainEqual('--skip-service');
      expect(registeredOptionsFlags).toContainEqual('--skip-api');
      expect(registeredOptionsFlags).toContainEqual('--skip-handlers');
      expect(registeredOptionsFlags).toContainEqual('--skip-routes');
      expect(registeredOptionsFlags).toContainEqual('--skip-tests');
      expect(registeredOptionsFlags).toContainEqual('--skip-unit-tests');
      expect(registeredOptionsFlags).toContainEqual('--skip-e2e-tests');
    });
    it('should register an action', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.action()).toBeInstanceOf(Function);
    });
  });
});
