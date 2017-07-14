'use strict'

/**
 * Dependencies
 * @ignore
 */
const cwd = process.cwd()
const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

/**
 * Assertions
 * @ignore
 */
chai.use(chaiAsPromised)
chai.should()
chai.use(sinonChai)
let expect = chai.expect

/**
 * Code Under Test
 * @ignore
 */
const { DocumentEmitterModel } = require(path.join(cwd, 'src'))
const ModelSchema = require(path.join(cwd, 'src', 'ModelSchema'))
const PouchDB = require('pouchdb')
const { JSONSchema } = require('@trust/json-document')
const {
  OperationError,
  InvalidConfigurationError,
  ValidationError,
  InternalError
} = require(path.join(cwd, 'src', 'errors'))

/**
 * Constants
 * @ignore
 */
let dbName = 'test/widgets'
let remoteDbName = 'test/remote'

/**
 * Tests
 * @ignore
 */
describe('DocumentEmitterModel', () => {

  /**
   * static member schema
   */
  describe('static member schema', () => {
    it('should be an instance of JSONSchema', () => {
      DocumentEmitterModel.schema.should.be.instanceOf(JSONSchema)
    })

    it('should equal ModelSchema', () => {
      DocumentEmitterModel.schema.should.deep.equal(ModelSchema)
    })

    describe('extended class', () => {
      it('should equal ModelSchema if not overriden', () => {
        class Widgets extends DocumentEmitterModel {}
        Widgets.schema.should.deep.equal(ModelSchema)
      })

      it('should not equal ModelSchema if overriden', () => {
        class Widgets extends DocumentEmitterModel {
          static get schema () { return new JSONSchema({}) }
        }
        Widgets.schema.should.not.deep.equal(ModelSchema)
      })
    })
  })
})
