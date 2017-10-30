# @hmcts/cmc-draft-store-middleware

[![Travis badge](https://api.travis-ci.org/hmcts/cmc-draft-store-middleware.svg?branch=master)](https://travis-ci.org/hmcts/cmc-draft-store-middleware)
[![Codecov badge](https://codecov.io/gh/hmcts/cmc-draft-store-middleware/graphs/badge.svg)](https://codecov.io/github/hmcts/cmc-draft-store-middleware)
[![NPM version badge](https://img.shields.io/npm/v/@hmcts/cmc-draft-store-middleware.svg)](https://www.npmjs.com/@hmcts/cmc-draft-store-middleware)
[![Node version badge](https://img.shields.io/node/v/@hmcts/cmc-draft-store-middleware.svg)](https://www.npmjs.com/@hmcts/cmc-draft-store-middleware)
[![Greenkeeper badge](https://badges.greenkeeper.io/hmcts/cmc-draft-store-middleware.svg)](https://greenkeeper.io/)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

This is a Node.js/Express library for interacting with the [draft store API](https://github.com/hmcts/draft-store).
The middleware retrieves draft of selected type from the draft store API and sets it in Express.js local user scope.
If draft does not exist in the draft store then an empty draft is set it in Express.js local user scope.

## Getting started

### How to use it?

#### Installation

To add library to the project dependencies run:

```
$ yarn add @hmcts/cmc-draft-store-middleware
```

or

```
$ npm install @hmcts/cmc-draft-store-middleware
```

#### Sample code

Example use of the middleware in the Express.js application is presented below:

```typescript
import { DraftMiddleware } from '@hmcts/cmc-draft-store-middleware'

const draftService: DraftService = ... // initiate draft service prior using middleware
app.all(/^.*$/, DraftMiddleware.requestHandler(draftService, 'default', (value: any): any => value))
```

### How to contribute?

#### Prerequisites

* [Node.js](https://nodejs.org/)
* [yarn](https://yarnpkg.com/)

#### Dependencies

Install dependencies by executing the following command:

 ```bash
$ yarn install
 ```

#### Code style

We use [TSLint](https://palantir.github.io/tslint/) with [StandardJS](http://standardjs.com/index.html) rules 

Run the linting:

```bash
$ yarn lint
```

Linting will also run automatically prior to committing changes.

#### Running the tests

[Mocha](https://mochajs.org) is used for writing tests.

Run them with:

```bash
$ yarn test
```

For test coverage run:

```bash
$ yarn test:coverage
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details

