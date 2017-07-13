'use strict'

/**
 * Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')
const { JWD } = require('@trust/jose')

/**
 * Module Dependencies
 * @ignore
 */
const MixinModel = require('./MixinModel')
const EmitterMixinModel = require('./EmitterMixinModel')
const SyncMixinModel = require('./SyncMixinModel')
const { OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('./errors')

/**
 * Exports
 * @ignore
 */
module.exports = {
  // Models
  Model: MixinModel(JSONDocument),
  CryptoModel: MixinModel(JWD),

  EmitterModel: EmitterMixinModel(JSONDocument),
  CryptoEmitterModel: EmitterMixinModel(JWD),

  SyncModel: SyncMixinModel(JSONDocument),
  CryptoSyncModel: SyncMixinModel(JWD),

  // Errors
  OperationError,
  InvalidConfigurationError,
  ValidationError,
  InternalError,
}
