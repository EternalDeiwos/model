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
const { CryptoModel } = require(path.join(cwd, 'src'))
const ModelSchema = require(path.join(cwd, 'src', 'ModelSchema'))
const PouchDB = require('pouchdb')
const { JSONSchema } = require('@trust/json-document')
const { JWD } = require('@trust/jose')
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
describe('CryptoModel', () => {

  /**
   * constructor
   */
  describe('constructor', () => {

    let klass
    beforeEach(() => {
      class Widgets extends CryptoModel {}
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

  /**
   * static member schema
   */
  describe('static member schema', () => {
    const ExtendedJWDSchema = JWD.schema.extend(ModelSchema)

    it('should be an instance of JSONSchema', () => {
      CryptoModel.schema.should.be.instanceOf(JSONSchema)
    })

    it('should equal ExtendedJWDSchema', () => {
      CryptoModel.schema.should.deep.equal(ExtendedJWDSchema)
    })

    describe('extended class', () => {
      it('should equal ExtendedJWDSchema if not overriden', () => {
        class Widgets extends CryptoModel {}
        Widgets.schema.should.deep.equal(ExtendedJWDSchema)
      })

      it('should not equal ExtendedJWDSchema if overriden', () => {
        class Widgets extends CryptoModel {
          static get schema () { return new JSONSchema({}) }
        }
        Widgets.schema.should.not.deep.equal(ExtendedJWDSchema)
      })
    })
  })

  /**
   * static member database
   */
  describe('static member database', () => {
    let klass
    const index = 'some_index'
    const query = { name: 'some_query', query: 'query body' }

    beforeEach(() => {
      class Widgets extends CryptoModel {
        static get indexes () { return [index] }
        static get queries () { return [query] }
      }
      klass = Widgets
      sinon.stub(klass, 'createIndex')
      sinon.stub(klass, 'createQuery')
    })

    afterEach(() => {
      klass.createIndex.restore()
      klass.createQuery.restore()
    })

    describe('setDatabase', () => {
      it('should configure the database with a string argument', () => {
        return klass.setDatabase(dbName).then(() => klass.database.should.be.instanceOf(PouchDB))
      })

      it('should configure the database with an object argument', () => {
        return klass.setDatabase({ name: dbName }).then(() => klass.database.should.be.instanceOf(PouchDB))
      })

      it('should close a previous database connection if a new one is created', () => {
        let stub = sinon.stub().usingPromise(Promise).resolves()
        klass.internalDatabase = { close: stub }
        return klass.setDatabase(dbName).then(() => stub.should.have.been.calledOnce)
      })

      it('should throw InvalidConfigurationError with invalid (boolean) option', () => {
        return expect(() => klass.setDatabase(false).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid'))
      })

      it('should throw InvalidConfigurationError with invalid (number) option', () => {
        return expect(() => klass.setDatabase(2).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid'))
      })

      it('should throw InvalidConfigurationError with name unspecified', () => {
        return expect(() => klass.setDatabase({}).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid'))
      })

      it('should throw InvalidConfigurationError with invalid (boolean) name with object argument', () => {
        return expect(() => klass.setDatabase({ name: false }).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid'))
      })

      it('should throw InvalidConfigurationError with invalid (number) name with object argument', () => {
        return expect(() => klass.setDatabase({ name: 2 }).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid'))
      })

      it('should create database indices', () => {
        return klass.setDatabase(dbName).then(() => {
          klass.createIndex.should.have.been.calledOnce
          klass.createIndex.should.have.been.calledWith(index)
        })
      })

      it('should create database map-reduce queries', () => {
        return klass.setDatabase(dbName).then(() => {
          klass.createQuery.should.have.been.calledOnce
          klass.createQuery.should.have.been.calledWith(query.name, query.query)
        })
      })

      it('should throw if it cannot create the database', () => {
        expect(() => klass.setDatabase(123)).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid')
      })

      describe('database setup promise', () => {
        it('should reject if database index creation fails', () => {
          klass.createIndex.restore()
          sinon.stub(klass, 'createIndex').usingPromise(Promise).rejects()
          return klass.setDatabase(dbName).should.eventually.be.rejectedWith(InvalidConfigurationError, 'Model Widgets index configuration invalid')
        })

        it('should reject if database query creation fails', () => {
          klass.createQuery.restore()
          sinon.stub(klass, 'createQuery').usingPromise(Promise).rejects()
          return klass.setDatabase(dbName).should.eventually.be.rejectedWith(InvalidConfigurationError, 'Model Widgets map-reduce query configuration invalid')
        })
      })
    })

    describe('get', () => {
      it('should throw if database not configured', () => {
        expect(() => klass.database).to.throw(OperationError, 'Model Widgets has no database set')
      })

      it('should not throw if database is configured', () => {
        return klass.setDatabase(dbName)
        expect(() => klass.database).to.not.throw()
      })

      it('should return a reference to the database', () => {
        return klass.setDatabase(dbName)
        klass.database.name.should.equal(dbName)
      })
    })
  })

  /**
   * sync
   */
  describe('static member sync', () => {
    let klass
    let defaultReplicationOptions = { live: true, retry: true }
    let replicationOptions = { live: true, retry: true, foo: 'bar' }

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      Widgets.setDatabase(dbName)
      klass = Widgets
    })

    describe('setSync', () => {
      it('should create a replication emitter', () => {
        klass.sync.length.should.equal(0)
        klass.setSync(remoteDbName)
        klass.sync.length.should.equal(1)
      })

      it('should return a replication object', () => {
        klass.setSync(remoteDbName).constructor.name.should.equal('Sync')
      })

      it('should use default replication options if none are provided', () => {
        sinon.stub(klass.internalDatabase, 'sync').returns({ on: () => {}})
        klass.setSync(remoteDbName)
        expect(klass.internalDatabase.sync.firstCall.args[1]).to.deep.equal(defaultReplicationOptions)
      })

      it('should prefer provided replication options over the default', () => {
        sinon.stub(klass.internalDatabase, 'sync').returns({ on: () => {}})
        klass.setSync(remoteDbName, replicationOptions)
        expect(klass.internalDatabase.sync.firstCall.args[1]).to.deep.equal(replicationOptions)
      })

      it('should register an error handler', () => {
        let errorStub = sinon.stub()
        sinon.stub(klass.internalDatabase, 'sync').returns({ on: errorStub })
        klass.setSync(remoteDbName)
        expect(klass.internalDatabase.sync.firstCall.args[1]).to.deep.equal(defaultReplicationOptions)
        errorStub.firstCall.args[0].should.equal('error')
        errorStub.firstCall.args[1].should.be.a('function')
      })

      it('should throw with invalid (boolean) option', () => {
        expect(() => klass.setSync(false)).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) option', () => {
        expect(() => klass.setSync(2)).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with name unspecified with object option', () => {
        expect(() => klass.setSync({})).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (boolean) name with object option', () => {
        expect(() => klass.setSync({ name: false })).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) name with object option', () => {
        expect(() => klass.setSync({ name: 2 })).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InternalError if replication instance emits an error', () => {
        let error = 'fubar'
        klass.setSync(remoteDbName)
        expect(() => klass.sync[0].emit('error', new Error(error))).to.throw(InternalError, error)
      })
    })

    describe('replicateTo', () => {
      it('should create a replication emitter', () => {
        klass.sync.length.should.equal(0)
        klass.replicateTo(remoteDbName)
        klass.sync.length.should.equal(1)
      })

      it('should return a replication object', () => {
        klass.replicateTo(remoteDbName).constructor.name.should.equal('Replication')
      })

      it.skip('should use default replication options if none are provided', () => {
        sinon.stub(klass.internalDatabase.replicate, 'to').returns({ on: () => {}})
        klass.replicateTo(remoteDbName)
        expect(klass.internalDatabase.replicate.to.firstCall.args[1]).to.deep.equal(defaultReplicationOptions)
      })

      it.skip('should prefer provided replication options over the default', () => {
        sinon.stub(klass.internalDatabase.replicate, 'to').returns({ on: () => {}})
        klass.replicateTo(remoteDbName, replicationOptions)
        expect(klass.internalDatabase.replicate.to.firstCall.args[1]).to.deep.equal(replicationOptions)
      })

      it.skip('should register an error handler', () => {
        let errorStub = sinon.stub()
        sinon.stub(klass.internalDatabase.replicate, 'to').returns({ on: errorStub })
        klass.replicateTo(remoteDbName)
        expect(klass.internalDatabase.replicate.to.firstCall.args[1]).to.deep.equal(defaultReplicationOptions)
        errorStub.firstCall.args[0].should.equal('error')
        errorStub.firstCall.args[1].toString().should.equal((error => { throw new InternalError(error.message, error.stack) }).toString())
      })

      it('should throw InvalidConfigurationError with invalid (boolean) option', () => {
        expect(() => klass.replicateTo(false)).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) option', () => {
        expect(() => klass.replicateTo(2)).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with name unspecified with object option', () => {
        expect(() => klass.replicateTo({})).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (boolean) name with object option', () => {
        expect(() => klass.replicateTo({ name: false })).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) name with object option', () => {
        expect(() => klass.replicateTo({ name: 2 })).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InternalError if replication instance emits an error', () => {
        let error = 'fubar'
        klass.replicateTo(remoteDbName)
        expect(() => klass.sync[0].emit('error', new Error(error))).to.throw(InternalError, error)
      })
    })

    describe('replicateFrom', () => {
      it('should create a replication emitter', () => {
        klass.sync.length.should.equal(0)
        klass.replicateFrom(remoteDbName)
        klass.sync.length.should.equal(1)
      })

      it('should return a replication object', () => {
        klass.replicateFrom(remoteDbName).constructor.name.should.equal('Replication')
      })

      it.skip('should use default replication options if none are provided', () => {
        sinon.stub(klass.internalDatabase.replicate, 'from').returns({ on: () => {}})
        klass.replicateFrom(remoteDbName)
        expect(klass.internalDatabase.replicate.from.firstCall.args[1]).to.deep.equal(defaultReplicationOptions)
      })

      it.skip('should prefer provided replication options over the default', () => {
        sinon.stub(klass.internalDatabase.replicate, 'from').returns({ on: () => {}})
        klass.replicateTo(remoteDbName, replicationOptions)
        expect(klass.internalDatabase.replicate.from.firstCall.args[1]).to.deep.equal(replicationOptions)
      })

      it.skip('should register an error handler', () => {
        let errorStub = sinon.stub()
        sinon.stub(klass.internalDatabase.replicate, 'from').returns({ on: errorStub })
        klass.replicateFrom(remoteDbName)
        expect(klass.internalDatabase.replicate.from.firstCall.args[1]).to.deep.equal(defaultReplicationOptions)
        errorStub.firstCall.args[0].should.equal('error')
        errorStub.firstCall.args[1].toString().should.equal((error => { throw new InternalError(error.message, error.stack) }).toString())
      })

      it('should throw InvalidConfigurationError with invalid (boolean) option', () => {
        expect(() => klass.replicateFrom(false)).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) option', () => {
        expect(() => klass.replicateFrom(2)).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with name unspecified with object option', () => {
        expect(() => klass.replicateFrom({})).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (boolean) name with object option', () => {
        expect(() => klass.replicateFrom({ name: false })).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) name with object option', () => {
        expect(() => klass.replicateFrom({ name: 2 })).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InternalError if replication instance emits an error', () => {
        let error = 'fubar'
        klass.replicateFrom(remoteDbName)
        expect(() => klass.sync[0].emit('error', new Error(error))).to.throw(InternalError, error)
      })
    })

    describe('get', () => {
      it('should set sync if it doesn\'t exist', () => {
        expect(klass.internalSync).to.be.undefined
        expect(Array.isArray(klass.sync)).to.be.true
        expect(Array.isArray(klass.internalSync)).to.be.true
      })
    })
  })

  /**
   * changes
   */
  describe('static member changes', () => {
    let klass

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      Widgets.setDatabase(dbName)
      klass = Widgets
    })

    describe('setChanges', () => {

      it('should set the change feed', () => {
        klass.changes.length.should.equal(0)
        klass.setChanges({ live: true, include_docs: true, since: 'now' })
      })

      it('should add an instance of a PouchDB Change Feed to the changes array', () => {
        klass.changes.length.should.equal(0)
        klass.setChanges({ live: true, include_docs: true, since: 'now' })
        expect(klass.changes[0].constructor.name.startsWith('Changes')).to.be.true
      })

      it('should use default change feed config if none supplied', () => {
        expect(() => klass.setChanges()).to.not.throw()
      })

      it('should return the new change feed', () => {
        klass.setChanges({ live: true, include_docs: true, since: 'now' })
        klass.changes[0].should.have.nested.property('constructor.name')
        expect(klass.changes[0].constructor.name.startsWith('Changes')).to.be.true
      })
    })

    describe('get', () => {
      it('should be an empty array before a change feed is created', () => {
        expect(Array.isArray(klass.changes)).to.be.true
        klass.changes.length.should.equal(0)
      })

      it('should not be an empty array after a change feed is created', () => {
        klass.setChanges({ live: true, include_docs: true, since: 'now' })
        klass.changes.length.should.equal(1)
      })
    })
  })

  /**
   * indexes
   */
  describe('static member indexes', () => {
    it('should be an array', () => {
      expect(Array.isArray(CryptoModel.indexes)).to.be.true
    })

    it('should be empty', () => {
      CryptoModel.indexes.length.should.equal(0)
    })

    describe('extended class', () => {
      it('should deep equal model indexes if not overriden', () => {
        class Widgets extends CryptoModel {}
        Widgets.indexes.should.deep.equal(CryptoModel.indexes)
      })
    })
  })

  /**
   * queries
   */
  describe('static member queries', () => {
    it('should be an array', () => {
      expect(Array.isArray(CryptoModel.queries)).to.be.true
    })

    it('should be empty', () => {
      CryptoModel.queries.length.should.equal(0)
    })

    describe('extended class', () => {
      it('should deep equal model queries if not overriden', () => {
        class Widgets extends CryptoModel {}
        Widgets.queries.should.deep.equal(CryptoModel.queries)
      })
    })
  })

  /**
   * static query
   */
  describe('static query', () => {
    let klass
    let docs = [{ _id: 'foo' }, { _id: 'bar' }]
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        query: sinon.stub().usingPromise(Promise).resolves({ docs })
      }

      return klass.query().then(results => {
        results[0].should.be.instanceOf(klass)
        results[1].should.be.instanceOf(klass)
        klass.database.query.should.have.been.calledOnce
      })
    })

    it('should reject with InternalError if the query fails', () => {
      klass.internalDatabase = {
        query: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return klass.query().should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * static find
   */
  describe('static find', () => {
    let klass
    let options = {}
    let docs = [{ _id: 'foo' }, { _id: 'bar' }]
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should attach the selector to the options', () => {
      klass.internalDatabase = {
        find: sinon.stub().withArgs(options).usingPromise(Promise).resolves({ docs })
      }

      klass.find(options).then(() => {
        options.selector.should.not.be.undefined
      })
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        find: sinon.stub().usingPromise(Promise).resolves({ docs })
      }

      return klass.find().then(results => {
        results[0].serialization.should.equal('document')
        results[0].type.should.equal('JWS')
        results[0]._id.should.equal('foo')
        results[1].serialization.should.equal('document')
        results[1].type.should.equal('JWS')
        results[1]._id.should.equal('bar')
        klass.database.find.should.have.been.calledOnce
      })
    })

    it('should resolve an array of instances of the extended model', () => {
      klass.internalDatabase = {
        find: sinon.stub().usingPromise(Promise).resolves({ docs })
      }

      return klass.find().then(results => {
        results[0].should.be.instanceOf(klass)
        results[1].should.be.instanceOf(klass)
        klass.database.find.should.have.been.calledOnce
      })
    })

    it('should reject with InternalError if the find fails', () => {
      klass.internalDatabase = {
        find: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return klass.find().should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * static get
   */
  describe('static get', () => {
    let klass
    let get_doc = { _id: 'foo' }
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        get: sinon.stub().usingPromise(Promise).resolves(get_doc)
      }

      return klass.get().then(doc => {
        doc.serialization.should.equal('document')
        doc.type.should.equal('JWS')
        doc._id.should.equal('foo')
        klass.database.get.should.have.been.calledOnce
      })
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        get: sinon.stub().usingPromise(Promise).resolves(get_doc)
      }

      return klass.get().then(doc => {
        doc.should.be.instanceOf(klass)
        klass.database.get.should.have.been.calledOnce
      })
    })

    it('should return null if the get rejects with a 404', () => {
      let err = new Error(error_message)
      err.status = 404
      klass.internalDatabase = {
        get: sinon.stub().usingPromise(Promise).rejects(err)
      }

      return klass.get().should.eventually.equal(null)
    })

    it('should reject with InternalError if get rejects with any other status', () => {
      klass.internalDatabase = {
        get: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return klass.get().should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * static post
   */
  describe('static post', () => {
    let klass
    let post_doc_with_rev = { _id: 'foo', _rev: '3-z' }
    let post_result_with_rev = { id: 'foo', rev: '3-z' }
    let error_message = 'fubar'

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should validate the data before storing it', () => {
      sinon.stub(klass.prototype, 'validate').returns({ valid: true })
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).resolves(post_result_with_rev)
      }

      return klass.post({}).then(doc => {
        klass.prototype.validate.should.have.been.calledOnce
        klass.database.post.should.have.been.calledOnce
        klass.prototype.validate.restore()
      })
    })

    it('should throw if data is invalid', () => {
      sinon.stub(klass.prototype, 'validate').returns({ valid: false })
      return klass.setDatabase(dbName)
      return klass.post({}).should.eventually.rejectedWith(ValidationError, 'Invalid document')
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).resolves(post_result_with_rev)
      }

      return klass.post({}).then(doc => {
        doc.should.deep.equal(post_doc_with_rev)
        klass.database.post.should.have.been.calledOnce
      })
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).resolves(post_result_with_rev)
      }

      return klass.post({}).then(doc => {
        doc.should.be.instanceOf(klass)
        klass.database.post.should.have.been.calledOnce
      })
    })

    it('should reject with InternalError if post rejects with any other status', () => {
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return klass.post({}).should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * static put
   */
  describe('static put', () => {
    let klass
    let put_doc = { _id: 'foo' }
    let put_result_with_rev = { _id: 'foo', _rev: '3-z' }
    let error_message = 'fubar'

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
      return klass.setDatabase(dbName)
    })

    it('should proxy member put', () => {
      sinon.stub(klass.prototype, 'put').usingPromise(Promise).resolves(put_result_with_rev)
      return klass.put(put_doc).then(result => {
        klass.prototype.put.should.have.been.called
      })
      klass.prototype.put.restore()
    })
  })

  /**
   * static delete
   */
  describe('static delete', () => {
    let klass
    let _id = 'foo'
    let delete_doc = { _id }
    let delete_doc_with_rev = { _id, _rev: '3-z' }
    let delete_result = { ok: true }
    let error_message = 'fubar'

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
      return klass.setDatabase(dbName)
    })

    it('should proxy member delete', () => {
      sinon.stub(klass.prototype, 'delete').usingPromise(Promise).resolves(delete_result)
      return klass.delete(delete_doc_with_rev).then(result => {
        klass.prototype.delete.should.have.been.called
        result.should.deep.equal(delete_result)
        klass.prototype.delete.restore()
      })
    })

    it('should call static get first if string arg', () => {
      let deleteStub = sinon.stub().returns(delete_result)
      let instance_with_delete_stub = Object.assign({}, delete_doc_with_rev)
      instance_with_delete_stub.delete = deleteStub
      sinon.stub(klass, 'get').usingPromise(Promise).resolves(instance_with_delete_stub)

      return klass.delete(_id).then(result => {
        klass.get.should.have.been.calledWith(_id)
        result.should.deep.equal(delete_result)
        klass.get.restore()
      })
    })

    it('should call static get first if object arg has no _rev', () => {
      let deleteStub = sinon.stub().returns(delete_result)
      let instance_with_delete_stub = Object.assign({}, delete_doc_with_rev)
      instance_with_delete_stub.delete = deleteStub
      sinon.stub(klass, 'get').usingPromise(Promise).resolves(instance_with_delete_stub)

      return klass.delete(delete_doc).then(result => {
        klass.get.should.have.been.calledWith(_id)
        result.should.deep.equal(delete_result)
        klass.get.restore()
      })
    })

    it('should proxy member delete after calling static get', () => {
      let deleteStub = sinon.stub().returns(delete_result)
      let instance_with_delete_stub = Object.assign({}, delete_doc_with_rev)
      instance_with_delete_stub.delete = deleteStub
      sinon.stub(klass, 'get').usingPromise(Promise).resolves(instance_with_delete_stub)

      return klass.delete(_id).then(result => {
        klass.get.should.have.been.calledWith(_id)
        deleteStub.should.have.been.called
        result.should.deep.equal(delete_result)
        klass.get.restore()
      })
    })
  })

  /**
   * static createIndex
   */
  describe('static createIndex', () => {
    let klass
    let index = 'index'

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
      klass.internalDatabase = { createIndex: sinon.stub().usingPromise(Promise).resolves() }
    })

    it('should proxy database createIndex', () => {
      return klass.createIndex(index).then(result => {
        klass.database.createIndex.should.have.been.calledWith(index)
      })
    })
  })

  /**
   * static getIndexes
   */
  describe('static getIndexes', () => {
    let klass
    let indexes = ['foo', 'bar']
    let indexes_result = { indexes }

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
      klass.internalDatabase = { getIndexes: sinon.stub().usingPromise(Promise).resolves(indexes_result) }
    })

    it('should proxy database getIndexes', () => {
      return klass.getIndexes().then(result => {
        klass.database.getIndexes.should.have.been.called
      })
    })

    it('should map results to the index array', () => {
      return klass.getIndexes().then(result => {
        result.should.deep.equal(indexes)
      })
    })
  })

  /**
   * static createQuery
   */
  describe('static createQuery', () => {
    let klass
    let query_name = 'query'
    let db_query_name = '_design/query'
    let query_map = () => {}
    let query_reduce = () => {}
    let db_query_map = { _id: db_query_name, views: { [query_name]: { map: query_map } } }
    let db_query_both = { _id: db_query_name, views: { [query_name]: { map: query_map, reduce: query_reduce } } }
    let result_created = { _rev: '1-x' }
    let result_updated = { _rev: '2-z' }

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
      klass.internalDatabase = { }
    })

    it('should reject if at least one function is not provided', () => {
      return klass.createQuery(query_name).should.eventually.be.rejectedWith(InvalidConfigurationError, 'createQuery requires at least a map function')
    })

    it('should reject if fn argument is a boolean', () => {
      return klass.createQuery(query_name, false).should.eventually.be.rejectedWith(InvalidConfigurationError, 'createQuery requires at least a map function')
    })

    it('should reject if fn argument is a number', () => {
      return klass.createQuery(query_name, 2).should.eventually.be.rejectedWith(InvalidConfigurationError, 'createQuery requires at least a map function')
    })

    it('should call static put with normalized input (map)', () => {
      sinon.stub(klass, 'put').usingPromise(Promise).resolves(result_created)
      let stub = klass.put

      return klass.createQuery(query_name, query_map).then(result => {
        stub.lastCall.args[0].should.deep.equal(db_query_map)
        result.should.deep.equal({ result: 'created' })
        stub.restore()
      })
    })

    it('should call static put with normalized input (map+reduce)', () => {
      sinon.stub(klass, 'put').usingPromise(Promise).resolves(result_created)
      let stub = klass.put

      return klass.createQuery(query_name, { map: query_map, reduce: query_reduce }).then(result => {
        stub.lastCall.args[0].should.deep.equal(db_query_both)
        result.should.deep.equal({ result: 'created' })
        stub.restore()
      })
    })

    it('should return "created" if query is a new document', () => {
      sinon.stub(klass, 'put').usingPromise(Promise).resolves(result_created)

      return klass.createQuery(query_name, { map: query_map, reduce: query_reduce }).then(result => {
        result.should.deep.equal({ result: 'created' })
        klass.put.restore()
      })
    })

    it('should return "updated" if query is an existing document', () => {
      sinon.stub(klass, 'put').usingPromise(Promise).resolves(result_updated)

      return klass.createQuery(query_name, { map: query_map, reduce: query_reduce }).then(result => {
        result.should.deep.equal({ result: 'updated' })
        klass.put.restore()
      })
    })
  })

  /**
   * static close
   */
  describe('static close', () => {
    let klass
    let dbResolve = { foo: 'bar' }
    let changesResolve = { foo: 'baz' }
    let sync1Resolve = { foo: 'qux' }
    let sync2Resolve = { foo: 'bar' }
    let resolveData = [dbResolve, [changesResolve], [sync1Resolve, sync2Resolve]]

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
      klass.internalDatabase = { close: sinon.stub().usingPromise(Promise).resolves(dbResolve) }
      klass.internalSync = [{ cancel: sinon.stub().usingPromise(Promise).resolves(sync1Resolve) }, { cancel: sinon.stub().usingPromise(Promise).resolves(sync2Resolve) }]
      klass.internalChanges = [{ cancel: sinon.stub().usingPromise(Promise).resolves(changesResolve) }]
    })

    it('should cancel change feed', () => {
      return klass.close().then(() => {
        klass.changes[0].cancel.should.have.been.called
      })
    })

    it('should cancel all sync instances', () => {
      return klass.close().then(() => {
        klass.sync[0].cancel.should.have.been.called
        klass.sync[1].cancel.should.have.been.called
      })
    })

    it('should close the database connection', () => {
      return klass.close().then(() => {
        klass.database.close.should.have.been.called
      })
    })

    it('should return all promises', () => {
      return klass.close().then(results => {
        results.should.deep.equal(resolveData)
      })
    })

    it('should reject if cancel or close rejects', () => {
      let error_message = 'fubar'
      let error = new Error(error_message)
      klass.internalDatabase = { close: sinon.stub().usingPromise(Promise).rejects(error) }
      return klass.close().should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * member put
   */
  describe('member put', () => {
    let klass
    let put_doc = { _id: 'foo', _rev: '3-z' }
    let put_result = { id: 'foo', rev: '3-z' }
    let error_message = 'fubar'

    beforeEach(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should validate the data before storing it', () => {
      sinon.stub(klass.prototype, 'validate').returns({ valid: true })
      klass.internalDatabase = {
        put: sinon.stub().usingPromise(Promise).resolves(put_result)
      }

      return new klass(put_doc).put().then(doc => {
        klass.prototype.validate.should.have.been.calledOnce
        klass.database.put.should.have.been.calledOnce
        klass.prototype.validate.restore()
      })
    })

    it('should throw if data is invalid', () => {
      sinon.stub(klass.prototype, 'validate').returns({ valid: false })
      klass.internalDatabase = {
        put: sinon.stub().usingPromise(Promise).resolves(put_result)
      }

      return new klass(put_doc).put().should.eventually.rejectedWith(ValidationError, 'Invalid document')
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        put: sinon.stub().usingPromise(Promise).resolves(put_result)
      }

      return new klass(put_doc).put().then(doc => {
        doc._rev.should.equal(put_doc._rev)
        klass.database.put.should.have.been.calledOnce
      })
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        put: sinon.stub().usingPromise(Promise).resolves(put_result)
      }

      return new klass(put_doc).put().then(doc => {
        doc.should.be.instanceOf(klass)
        klass.database.put.should.have.been.calledOnce
      })
    })

    it('should get and retry if the put rejects with a 409', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        put: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(put_result),
        get: sinon.stub().usingPromise(Promise).resolves(put_doc)
      }

      let data = {}
      return new klass(put_doc).put(data).then(() => {
        klass.database.put.should.have.been.calledTwice
        klass.database.get.should.have.been.calledOnce
      })
    })

    it('should reject with InternalError if put rejects with any other status', () => {
      klass.internalDatabase = {
        put: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return new klass(put_doc).put().should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * member delete
   */
  describe('member delete', () => {
    let klass
    let delete_doc = { _id: 'foo', _rev: '3-z' }
    let delete_result = { ok: true }
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        remove: sinon.stub().usingPromise(Promise).resolves(delete_result)
      }

      return new klass(delete_doc).delete().then(() => {
        klass.database.remove.should.have.been.calledOnce
      }).should.eventually.be.fulfilled
    })

    it('should resolve a boolean', () => {
      klass.internalDatabase = {
        remove: sinon.stub().usingPromise(Promise).resolves(delete_result)
      }

      return new klass(delete_doc).delete().then(result => {
        klass.database.remove.should.have.been.calledOnce
        result.should.be.true
      })
    })

    it('should get and retry if the delete rejects with a 409', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        remove: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(delete_result),
        get: sinon.stub().usingPromise(Promise).resolves(delete_doc)
      }

      return new klass(delete_doc).delete().then(result => {
        klass.database.remove.should.have.been.calledTwice
        klass.database.get.should.have.been.calledOnce
        result.should.be.true
      })
    })

    it('should reject with InternalError if delete rejects with any other status', () => {
      klass.internalDatabase = {
        remove: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return new klass(delete_doc).delete().should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * member getAttachment
   */
  describe('member getAttachment', () => {
    let klass
    let get_doc = { _id: 'foo' }
    let attachment_name = 'att.txt'
    let attachment = 'some data'
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should create an attachment object if non-exists', () => {
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).resolves(attachment)
      }

      let instance = new klass(get_doc)
      return new klass(get_doc).getAttachment(attachment_name).then(doc => {
        doc._attachments.should.deep.equal({ [attachment_name]: attachment })
      })
    })

    it('should not override an existing attachment object', () => {
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).resolves(attachment)
      }

      let _attachments = { foo: 'bar' }
      return new klass({ _id: 'foo', _attachments }).getAttachment(attachment_name).then(doc => {
        doc._attachments.foo.should.equal('bar')
      })
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).resolves(attachment)
      }

      return new klass(get_doc).getAttachment(attachment_name).then(doc => {
        doc._attachments[attachment_name].should.equal(attachment)
        klass.database.getAttachment.should.have.been.calledOnce
      })
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).resolves(attachment)
      }

      return new klass(get_doc).getAttachment(attachment_name).then(doc => {
        doc.should.be.instanceOf(klass)
        klass.database.getAttachment.should.have.been.calledOnce
      })
    })

    it('should get and retry if the get rejects with a 404', () => {
      let err = new Error(error_message)
      err.status = 404
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).rejects(err)
      }

      return new klass(get_doc).getAttachment(attachment_name).then(doc => {
        expect(doc._attachments[attachment_name]).to.be.null
      })
    })

    it('should not override an existing attachment object if retry occurs', () => {
      let err = new Error(error_message)
      err.status = 404
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).rejects(err)
      }

      let input = { _id: 'foo', _attachments: { foo: 'bar' } }
      return new klass(input).getAttachment(attachment_name).then(doc => {
        expect(doc._attachments[attachment_name]).to.be.null
        doc._attachments.foo.should.equal('bar')
      })
    })

    it('should reject with InternalError if getAttachment rejects with any other status', () => {
      klass.internalDatabase = {
        getAttachment: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return new klass(get_doc).getAttachment(attachment_name).should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * member putAttachment
   */
  describe('member putAttachment', () => {
    let klass
    let data = Buffer.from('some data')
    let doc = { _id: 'foo', _rev: '3-z' }
    let attachment_name = 'att.txt'
    let attachment = { content_type: 'text/plain', data }
    let put_result = { rev: '4-x' }
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        putAttachment: sinon.stub().usingPromise(Promise).resolves(put_result)
      }

      return new klass(doc).putAttachment(attachment_name, attachment).then(result_doc => {
        result_doc.should.be.instanceOf(klass)
        klass.database.putAttachment.should.have.been
          .calledWith(doc._id, attachment_name, doc._rev, attachment.data, attachment.content_type)
      })
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        putAttachment: sinon.stub().usingPromise(Promise).resolves(put_result)
      }

      return new klass(doc).putAttachment(attachment_name, attachment).then(result_doc => {
        result_doc._attachments[attachment_name].should.deep.equal({ content_type: attachment.content_type, data: data.toString('base64') })
        klass.database.putAttachment.should.have.been
          .calledWith(doc._id, attachment_name, doc._rev, attachment.data, attachment.content_type)
      })
    })

    it('should get and retry if the putAttachment rejects with a 409', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        putAttachment: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(put_result),
        get: sinon.stub().usingPromise(Promise).resolves(doc)
      }

      return new klass(doc).putAttachment(attachment_name, attachment).then(() => {
        klass.database.putAttachment.should.have.been.calledTwice
        klass.database.get.should.have.been.calledOnce
      })
    })

    it('should not override an existing attachment object if retry occurs', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        putAttachment: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(put_result),
        get: sinon.stub().usingPromise(Promise).resolves(doc)
      }

      let input = Object.assign({}, doc, { _attachments: { foo: 'bar' } })
      return new klass(input).putAttachment(attachment_name, attachment).then(result => {
        klass.database.putAttachment.should.have.been.calledTwice
        klass.database.get.should.have.been.calledOnce
        result._attachments.foo.should.equal('bar')
      })
    })

    it('should reject with InternalError if putAttachment rejects with any other status', () => {
      klass.internalDatabase = {
        putAttachment: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return new klass(doc).putAttachment(attachment_name, attachment).should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })

  /**
   * member deleteAttachment
   */
  describe('member deleteAttachment', () => {
    let klass
    let data = Buffer.from('some data')
    let attachment_name = 'att.txt'
    let attachment = { content_type: 'text/plain', data }
    let doc = { _id: 'foo', _rev: '3-z', _attachments: { [attachment_name]: attachment } }
    let delete_result = { ok: true, rev: '4-x' }
    let error_message = 'fubar'

    before(() => {
      class Widgets extends CryptoModel {}
      klass = Widgets
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        removeAttachment: sinon.stub().usingPromise(Promise).resolves(delete_result)
      }

      return new klass(doc).deleteAttachment(attachment_name).then(result_doc => {
        result_doc.should.be.instanceOf(klass)
        klass.database.removeAttachment.should.have.been
          .calledWith(doc._id, attachment_name, doc._rev)
      })
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        removeAttachment: sinon.stub().usingPromise(Promise).resolves(delete_result)
      }

      return new klass(doc).deleteAttachment(attachment_name).then(result_doc => {
        expect(result_doc._attachments[attachment_name]).to.be.undefined
        klass.database.removeAttachment.should.have.been
          .calledWith(doc._id, attachment_name, doc._rev)
      })
    })

    it('should get and retry if the deleteAttachment rejects with a 409', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        removeAttachment: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(delete_result),
        get: sinon.stub().usingPromise(Promise).resolves(doc)
      }

      return new klass(doc).deleteAttachment(attachment_name).then(() => {
        klass.database.removeAttachment.should.have.been.calledTwice
        klass.database.get.should.have.been.calledOnce
      })
    })

    it('should not override an existing attachment object if retry occurs', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        removeAttachment: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(delete_result),
        get: sinon.stub().usingPromise(Promise).resolves(doc)
      }

      let input = Object.assign({}, doc, { _attachments: { foo: 'bar' } })
      return new klass(input).deleteAttachment(attachment_name).then(result => {
        klass.database.removeAttachment.should.have.been.calledTwice
        klass.database.get.should.have.been.calledOnce
        result._attachments.foo.should.equal('bar')
      })
    })

    it('should reject with InternalError if deleteAttachment rejects with any other status', () => {
      klass.internalDatabase = {
        removeAttachment: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return new klass(doc).deleteAttachment(attachment_name).should.eventually.be.rejectedWith(InternalError, error_message)
    })
  })
})
