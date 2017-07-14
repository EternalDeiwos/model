'use strict'

/**
 * Dependencies
 * @ignore
 */

/**
 * Module Dependencies
 * @ignore
 */
const EmitterMixinModel = require('./EmitterMixinModel')
const { OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('./errors')

/**
 * SyncMixinModel
 * @ignore
 */
const SyncMixinModel = superclass => class SyncModel extends EmitterMixinModel(superclass) {
}

/**
 * Exports
 * @ignore
 */
module.exports = SyncMixinModel
