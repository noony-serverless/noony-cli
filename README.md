# Noony CLI Generator

## Overview

Noony CLI is a command-line interface tool designed to accelerate the development of Node.js applications, particularly those following the Noony + Fastify serverless architecture. It helps generate boilerplate code for various components like handlers, routes, services, DAOs, DTOs, domain objects, API classes, and tests, allowing developers to focus on business logic.

## Prerequisites

- Node.js (version 18.x or higher recommended)
- npm (usually comes with Node.js)

## Installation

To install Noony CLI globally, run:

```bash
npm install -g noony-cli
# (Note: 'noony-cli' is an example package name, replace with actual if different)
```

If you prefer to install it as a development dependency in your project:

```bash
npm install --save-dev noony-cli
# Then run with npx: npx noony ...
```

## Getting Started

Once installed, you can generate a full feature set with a single command:

```bash
noony generate feature my-new-feature --fields "name:string,description?:string"
```

This command will generate the domain object, DTOs, DAO, service, API class, handlers, routes, and basic tests for "my-new-feature".

To see available commands and options:

```bash
noony --help
noony generate --help
```

## Global Options

- `--help`: Displays help information for Noony CLI or a specific command.
- `--version`: Shows the installed version of Noony CLI.

## Configuration (`.noonyrc.json`)

Noony CLI can be configured using a `.noonyrc.json` file in the root of your project. This allows you to customize default paths, naming conventions, and template locations.

If this file is not found, the CLI will use its default settings.

**Configurable Properties:**

*   `projectType` (string): Specifies the project type (e.g., "noony-fastify"). Currently informational.
*   `typescript` (boolean): Indicates if the project uses TypeScript (default: `true`).
*   `srcPath` (string): The root path for your source code (default: `"src"`). All generated source files will be placed relative to this path.
*   `testPath` (string): The root path for your test files (default: `"tests"`).
*   `defaultAuth` (string): Default authentication type to suggest or apply (e.g., "api-key", "bearer").
*   `apiPrefix` (string): Default prefix for generated API routes (default: `"/v1"`).
*   `conventions` (object): *Planned for future use.*
    *   `fileNaming` ('kebab-case' | 'PascalCase' | 'camelCase' | 'snake_case'): Default: 'kebab-case'.
    *   `classNaming` ('PascalCase' | 'camelCase'): Default: 'PascalCase'.
    *   `functionNaming` ('camelCase' | 'snake_case'): Default: 'camelCase'.
*   `templates` (object): Allows overriding built-in templates. Provide paths relative to your project root.
    *   `handler`: Path to custom Handlebars template for handlers.
    *   `route`: Path to custom Handlebars template for routes.
    *   `service`: Path to custom Handlebars template for services.
    *   `dao`: Path to custom Handlebars template for DAOs.
    *   `dto`: Path to custom Handlebars template for DTOs.
    *   `domain`: Path to custom Handlebars template for domain objects.
    *   `api`: Path to custom Handlebars template for API classes.
    *   `testUnitHandler`: Path to custom Handlebars template for handler unit tests.
    *   `testE2eFeature`: Path to custom Handlebars template for E2E feature files.
    *   `testE2eSteps`: Path to custom Handlebars template for E2E step definition files.

**Example `.noonyrc.json`:**

```json
{
  "srcPath": "source",
  "testPath": "test-files",
  "apiPrefix": "/api/v2",
  "conventions": {
    "fileNaming": "PascalCase"
  },
  "templates": {
    "handler": "./my-custom-templates/handler.hbs",
    "dto": "./my-custom-templates/dto.zod.hbs"
  }
}
```

## Commands

### `noony generate <component> <name> [options]` (alias `g`)

This is the primary command for generating different components.

#### `handler <name>` (alias `h`)
Generates request handlers.
*   **Options**:
    *   `-m, --methods <methods>`: Comma-separated list of HTTP methods (e.g., "get,post,put,delete,getAll"). Default: "get,post,put,delete,getAll".
    *   `-f, --feature <featureName>`: Feature group name for path organization. Defaults to kebab-case of `<name>`.
    *   `--auth <type>`: Authentication type (e.g., "api-key", "bearer"). *Currently informational for template.*
    *   `--validation`: Include Zod validation parsing (Not yet fully implemented in default template).
*   **Example**:
    ```bash
    noony generate handler user --methods "get,post" --feature "user-management"
    ```
    This generates handler functions for GET and POST for the "user" resource within the "user-management" feature group.

#### `route <name>` (alias `r`)
Generates Fastify route definitions.
*   **Options**:
    *   `-p, --prefix <path>`: API versioning prefix. Default: Value from `.noonyrc.json` or `"/v1"`.
    *   `-m, --methods <methods>`: Comma-separated list of methods (e.g., "getById,post,put,delete,getAll").
    *   `--resource`: Generate RESTful resource routes (implies all CRUD methods).
    *   `--auth <type>`: Authentication type. *Currently informational for template.*
    *   `-f, --feature <featureName>`: Feature group name to link to correct handlers. Defaults to kebab-case of `<name>`.
