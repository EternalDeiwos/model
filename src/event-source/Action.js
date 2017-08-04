'use strict'

/**
 * Dependencies
 * @ignore
 */
const { JSONSchema } = require('@trust/json-document')
const uuid = require('uuid/v1')

/**
 * Module Dependencies
 * @ignore
 */
const { AbstractError, OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('../errors')
const ModelSchema = new JSONSchema(require('../ModelSchema'))

/**
 * Action
 * @ignore
 */
class Action {

  /**
   * constructor
   */
  constructor (source) {
    this.source = source
  }

  /**
   * schema
   */
  static get schema () {
    return ModelSchema
  }

  /**
   * reducer
   *
   * @param  {Any} state
   * @param  {Object} event
   * @return {Any} Updated state
   */
  static reducer (state, event) {
    throw new AbstractError('reducer must be overriden in the child class')
  }

  /**
   * validate
   *
   * @param  {Object} event
   * @return {Object} validation
   */
  static validate (event) {
    let { schema } = this
    return schema.validate(event)
  }

  /**
   * put
   *
   * @param  {Object} event
   * @return {Promise}
   */
  put (event) {
    let { source: { database } } = this
    Object.assign(event, { _id: uuid() })

    let validation = this.constructor.validate(event)

    if (validation.valid) {
      return database.put(event)
    } else {
      return Promise.reject(new ValidationError(validation, `Invalid ${this.constructor.name} event`))
    }
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Action
