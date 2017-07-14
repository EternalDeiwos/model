'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JWD } = require('@trust/jose')
const SyncMixinModel = require('./SyncMixinModel')

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
}

/**
 * Exports
 * @ignore
 */
module.exports = CryptoSyncModel