*   **Example**:
    ```bash
    noony g r product --resource --prefix "/api/v2" --feature "catalog"
    ```

#### `service <name>` (alias `s`)
Generates service classes with TypeDI integration.
*   **Options**:
    *   `--dao`: Generate corresponding DAO (placeholder if DAO doesn't exist). Implicitly true.
    *   `--registration <type>`: Service registration pattern ('auto'|'manual'). Default: 'auto'. *Currently informational.*
    *   `-m, --methods <methods>`: Comma-separated list of service methods (e.g., "get,create,update,delete"). Default: "get,create,update,delete".
*   **Example**:
    ```bash
    noony gen service order --methods "get,create,update"
    ```

#### `dao <name>` (alias `d`)
Generates MongoDB Data Access Objects (DAOs) with Zod schemas.
*   **Options**:
    *   `-c, --collection <name>`: MongoDB collection name. Defaults to pluralized kebab-case of `<name>`.
    *   `-s, --schema-fields <fields>`: Comma-separated list of schema fields (e.g., "name:string,email:string,age?:number,isActive:boolean,birthDate:date,refId:objectId").
    *   `-i, --identifier <field>`: Primary identifier field for find/upsert methods. Default: "id".
*   **Example**:
    ```bash
    noony g dao customer --collection "customers" --schema-fields "firstName:string,lastName:string,email:string,loyaltyPoints?:number"
    ```

#### `dto <name>` (aliases `dt`, `gdt`)
Generates Data Transfer Objects (DTOs) with Zod schemas.
*   **Options**:
    *   `-f, --fields <fields>`: Comma-separated list of DTO fields (e.g., "title:string,content:string,tags?:string[]").
*   **Example**:
    ```bash
    noony generate dto article --fields "title:string,body:string,publishedAt?:date"
    ```

#### `domain <name>` (aliases `do`, `gdo`)
Generates TypeScript interfaces for domain objects.
*   **Options**:
    *   `-f, --fields <fields>`: Comma-separated list of domain object fields (e.g., "name:string,description?:string,count:number").
*   **Example**:
    ```bash
    noony g do item --fields "itemName:string,price:number,inStock?:boolean"
    ```

#### `api <name>` (alias `ga`)
Generates API classes that interact with services.
*   **Options**:
    *   `-m, --methods <methods>`: Comma-separated list of API methods (e.g., "get,create,update,delete,getAll"). Default: "get,create,update,delete,getAll".
*   **Example**:
    ```bash
    noony generate api payment --methods "create,get"
    ```

#### `test <type> <name>` (aliases `gt`, `t`)
Generates test files.
*   **`<type>`**: The type of component to test (e.g., `handler`) or `e2e` for feature-wide tests.
*   **Options**:
    *   `--unit`: Generate unit tests for the specified `<type>` and `<name>`.
    *   `--e2e`: Generate E2E tests (.feature & .steps.ts) for the specified `<name>` (used as feature name).
    *   `-f, --feature <featureName>`: Feature group name (for handler unit tests path). Defaults to kebab-case of `<name>`.
    *   `-m, --methods <methodList>`: Comma-separated methods for handler unit tests.
*   **Examples**:
    ```bash
    noony g test handler product --unit --feature "inventory" --methods "get,create"
    noony generate test e2e checkout
    ```
    The first command generates unit tests for the "get" and "create" methods of the "product" handler in the "inventory" feature. The second generates `checkout.feature` and `checkout.steps.ts` for E2E testing.

#### `feature <name>` (alias `gf`)
Generates a complete feature set (domain, DTO, DAO, service, API, handlers, routes, tests). This is a high-level command that orchestrates multiple individual generators.
*   **Options**: Includes a combination of options from the individual generators like `--fields`, `--crud-methods`, `--route-prefix`, etc., plus skip flags.
    *   `-f, --fields <fields>`: Fields for Domain, DTO, DAO.
    *   `--dao-schema-fields <fields>`: Specific fields for DAO schema.
    *   `--collection <name>`: DAO collection name.
    *   `--dao-identifier <field>`: DAO identifier.
    *   `-m, --crud-methods <methods>`: Methods for API, Service, Handler, Route. Default: "get,post,put,delete,getAll".
    *   `--route-prefix <prefix>`: Route prefix.
    *   `--feature-group-name <group>`: Handler/test feature group.
    *   `--auth <type>`: Auth type.
    *   `--skip-domain`, `--skip-dto`, ..., `--skip-tests`, `--skip-unit-tests`, `--skip-e2e-tests`: Flags to skip parts of the generation.
*   **Example**:
    ```bash
    noony g feature blog-post --fields "title:string,content:string,authorId:string" --crud-methods "get,post,put"
    ```

#### `resource <name>` (aliases `gres`, `res`)
Generates a RESTful CRUD resource. This is a specialized version of `generate feature` with defaults suited for typical REST resources (uses "get,post,put,delete,getAll" methods).
*   **Options**: Similar to `generate feature`, but `crudMethods` is fixed.
    *   `-f, --fields <fields>`: Fields for Domain, DTO, DAO.
    *   `--collection <name>`: DAO collection name.
    *   `--dao-identifier <field>`: DAO identifier.
    *   `--route-prefix <prefix>`: Route prefix.
    *   `--auth <type>`: Auth type.
    *   Skip flags are also available.
*   **Example**:
    ```bash
    noony g resource task --fields "title:string,isDone?:boolean"
    ```

### `noony list` (alias `ls`)
Lists available items within the Noony CLI ecosystem.

#### `templates` (alias `t`)
Shows available built-in Handlebars templates.
*   **Purpose**: Helps users see which templates are used by the generators and their file paths, useful for understanding what can be customized.
*   **Example Output**:
    ```
    📦 Available Built-in Templates:
    --------------------------------
      • Name: Handler
        Description: Generates a Noony request handler file with specified methods.
        File Path: src/templates/handler.hbs

      • Name: Route
        Description: Generates Fastify route definitions, linking to handlers.
        File Path: src/templates/route.hbs
    ...
    --------------------------------
    ℹ️  Note: Custom template listing will be available after .noonyrc.json configuration is implemented.
    ```

### `noony validate` (aliases `v`, `check`)
Validates the project structure and conventions against Noony best practices.
*   **Purpose**: Helps identify potential inconsistencies or missing standard files/directories.
*   **Example Output**:
    ```
    🔍 Validating project structure and conventions...
    -------------------------------------------------

    Validation Results:
      [✅ PASSED] package.json Presence: package.json exists.
      [✅ PASSED] tsconfig.json Presence: tsconfig.json exists.
      [✅ PASSED] src Directory Presence: src exists.
      [⚠️ WARNING] src/chrome/handlers Directory: src/chrome/handlers does not exist.
      [❌ FAILED] Handler Naming Convention: Some files in handler directories might not follow the *.handlers.ts convention.
        Details: Files: src/chrome/handlers/user/misc.ts
    -------------------------------------------------
    Project validation completed. Found 2 potential issue(s).
    ```

### `noony update` (alias `u`)
Utility commands for updating project parts.

#### `deps` (alias `d`)
Checks and advises on TypeDI container registration for services, APIs, and DAOs.
*   **Purpose**: Scans standard directories for service, API, and DAO classes and lists them, reminding the user to ensure they are correctly registered in their TypeDI container. This command does **not** modify any files.
*   **Example Output**:
    ```
    🔄 Checking for potential dependency updates (TypeDI container)...
    ------------------------------------------------------------------
    This command lists potential services, APIs, and DAOs that might need to be registered in your TypeDI container.
    It does NOT automatically modify any files.

    Found potential Services (@Service classes usually):
      - UserService (in src/chrome/services )
      - OrderService (in src/chrome/services )

    Found potential API classes (@Service classes usually):
      - UserApi (in src/chrome/handlers/api )

    Found potential DAOs (some might be @Service):
      - UserDao (in src/infra/db )
    ------------------------------------------------------------------
    ACTION REQUIRED: Please review the list above and ensure these components are correctly registered in your TypeDI container file (e.g., src/config/container.ts or where you manage your TypeDI setup).
    For components decorated with @Service(), TypeDI might handle them automatically if your setup scans for them. For others, manual registration might be needed.
    ```

## Template System

Noony CLI uses Handlebars templates to generate code. This provides flexibility and allows for customization.

**Built-in Templates**: The CLI comes with a set of built-in templates for each component type. You can view the list of these templates and their file paths using the `noony list templates` command.

**Custom Templates**: You can override any of the built-in templates by providing your own Handlebars template files. To do this, specify the path to your custom template in the `.noonyrc.json` file under the `templates` key.
For example, to use a custom handler template:
```json
{
  "templates": {
    "handler": "./path/to/your/custom-handler.hbs"
  }
}
```
The path should be relative to your project root. If a custom template is specified and found, the CLI will use it; otherwise, it will fall back to the built-in template.

## Development (Contributing)

Contributions are welcome! If you'd like to contribute to Noony CLI:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes. Ensure you add or update tests if applicable.
4.  Lint and test your code.
5.  Submit a pull request.

(More detailed contributing guidelines may be available in `CONTRIBUTING.md` if it exists.)

## License

MIT
```
