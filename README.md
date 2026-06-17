# MolaviPoetryApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.28.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Project layout (molavi-poetry-app)

The Angular application lives in the `molavi-poetry-app/` subfolder of the workspace root,
kept separate from the `.kiro/` spec folder for a clean layout.

Source folders under `src/app/`:

- `core/` — services and pure logic (e.g. `GanjoorService`, URL/scoping/verse-mapping helpers)
- `models/` — internal data model interfaces and domain constants
- `features/` — view components (Browse, Reading, Audio, Translations, Search)
- `shared/` — shared/reusable components (loading, error, empty state)

## Configuration notes

- **HttpClient**: configured via `provideHttpClient()` in `src/app/app.config.ts`.
- **Standalone components + routing**: enabled by the CLI scaffold (`provideRouter` in `app.config.ts`,
  routes in `src/app/app.routes.ts`).
- **Property-based testing**: `fast-check` is installed as a dev dependency.
- **Single-run testing**: `ng test` is configured for single-run, headless execution
  (`watch: false`, `browsers: ChromeHeadless` in `angular.json`). A `test:ci` script
  (`ng test --watch=false --browsers=ChromeHeadless`) is also available.
  Watch-based tooling (`ng serve`, watch-mode `ng test`) should be run manually by the developer.
