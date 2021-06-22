[![Version](https://img.shields.io/npm/v/@hotwired/turbo)](https://www.npmjs.com/package/@hotwired/turbo)
[![License](https://img.shields.io/github/license/hotwired/turbo)](https://github.com/hotwired/turbo)

# Contributing

Please note we have a [code of conduct](https://github.com/hotwired/turbo/blob/main/CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

## Sending a Pull Request
The core team is monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation.

Before submitting a pull request, please make sure the following is done:

1. Fork the repository and create your branch from main.
2. Run `yarn` in the repository root.
3. If you’ve fixed a bug or added code that should be tested, add tests!
4. Ensure the test suite passes (`yarn build && yarn test`).

## Developing locally

During the process of developing the library locally we first have to check out the repository and create a branch from main.

```bash
git clone https://github.com/hotwired/turbo.git
cd turbo
yarn
```

```bash
git checkout -b '<your_branch_name>'
```

Once you are done developing the feature or bug fix you have 2 options:
1. Run the test suite
2. Run a local webserver and checkout your changes manually

### Testing
The library is tested by running the test suite (found in: `src/tests/*`) against headless browsers. The browsers are setup in `intern.json` check it out to see the used browser environments.

The tests are using the compiled version of the library and they are themselves also compiled. To compile the tests and library and watch for changes:

```bash
yarn watch
```

To run the tests:

```bash
yarn test
```

### Test files
Please add your tests in the test files closely related to the feature itself. For example when touching the `src/core/drive/page_renderer.ts` your test will probably endup in the `src/tests/functional/rendering_tests.ts`.

The html files needed for the tests are stored in: `src/tests/fixtures/`

### Local webserver
Since the tests are running in headless browsers it's not easy to debug them easily without using the debugger. Sometimes it's easier to run the supplied webserver and manually click through the test fixtures.

To run the webserver:

```bash
yarn start
```

This requires a build (via `yarn build`), or a separate process running `yarn watch`.

The webserver is available on port 9000. Since the webserver is run from the root of the project the fixtures can be found using the same path as they have in the project itself, so `src/tests/fixtures/rendering.html` makes: http://localhost:9000/src/tests/fixtures/rendering.html

Depending on your operating system you are able to open the page using:

```bash
open http://localhost:9000/src/tests/fixtures/rendering.html
```