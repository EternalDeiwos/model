'use strict'

/**
 * Dependencies
 * @ignore
 */

/**
 * Module Dependencies
 * @ignore
 */
const MixinModel = require('./MixinModel')
const { OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('./errors')

/**
 * EmitterMixinModel
 * @ignore
 */
const EmitterMixinModel = superclass => class EmitterModel extends MixinModel(superclass) {
}

/**
 * Exports
 * @ignore
 */
module.exports = EmitterMixinModel
