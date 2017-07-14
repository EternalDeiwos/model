'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JWD } = require('@trust/jose')
const MixinModel = require('./MixinModel')

/**
 * CryptoModel
 * @ignore
 */
class CryptoModel extends MixinModel(JWD) {

  constructor (data, options) {
    data.type = data.type || 'JWS'
    data.serialization = data.serialization || 'document'
    console.log(data)
    super(data, options)
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = CryptoModel
