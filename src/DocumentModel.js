'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument, JSONSchema } = require('@trust/json-document')
const MixinModel = require('./MixinModel')
const ModelSchema = new JSONSchema(require('./ModelSchema'))

/**
 * DocumentModel
 * @ignore
 */
class DocumentModel extends MixinModel(JSONDocument) {

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
module.exports = DocumentModel
