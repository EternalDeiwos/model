'use strict'

/**
 * Dependencies
 * @ignore
 */
const { JSONSchema } = require('@trust/json-document')

/**
 * ModelSchema
 * @ignore
 */
const ModelSchema = new JSONSchema({
  type: 'object',
  properties: {
    _id: { type: 'string' },
    _rev: { type: 'string' },
    _attachments: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          stub: { type: 'boolean' },
          content_type: { type: 'string' },
          data: { type: 'object' },
          digest: { type: 'string' },
          length: { type: 'integer' },
        },
        required: ['content_type']
      }
    }
  }
})

/**
 * Exports
 * @ignore
 */
module.exports = ModelSchema
