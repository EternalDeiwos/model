'use strict'

/**
 * Dependencies
 * @ignore
 */

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')

/**
 * Model
 * @ignore
 */
class Model extends JSONDocument {

  /**
   * constructor
   *
   * @class
   * A PouchDB adapter for the json-document modelling framework.
   *
   * @param  {Object} data
   * @param  {Object} options - as per JSONDocument in @trust/json-document
   */
  constructor (data, options) {
    super(data, options)
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Model
