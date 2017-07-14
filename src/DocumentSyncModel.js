'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')
const SyncMixinModel = require('./SyncMixinModel')

/**
 * DocumentSyncModel
 * @ignore
 */
class DocumentSyncModel extends SyncMixinModel(JSONDocument) {}

/**
 * Exports
 * @ignore
 */
module.exports = DocumentSyncModel
