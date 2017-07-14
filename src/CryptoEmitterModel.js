'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JWD } = require('@trust/jose')
const EmitterMixinModel = require('./EmitterMixinModel')

/**
 * CryptoEmitterModel
 * @ignore
 */
class CryptoEmitterModel extends EmitterMixinModel(JWD) {

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
module.exports = CryptoEmitterModel
