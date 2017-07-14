'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')
const EmitterMixinModel = require('./EmitterMixinModel')

/**
 * DocumentEmitterModel
 * @ignore
 */
class DocumentEmitterModel extends EmitterMixinModel(JSONDocument) {}

/**
 * Exports
 * @ignore
 */
module.exports = DocumentEmitterModel
