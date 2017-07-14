'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const DocumentModel = require('./DocumentModel')
const DocumentEmitterModel = require('./DocumentEmitterModel')
const DocumentSyncModel = require('./DocumentSyncModel')
const CryptoModel = require('./CryptoModel')
const CryptoEmitterModel = require('./CryptoEmitterModel')
const CryptoSyncModel = require('./CryptoSyncModel')
const { OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('./errors')

/**
 * Exports
 * @ignore
 */
module.exports = {
  // Models
  DocumentModel: DocumentModel,
  CryptoModel: CryptoModel,

  DocumentEmitterModel: DocumentEmitterModel,
  CryptoEmitterModel: CryptoEmitterModel,

  DocumentSyncModel: DocumentSyncModel,
  CryptoSyncModel: CryptoSyncModel,

  // Errors
  OperationError,
  InvalidConfigurationError,
  ValidationError,
  InternalError,
}
