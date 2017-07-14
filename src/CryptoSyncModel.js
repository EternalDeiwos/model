'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JWD } = require('@trust/jose')
const SyncMixinModel = require('./SyncMixinModel')
const ModelSchema = require('./ModelSchema')

/**
 * CryptoSyncModel
 * @ignore
 */
class CryptoSyncModel extends SyncMixinModel(JWD) {

  constructor (data, options) {
    data.type = data.type || 'JWS'
    data.serialization = data.serialization || 'document'
    super(data, options)
  }

  static get schema () {
    return super.schema.extend(ModelSchema)
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = CryptoSyncModel
