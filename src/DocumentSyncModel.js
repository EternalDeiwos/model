'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument, JSONSchema } = require('@trust/json-document')
const SyncMixinModel = require('./SyncMixinModel')
const ModelSchema = new JSONSchema(require('./ModelSchema'))

/**
 * DocumentSyncModel
 * @ignore
 */
class DocumentSyncModel extends SyncMixinModel(JSONDocument) {

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
module.exports = DocumentSyncModel
