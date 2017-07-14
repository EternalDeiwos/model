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
const { CryptoSyncModel } = require(path.join(cwd, 'src'))
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
describe('CryptoSyncModel', () => {

  /**
   * constructor
   */
  describe('constructor', () => {

    let klass
    beforeEach(() => {
      class Widgets extends CryptoSyncModel {}
      klass = Widgets
    })

    it('type should default to "JWS" if not provided', () => {
      let instance = new klass({})
      instance.type.should.equal('JWS')
    })

    it('type should use provided value', () => {
      let instance = new klass({ type: 'JWE' })
      instance.type.should.equal('JWE')
    })

    it('serialization should default to "document" if not provided', () => {
      let instance = new klass({})
      instance.serialization.should.equal('document')
    })

    it('serialization should use provided value', () => {
      let instance = new klass({ serialization: 'flattened' })
      instance.serialization.should.equal('flattened')
    })
  })
})
