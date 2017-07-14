'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument, JSONSchema } = require('@trust/json-document')
const EmitterMixinModel = require('./EmitterMixinModel')
const ModelSchema = new JSONSchema(require('./ModelSchema'))

/**
 * DocumentEmitterModel
 * @ignore
 */
class DocumentEmitterModel extends EmitterMixinModel(JSONDocument) {

  /**
   * schema
   *
   * @description
   * Default schema
   *
   * @return {JSONSchema}
   */
  static get schema () {
    return ModelSchema
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = DocumentEmitterModel
