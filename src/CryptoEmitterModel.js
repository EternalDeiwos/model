'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JWD } = require('@trust/jose')
const EmitterMixinModel = require('./EmitterMixinModel')
const ModelSchema = require('./ModelSchema')

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

  static get schema () {
    return super.schema.extend(ModelSchema)
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = CryptoEmitterModel
