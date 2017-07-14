'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JWD } = require('@trust/jose')
const MixinModel = require('./MixinModel')
const ModelSchema = require('./ModelSchema')

/**
 * CryptoModel
 * @ignore
 */
class CryptoModel extends MixinModel(JWD) {

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
module.exports = CryptoModel
