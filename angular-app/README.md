# AngularApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.2.

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

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

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

## Authentication Setup (Firebase)

The app supports:
- Google sign-in
- Email/password sign-in
- Email verification
- Password reset

Configuration is loaded from `public/runtime-config.js` (served as `runtime-config.js`).

Builds can generate this file automatically from environment variables:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`

When those variables are defined, `npm run build` (or Vercel build) rewrites `public/runtime-config.js` automatically.

1. Open `public/runtime-config.js`.
2. Replace all `REPLACE_ME_*` values with your Firebase Web App config.
3. In Firebase Console, enable providers:
	- Google
	- Email/Password
4. Add your domains to Firebase Auth authorized domains:
	- `localhost`
	- your Vercel domain(s), for example `basket-data.vercel.app`
