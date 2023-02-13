[![Version](https://img.shields.io/npm/v/@hotwired/turbo)](https://www.npmjs.com/package/@hotwired/turbo)
[![License](https://img.shields.io/github/license/hotwired/turbo)](https://github.com/hotwired/turbo)

# Contributing

Note that we have a [code of conduct](https://github.com/hotwired/turbo/blob/main/CODE_OF_CONDUCT.md). Please follow it in your interactions with this project.

## Sending a Pull Request

The core team is monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation.

Before submitting a pull request, please:

1. Fork the repository and create your branch.
2. Follow the setup instructions in this file.
3. If you’re fixing a bug or adding code that should be tested, add tests!
4. Ensure the test suite passes.

## Developing locally

First, clone the `hotwired/turbo` repository and install dependencies:

```bash
git clone https://github.com/hotwired/turbo.git
```

```bash
cd turbo
yarn install
```

Then create a branch for your changes:

```bash
git checkout -b <your_branch_name>
```

### Testing

Tests are run through `yarn` using [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) with [Playwright](https://github.com/microsoft/playwright) for browser testing. Browser and runtime configuration can be found in [`web-test-runner.config.mjs`](./web-test-runner.config.mjs) and [`playwright.config.ts`](./playwright.config.ts).

To begin testing, install the browser drivers:

```bash
yarn playwright install --with-deps
```

Then build the source. Because tests are run against the compiled source (and are themselves compiled) be sure to run `yarn build` prior to testing. Alternatively, you can run `yarn watch` to build and watch for changes.

```bash
yarn build
```

### Running the test suite

The test suite can be run with `yarn`, using the test commands defined in [`package.json`](./package.json). To run all tests in all configured browsers:

```bash
yarn test
```

To run just the unit or browser tests:

```bash
yarn test:unit
yarn test:browser
```

By default, tests are run in "headless" mode against all configured browsers (currently `chrome` and `firefox`). Use the `--headed` flag to run in normal mode. Use the `--project` flag to run against a particular browser.

```bash
yarn test:browser --project=firefox
yarn test:browser --project=chrome
yarn test:browser --project=chrome --headed
```

### Running a single test

To run a single test file, pass its path as an argument. To run a particular test case, append its starting line number after a colon.

```bash
yarn test:browser src/tests/functional/drive_tests.ts
yarn test:browser src/tests/functional/drive_tests.ts:11
yarn test:browser src/tests/functional/drive_tests.ts:11 --project=chrome
```

### Running the local web server

Because tests are running headless in browsers, debugging can be difficult. Sometimes the simplest thing to do is load the test fixtures into the browser and navigate manually. To make this easier, a local web server is included.

To run the web server, ensure the source is built and start the server with `yarn`:

```bash
yarn build
yarn start
```

The web server is available on port 9000, serving from the project root. Fixture files are accessible by path. For example, the file at `src/tests/fixtures/rendering.html` will be accessible at <http://localhost:9000/src/tests/fixtures/rendering.html>.
