'use strict'

/**
 * InternalError
 * @ignore
 */
class InternalError extends Error {

  constructor (message, stack) {
    super(message)
    this.stack = stack
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = InternalError
