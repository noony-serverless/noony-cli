import { generateFeature, registerGenerateFeatureCommand } from './feature';
import * as domainGenerator from './domain';
import * as dtoGenerator from './dto';
import * as daoGenerator from './dao';
import * as serviceGenerator from './service';
import * as apiGenerator from './api';
import * as handlerGenerator from './handler';
import * as routeGenerator from './route';
import * as testGenerator from './test';
import { logger } from '../../utils/logger';
import { Command } from 'commander';
import * as stringUtils from '../../utils/stringUtils'; // For toKebabCase

// Mock individual generators
jest.mock('./domain');
jest.mock('./dto');
jest.mock('./dao');
jest.mock('./service');
jest.mock('./api');
jest.mock('./handler');
jest.mock('./route');
jest.mock('./test');

// Mock logger
jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock stringUtils.toKebabCase for predictable featureGroupName default
jest.mock('../../utils/stringUtils', () => ({
  ...jest.requireActual('../../utils/stringUtils'), // Retain other utils
  toKebabCase: jest.fn((name: string) => `${name}-kebab`), // Ensure type for name
}));


describe('generate Feature Command', () => {
  const featureName = 'userProfile';
  const defaultKebabFeatureName = 'userProfile-kebab'; // from mocked toKebabCase

  // Spy on each generator function
  const spiedGenerateDomain = jest.spyOn(domainGenerator, 'generateDomain');
  const spiedGenerateDto = jest.spyOn(dtoGenerator, 'generateDto');
  const spiedGenerateDao = jest.spyOn(daoGenerator, 'generateDao');
  const spiedGenerateService = jest.spyOn(serviceGenerator, 'generateService');
  const spiedGenerateApi = jest.spyOn(apiGenerator, 'generateApi');
  const spiedGenerateHandler = jest.spyOn(handlerGenerator, 'generateHandler');
  const spiedGenerateRoute = jest.spyOn(routeGenerator, 'generateRoute');
  const spiedGenerateTest = jest.spyOn(testGenerator, 'generateTest');

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
    (stringUtils.toKebabCase as jest.Mock).mockClear().mockImplementation((name: string) => `${name}-kebab`); // Reset and re-implement mock
  });

  it('should call all individual generators with default options when no skip flags are provided', async () => {
    await generateFeature(featureName, {});

    expect(spiedGenerateDomain).toHaveBeenCalledWith(featureName, { fields: undefined });
    expect(spiedGenerateDto).toHaveBeenCalledWith(featureName, { fields: undefined });
    expect(spiedGenerateDao).toHaveBeenCalledWith(featureName, { schemaFields: undefined, collection: undefined, identifier: undefined });
    expect(spiedGenerateService).toHaveBeenCalledWith(featureName, { methods: 'get,post,put,delete,getAll', dao: true });
    expect(spiedGenerateApi).toHaveBeenCalledWith(featureName, { methods: 'get,post,put,delete,getAll' });
    expect(spiedGenerateHandler).toHaveBeenCalledWith(featureName, { methods: 'get,post,put,delete,getAll', feature: defaultKebabFeatureName, auth: undefined });
    expect(spiedGenerateRoute).toHaveBeenCalledWith(featureName, { methods: 'get,post,put,delete,getAll', prefix: undefined, feature: defaultKebabFeatureName, auth: undefined });
    expect(spiedGenerateTest).toHaveBeenCalledWith('handler', featureName, { unit: true, feature: defaultKebabFeatureName, methods: 'get,post,put,delete,getAll' });
    expect(spiedGenerateTest).toHaveBeenCalledWith('e2e', featureName, { e2e: true });

    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Generating Domain Object for ${featureName}...`));
    // ... check other log messages if necessary
    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining(`Feature generation for ${featureName} complete!`));
  });

  it('should use provided options and pass them to individual generators', async () => {
    const options = {
      fields: "name:string,email:string",
      daoSchemaFields: "email:string,passwordHash:string",
      collection: "auth_users",
      daoIdentifier: "email",
      crudMethods: "get,post",
      routePrefix: "/auth",
      featureGroupName: "authentication",
      auth: "bearer" as const,
    };
    await generateFeature(featureName, options);

    expect(spiedGenerateDomain).toHaveBeenCalledWith(featureName, { fields: options.fields });
    expect(spiedGenerateDto).toHaveBeenCalledWith(featureName, { fields: options.fields });
    expect(spiedGenerateDao).toHaveBeenCalledWith(featureName, { schemaFields: options.daoSchemaFields, collection: options.collection, identifier: options.daoIdentifier });
    expect(spiedGenerateService).toHaveBeenCalledWith(featureName, { methods: options.crudMethods, dao: true });
    expect(spiedGenerateApi).toHaveBeenCalledWith(featureName, { methods: options.crudMethods });
    expect(spiedGenerateHandler).toHaveBeenCalledWith(featureName, { methods: options.crudMethods, feature: options.featureGroupName, auth: options.auth });
    expect(spiedGenerateRoute).toHaveBeenCalledWith(featureName, { methods: options.crudMethods, prefix: options.routePrefix, feature: options.featureGroupName, auth: options.auth });
    expect(spiedGenerateTest).toHaveBeenCalledWith('handler', featureName, { unit: true, feature: options.featureGroupName, methods: options.crudMethods });
    expect(spiedGenerateTest).toHaveBeenCalledWith('e2e', featureName, { e2e: true });
  });

  it('should skip domain generation if --skip-domain is true', async () => {
    await generateFeature(featureName, { skipDomain: true });
    expect(spiedGenerateDomain).not.toHaveBeenCalled();
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Skipping Domain Object for ${featureName}.`));
  });

  it('should skip DTO generation if --skip-dto is true', async () => {
    await generateFeature(featureName, { skipDto: true });
    expect(spiedGenerateDto).not.toHaveBeenCalled();
  });

  it('should skip DAO generation if --skip-dao is true', async () => {
    await generateFeature(featureName, { skipDao: true });
    expect(spiedGenerateDao).not.toHaveBeenCalled();
  });

  it('should skip Service generation if --skip-service is true', async () => {
    await generateFeature(featureName, { skipService: true });
    expect(spiedGenerateService).not.toHaveBeenCalled();
  });

  it('should skip API generation if --skip-api is true', async () => {
    await generateFeature(featureName, { skipApi: true });
    expect(spiedGenerateApi).not.toHaveBeenCalled();
  });

  it('should skip Handlers generation if --skip-handlers is true', async () => {
    await generateFeature(featureName, { skipHandlers: true });
    expect(spiedGenerateHandler).not.toHaveBeenCalled();
  });

  it('should skip Routes generation if --skip-routes is true', async () => {
    await generateFeature(featureName, { skipRoutes: true });
    expect(spiedGenerateRoute).not.toHaveBeenCalled();
  });

  it('should skip all tests if --skip-tests is true', async () => {
    await generateFeature(featureName, { skipTests: true });
    expect(spiedGenerateTest).not.toHaveBeenCalled();
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Skipping all Tests for ${featureName}.`));
  });

  it('should skip unit tests if --skip-unit-tests is true (but not E2E)', async () => {
    await generateFeature(featureName, { skipUnitTests: true });
    expect(spiedGenerateTest).not.toHaveBeenCalledWith('handler', featureName, expect.anything());
    expect(spiedGenerateTest).toHaveBeenCalledWith('e2e', featureName, { e2e: true }); // E2E should still run
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Skipping Unit Tests for ${featureName}.`));
  });

  it('should skip E2E tests if --skip-e2e-tests is true (but not unit)', async () => {
    await generateFeature(featureName, { skipE2eTests: true });
    expect(spiedGenerateTest).toHaveBeenCalledWith('handler', featureName, expect.anything()); // Unit should still run
    expect(spiedGenerateTest).not.toHaveBeenCalledWith('e2e', featureName, expect.anything());
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Skipping E2E Tests for ${featureName}.`));
  });

  it('should use default kebab-case featureGroupName if not provided', async () => {
    // Use the actual toKebabCase for this test, or ensure the mock is specific for this.
    (stringUtils.toKebabCase as jest.Mock).mockImplementationOnce(jest.requireActual('../../utils/stringUtils').toKebabCase);
    const expectedKebab = jest.requireActual('../../utils/stringUtils').toKebabCase('TestFeature');

    await generateFeature('TestFeature', {});
    expect(spiedGenerateHandler).toHaveBeenCalledWith('TestFeature', expect.objectContaining({ feature: expectedKebab }));
    expect(spiedGenerateRoute).toHaveBeenCalledWith('TestFeature', expect.objectContaining({ feature: expectedKebab }));
    expect(spiedGenerateTest).toHaveBeenCalledWith('handler', 'TestFeature', expect.objectContaining({ feature: expectedKebab }));
  });


  describe('registerGenerateFeatureCommand', () => {
    let program: Command;
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
      program = new Command();
      commandSpy = jest.spyOn(program, 'command');
      registerGenerateFeatureCommand(program);
    });

    afterEach(() => {
        commandSpy.mockRestore();
    });


    it('should register "feature <name>" command', () => {
      expect(program.command).toHaveBeenCalledWith('feature <name>');
    });
    it('should set alias "gf" and correct description', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      expect(addedCommand.alias()).toBe('gf');
      expect(addedCommand.description()).toEqual(expect.stringContaining('Generate a complete feature set:'));
    });
    it('should register all options', () => {
      const addedCommand = commandSpy.mock.results[0].value;
      const registeredOptionsFlags = addedCommand.options.map((opt: any) => opt.flags);

      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--fields <fields>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--dao-schema-fields <fields>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--collection <name>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--dao-identifier <field>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--crud-methods <methods>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--route-prefix <prefix>'));
      expect(registeredOptionsFlags).toContainEqual(expect.stringContaining('--feature-group-name <group>'));
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
