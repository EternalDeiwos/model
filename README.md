# PouchDB JSONDocument Model _(@trust/model)_

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Build Status](https://travis-ci.org/EternalDeiwos/model.svg?branch=master)](https://travis-ci.org/EternalDeiwos/model)
[![codecov](https://codecov.io/gh/EternalDeiwos/model/branch/master/graph/badge.svg)](https://codecov.io/gh/EternalDeiwos/model)

>  PouchDB adapter for the [json-document](https://www.npmjs.com/package/@trust/json-document) modelling framework.

TODO: Fill out this long description.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Background

## Install

```
$ npm install @trust/model --save
```

## Usage

```
const { DocumentModel, CryptoModel } = require('@trust/model')
```

`DocumentModel` and `CryptoModel` have equivalent functionality but extend different base classes. `CryptoModel` extends `JWD` from `@trust/jose`, which introduces various cryptographic functions. `DocumentModel` extends `JSONDocument` which `JWD` shares as a common ancestor. For more information please see [`@trust/jose`](https://github.com/anvilresearch/jose) and [`@trust/json-document`](https://github.com/anvilresearch/json-document).

## Develop

### Install

```
$ git clone git@github.com:EternalDeiwos/model.git
$ cd model
$ npm install
```

### Test

```
$ npm test
```

### Coverage

```
$ npm run coverage
```

## API

Full documentation can be found [here](https://eternaldeiwos.github.io/model)

## Contribute

### Issues

* please file [issues](https://github.com/EternalDeiwos/model/issues) :)
* for bug reports, include relevant details such as platform, version, relevant data, and stack traces
* be sure to check for existing issues before opening new ones
* read the documentation before asking questions
* it's strongly recommended to open an issue before hacking and submitting a PR
* we reserve the right to close an issue for excessive bikeshedding

### Pull requests

#### Policy

* we're not presently accepting *unsolicited* pull requests
* create an issue to discuss proposed features before submitting a pull request
* create an issue to propose changes of code style or introduce new tooling
* ensure your work is harmonious with the overall direction of the project
* ensure your work does not duplicate existing effort
* keep the scope compact; avoid PRs with more than one feature or fix
* code review with maintainers is required before any merging of pull requests
* new code must respect the style guide and overall architecture of the project
* be prepared to defend your work

#### Style guide

* [Conventional Changelog](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md)
* [EditorConfig](http://editorconfig.org)
* ES6
* Standard JavaScript
* jsdocs

#### Code reviews

* required before merging PRs
* reviewers MUST run and test the code under review

### Collaborating

This project is part of a greater group of projects visible [here](https://www.npmjs.com/org/trust) at the @trust organisation on NPM.

#### Pair programming

* Required for new contributors
* Work directly with one or more members of the core development team

### Code of conduct

* @trust/model follows the [Contributor Covenant](http://contributor-covenant.org/version/1/3/0/) Code of Conduct.

## Maintainers

* [@EternalDeiwos](https://github.com/EternalDeiwos)
* [@christiansmith](https://github.com/christiansmith)

## License

MIT © 2017 Greg Linklater
