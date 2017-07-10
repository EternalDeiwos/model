'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const Model = require('./Model')
const { OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('./errors')

/**
 * Exports
 * @ignore
 */
module.exports = {
  // Models
  Model,

  // Errors
  OperationError,
  InvalidConfigurationError,
  ValidationError,
  InternalError,
}
