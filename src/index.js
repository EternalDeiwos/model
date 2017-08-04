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

const EventSource = require('./event-source/EventSource')
const Action = require('./event-source/Action')

/**
 * Exports
 * @ignore
 */
module.exports = {
  // Models
  DocumentModel,
  CryptoModel,

  DocumentEmitterModel,
  CryptoEmitterModel,

  DocumentSyncModel,
  CryptoSyncModel,

  // Errors
  OperationError,
  InvalidConfigurationError,
  ValidationError,
  InternalError,

  // Event Source
  EventSource,
  Action,
}
