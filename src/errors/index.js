'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const AbstractError = require('./AbstractError')
const OperationError = require('./OperationError')
const InvalidConfigurationError = require('./InvalidConfigurationError')
const ValidationError = require('./ValidationError')
const InternalError = require('./InternalError')

/**
 * Exports
 * @ignore
 */
module.exports = {
  AbstractError,
  OperationError,
  InvalidConfigurationError,
  ValidationError,
  InternalError,
}
