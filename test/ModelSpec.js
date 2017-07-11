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
const Model = require(path.join(cwd, 'src', 'Model'))
const ModelSchema = require(path.join(cwd, 'src', 'ModelSchema'))
const PouchDB = require('pouchdb')
const { JSONSchema, JSONDocument } = require('@trust/json-document')
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
describe('Model', () => {

  /**
   * model extends
   */
  it('should extend JSONDocument', () => {
    Object.getPrototypeOf(Model).should.equal(JSONDocument)
  })

  /**
   * schema
   */
  describe('member schema', () => {
    it('should be an instance of JSONSchema', () => {
      Model.schema.should.be.instanceOf(JSONSchema)
    })

    it('should equal ModelSchema', () => {
      Model.schema.should.equal(ModelSchema)
    })

    describe('extended class', () => {
      it('should equal ModelSchema if not overriden', () => {
        class Widgets extends Model {}
        Widgets.schema.should.equal(ModelSchema)
      })

      it('should not equal ModelSchema if overriden', () => {
        class Widgets extends Model {
          static get schema () { return new JSONSchema({}) }
        }
        Widgets.schema.should.not.equal(ModelSchema)
      })
    })
  })

  /**
   * database
   */
  describe('member database', () => {
    let klass
    const index = 'some_index'
    const query = { name: 'some_query', query: 'query body' }

    beforeEach(() => {
      class Widgets extends Model {
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

    describe('set', () => {
      it('should configure the database with a string argument', () => {
        klass.database = dbName
        klass.database.should.be.instanceOf(PouchDB)
      })

      it('should configure the database with an object argument', () => {
        klass.database = { name: dbName }
        klass.database.should.be.instanceOf(PouchDB)
      })

      it('should close a previous database connection if a new one is created', () => {
        let stub = sinon.stub()
        klass.internalDatabase = { close: stub }
        klass.database = dbName
        stub.should.have.been.calledOnce
      })

      it('should throw InvalidConfigurationError with invalid (boolean) option', () => {
        expect(() => klass.database = false).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) option', () => {
        expect(() => klass.database = 2).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid')
      })

      it('should throw InvalidConfigurationError with name unspecified', () => {
        expect(() => klass.database = {}).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (boolean) name with object argument', () => {
        expect(() => klass.database = { name: false }).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) name with object argument', () => {
        expect(() => klass.database = { name: 2 }).to.throw(InvalidConfigurationError, 'Model Widgets database options invalid')
      })

      it('should create database indices', () => {
        klass.database = dbName
        klass.createIndex.should.have.been.calledOnce
        klass.createIndex.should.have.been.calledWith(index)
      })

      it('should create database map-reduce queries', () => {
        klass.database = dbName
        klass.createQuery.should.have.been.calledOnce
        klass.createQuery.should.have.been.calledWith(query.name, query.query)
      })

      describe.skip('database setup promise', () => {
        it('should reject if database index creation fails')
        it('should reject if database query creation fails')
      })
    })

    describe('get', () => {
      it('should throw if database not configured', () => {
        expect(() => klass.database).to.throw(OperationError, 'Model Widgets has no database set')
      })

      it('should not throw if database is configured', () => {
        klass.database = dbName
        expect(() => klass.database).to.not.throw()
      })

      it('should return a reference to the database', () => {
        klass.database = dbName
        klass.database.name.should.equal(dbName)
      })
    })
  })

  /**
   * sync
   */
  describe('member sync', () => {
    let klass

    beforeEach(() => {
      class Widgets extends Model {}
      Widgets.database = dbName
      klass = Widgets
    })

    describe('set', () => {
      it('should create a sync emitter', () => {
        klass.sync.length.should.equal(0)
        klass.sync = remoteDbName
        klass.sync.length.should.equal(1)
      })

      it('should throw with invalid (boolean) option', () => {
        expect(() => klass.sync = false).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) option', () => {
        expect(() => klass.sync = 2).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with name unspecified with object option', () => {
        expect(() => klass.sync = {}).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (boolean) name with object option', () => {
        expect(() => klass.sync = { name: false }).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
      })

      it('should throw InvalidConfigurationError with invalid (number) name with object option', () => {
        expect(() => klass.sync = { name: 2 }).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
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
   * replicateTo
   */
  describe('member replicateTo', () => {
    let klass

    beforeEach(() => {
      class Widgets extends Model {}
      Widgets.database = dbName
      klass = Widgets
    })

    it('should create a sync emitter', () => {
      klass.sync.length.should.equal(0)
      klass.replicateTo = remoteDbName
      klass.sync.length.should.equal(1)
    })

    it('should throw InvalidConfigurationError with invalid (boolean) option', () => {
      expect(() => klass.replicateTo = false).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with invalid (number) option', () => {
      expect(() => klass.replicateTo = 2).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with name unspecified with object option', () => {
      expect(() => klass.replicateTo = {}).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with invalid (boolean) name with object option', () => {
      expect(() => klass.replicateTo = { name: false }).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with invalid (number) name with object option', () => {
      expect(() => klass.replicateTo = { name: 2 }).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })
  })

  /**
   * replicateFrom
   */
  describe('member replicateFrom', () => {
    let klass

    beforeEach(() => {
      class Widgets extends Model {}
      Widgets.database = dbName
      klass = Widgets
    })

    it('should create a sync emitter', () => {
      klass.sync.length.should.equal(0)
      klass.replicateFrom = remoteDbName
      klass.sync.length.should.equal(1)
    })

    it('should throw InvalidConfigurationError with invalid (boolean) option', () => {
      expect(() => klass.replicateFrom = false).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with invalid (number) option', () => {
      expect(() => klass.replicateFrom = 2).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with name unspecified with object option', () => {
      expect(() => klass.replicateFrom = {}).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with invalid (boolean) name with object option', () => {
      expect(() => klass.replicateFrom = { name: false }).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })

    it('should throw InvalidConfigurationError with invalid (number) name with object option', () => {
      expect(() => klass.replicateFrom = { name: 2 }).to.throw(InvalidConfigurationError, 'Model Widgets remote database options invalid')
    })
  })

  /**
   * changes
   */
  describe('member changes', () => {
    let klass

    beforeEach(() => {
      class Widgets extends Model {}
      Widgets.database = dbName
      klass = Widgets
    })

    describe('set', () => {
      it('should set the change feed', () => {
        expect(klass.changes).to.be.undefined
        klass.changes = { live: true, retry: true }
        expect(klass.changes).to.not.be.undefined
      })

      it('should cancel the old change feed when creating another', () => {
        expect(klass.changes).to.be.undefined
        klass.changes = { live: true, retry: true }
        expect(klass.changes).to.not.be.undefined
        sinon.stub(klass.internalChanges, 'cancel')
        let cancelSpy = sinon.spy()
        klass.internalChanges.cancel = cancelSpy
        klass.changes = { live: true, retry: true }
        cancelSpy.should.have.been.calledOnce
      })
    })

    describe('get', () => {
      it('should be undefined before a change feed is created', () => {
        expect(klass.changes).to.be.undefined
      })

      it('should not be undefined after a change feed is created', () => {
        klass.changes = { live: true, retry: true }
        expect(klass.changes).to.not.be.undefined
      })
    })
  })

  /**
   * indexes
   */
  describe('member indexes', () => {
    it('should be an array', () => {
      expect(Array.isArray(Model.indexes)).to.be.true
    })

    it('should be empty', () => {
      Model.indexes.length.should.equal(0)
    })

    describe('extended class', () => {
      it('should deep equal model indexes if not overriden', () => {
        class Widgets extends Model {}
        Widgets.indexes.should.deep.equal(Model.indexes)
      })
    })
  })

  /**
   * queries
   */
  describe('member queries', () => {
    it('should be an array', () => {
      expect(Array.isArray(Model.queries)).to.be.true
    })

    it('should be empty', () => {
      Model.queries.length.should.equal(0)
    })

    describe('extended class', () => {
      it('should deep equal model queries if not overriden', () => {
        class Widgets extends Model {}
        Widgets.queries.should.deep.equal(Model.queries)
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
      class Widgets extends Model {}
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
      class Widgets extends Model {}
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
        results[0].should.deep.equal(docs[0])
        results[1].should.deep.equal(docs[1])
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
      class Widgets extends Model {}
      klass = Widgets
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        get: sinon.stub().usingPromise(Promise).resolves(get_doc)
      }

      return klass.get().then(doc => {
        doc.should.deep.equal(get_doc)
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

    before(() => {
      class Widgets extends Model {}
      klass = Widgets
    })

    it('should validate the data before storing it', () => {
      sinon.stub(klass.prototype, 'validate').returns({ valid: true })
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).resolves(post_result_with_rev)
      }

      return klass.post().then(doc => {
        klass.prototype.validate.should.have.been.calledOnce
        klass.database.post.should.have.been.calledOnce
        klass.prototype.validate.restore()
      })
    })

    it('should proxy the call to the database', () => {
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).resolves(post_result_with_rev)
      }

      return klass.post().then(doc => {
        doc.should.deep.equal(post_doc_with_rev)
        klass.database.post.should.have.been.calledOnce
      })
    })

    it('should resolve an instance of the extended model', () => {
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).resolves(post_result_with_rev)
      }

      return klass.post().then(doc => {
        doc.should.be.instanceOf(klass)
        klass.database.post.should.have.been.calledOnce
      })
    })

    it('should get and retry if the post rejects with a 409', () => {
      let err = new Error(error_message)
      err.status = 409
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).onFirstCall().rejects(err)
          .onSecondCall().resolves(post_result_with_rev),
        get: sinon.stub().usingPromise(Promise).resolves(post_doc_with_rev)
      }

      let data = {}
      return klass.post(data).then(() => {
        klass.internalDatabase.post.should.have.been.calledTwice
        klass.internalDatabase.get.should.have.been.calledOnce
        data._rev.should.equal('3-z')
      })
    })

    it('should reject with InternalError if post rejects with any other status', () => {
      klass.internalDatabase = {
        post: sinon.stub().usingPromise(Promise).rejects(new Error(error_message))
      }

      return klass.post().should.eventually.be.rejectedWith(InternalError, error_message)
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
      class Widgets extends Model {}
      klass = Widgets
      klass.database = dbName
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
      class Widgets extends Model {}
      klass = Widgets
      klass.database = dbName
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
      class Widgets extends Model {}
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
      class Widgets extends Model {}
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
      class Widgets extends Model {}
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
    let resolveData = { foo: 'bar' }

    beforeEach(() => {
      class Widgets extends Model {}
      klass = Widgets
      klass.internalDatabase = { close: sinon.stub().usingPromise(Promise).resolves(resolveData) }
      klass.internalSync = [{ cancel: sinon.stub().usingPromise(Promise).resolves() }, { cancel: sinon.stub().usingPromise(Promise).resolves() }]
      klass.internalChanges = { cancel: sinon.stub().usingPromise(Promise).resolves() }
    })

    it('should cancel change feed', () => {
      return klass.close().then(() => {
        klass.changes.cancel.should.have.been.called
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

    it('should return the database.close promise', () => {
      return klass.close().should.eventually.equal(resolveData)
    })
  })
})
