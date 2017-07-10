'use strict'

/**
 * ValidationError
 * @ignore
 */
class ValidationError extends Error {

  constructor (validation, message) {
    super(message || 'Invalid document')
    this.validation = validation
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = ValidationError
