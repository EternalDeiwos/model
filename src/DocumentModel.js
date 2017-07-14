'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')
const MixinModel = require('./MixinModel')

/**
 * DocumentModel
 * @ignore
 */
class DocumentModel extends MixinModel(JSONDocument) {}

/**
 * Exports
 * @ignore
 */
module.exports = DocumentModel
