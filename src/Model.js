'use strict'

/**
 * Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')
const PouchDB = require('pouchdb')
  .plugin(require('pouchdb-find'))

/**
 * Module Dependencies
 * @ignore
 */
const { OperationError, InvalidConfigurationError, ValidationError, InternalError } = require('./errors')
const ModelSchema = require('./ModelSchema')

/**
 * Model
 *
 * @class
 * A PouchDB adapter for the json-document modelling framework. Extends {@link https://www.npmjs.com/package/@trust/json-document|JSONDocument}.
 *
 * @extends JSONDocument
 */
class Model extends JSONDocument {

  /**
   * schema
   *
   * @static
   *
   * @description
   * Model Schema
   *
   * @see {@link https://www.npmjs.com/package/@trust/json-document|JSONSchema}
   *
   * @return {JSONSchema}
   */
  static get schema () {
    return ModelSchema
  }

  /**
   * set database
   *
   * @static
   *
   * @description
   * Configure the database
   *
   * @see {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   *
   * @type {PouchDB}
   */
  static set database (options) {
    // Close current open database
    try {
      this.database.close()
    } catch (error) {
    }

    // Try create database connection
    try {
      Object.defineProperty(this, 'internalDatabase', { value: new PouchDB(options), enumerable: true, configurable: true })
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} database options invalid`)
    }

    // TODO these are asyncronous... this should be handled better
    // Create indices
    let indexPromises = this.indexes.map(index => this.createIndex(index))

    // Create queries
    let queryPromises = this.queries.map(query => this.createQuery(query.name, query.query))
  }

  /**
   * set sync
   *
   * @static
   *
   * @description
   * Configure a remote database for bidirectional replication
   *
   * @see {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   * @see {@link https://pouchdb.com/api.html#sync|Sync}
   *
   * @type {Replication}
   */
  static set sync (options) {
    // Try create remote connection and sync
    try {
      let remote = new PouchDB(options)
      let sync = this.database.sync(remote, {
        live: true,
        retry: true
      })

      sync.on('error', error => {
        throw new InternalError(error.message, error.stack)
      })

      this.sync.push(sync)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for sync`)
    }
  }

  /**
   * replicateTo
   *
   * @static
   *
   * @description
   * Configure a remote database for unidirectional replication
   *
   * @see {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   * @see {@link https://pouchdb.com/api.html#replication|Replication}
   *
   * @type {Replication}
   */
  static set replicateTo (options) {
    // Try create remote connection and replicate
    try {
      let remote = new PouchDB(options)
      let replicate = this.database.replicate.to(remote, {
        live: true,
        retry: true
      })

      replicate.on('error', error => {
        throw new InternalError(error.message, error.stack)
      })

      this.sync.push(replicate)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for replicate`)
    }
  }

  /**
   * replicateFrom
   *
   * @static
   *
   * @description
   * Configure a remote database for unidirectional replication
   *
   * @see {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   * @see {@link https://pouchdb.com/api.html#replication|Replication}
   *
   * @type {Replication}
   */
  static set replicateFrom (options) {
    // Try create remote connection and replicate
    try {
      let remote = new PouchDB(options)
      let replicate = this.database.replicate.from(remote, {
        live: true,
        retry: true
      })

      replicate.on('error', error => {
        throw new InternalError(error.message, error.stack)
      })

      this.sync.push(replicate)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for replicate`)
    }
  }

  /**
   * set changes
   *
   * @static
   *
   * @description
   * Configure a change feed for the database
   *
   * @see {@link https://pouchdb.com/api.html#changes|PouchDB Changes Options}
   *
   * @type {ChangeFeed}
   */
  static set changes (options) {
    // Cancel existing change feed
    if (this.changes) {
      this.changes.cancel()
    }

    Object.defineProperty(this, 'internalChanges', { value: this.database.changes(options), enumerable: true, configurable: true })
  }

  /**
   * get database
   * @ignore
   */
  static get database () {
    let { internalDatabase } = this

    if (!internalDatabase) {
      throw new OperationError(`Model ${this.name} has no database set`)
    }

    return internalDatabase
  }

  /**
   * get sync
   * @ignore
   */
  static get sync () {
    if (!this.internalSync) {
      Object.defineProperty(this, 'internalSync', { value: [], enumerable: true })
    }

    return this.internalSync
  }

  /**
   * get changes
   * @ignore
   */
  static get changes () {
    return this.internalChanges
  }

  /**
   * get indexes
   *
   * @static
   * @abstract
   *
   * @default []
   *
   * @description
   * An array of objects describing the indices to ensure exist when a new database
   * connection is made.
   *
   * @see {@link https://pouchdb.com/api.html#create_index|Index}
   *
   * @type {Array<Index>}
   */
  static get indexes () {
    return []
  }

  /**
   * get queries
   *
   * @static
   * @abstract
   *
   * @default []
   *
   * @description
   * An array of objects describing the named queries to ensure exist when a new
   * database connection is made.
   *
   * @see {@link https://pouchdb.com/api.html#query_database|MapReduceQuery}
   *
   * @type {Array<MapReduceQuery>}
   */
  static get queries () {
    return []
  }

  /**
   * query
   *
   * @static
   *
   * @description
   * Execute a named query on the database collection.
   *
   * @see {@link https://pouchdb.com/api.html#query_database|MapReduceQuery}
   *
   * @param {String} fn - Named query (see Model.createQuery and Model.queries)
   * @param {Object} [options={}] {@link https://pouchdb.com/api.html#query_database|QueryOptions}
   * @return {Promise<Array<ExtendedModel>>}
   */
  static query (fn, options = {}) {
    let ExtendedModel = this
    let { database } = this

    return database.query(fn, options)
      .then(results => results.docs.map(doc => new ExtendedModel(doc)))
      .catch(error => Promise.reject(new InternalError(error.message, error.stack)))
  }

  /**
   * find
   *
   * @static
   *
   * @description
   * Execute an indexed query on the database collection and instantiate the extending class.
   *
   * @see {@link https://pouchdb.com/api.html#create_index|Index}
   *
   * @param {Object} [options={}] {@link https://pouchdb.com/api.html#query_index|FindOptions}
   * @return {Promise<Array<ExtendedModel>>}
   */
  static find (options = {}) {
    let ExtendedModel = this
    let { database } = this

    options.selector = options.selector || {}

    return database.find(options)
      .then(results => results.docs.map(doc => new ExtendedModel(doc)))
      .catch(error => Promise.reject(new InternalError(error.message, error.stack)))
  }

  /**
   * get
   *
   * @static
   *
   * @description
   * Retrieves a stored document and instantiate the extending class.
   *
   * @see {@link https://pouchdb.com/api.html#fetch_document|Query}
   *
   * @param {String} id
   * @param {Object} [options={}] {@link https://pouchdb.com/api.html#fetch_document|GetOptions}
   * @return {Promise<ExtendedModel>}
   */
  static get (id, options = {}) {
    let ExtendedModel = this
    let { database } = this

    return database.get(id, options)
      .then(doc => new ExtendedModel(doc))
      .catch(error => {
        let { status, message, stack } = error

        if (status === 404) {
          return null
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * post
   *
   * @static
   *
   * @description
   * Create a new document in the database and provide an instance of the extending class.
   *
   * @see {@link https://pouchdb.com/api.html#create_document|Post}
   *
   * @param {Object} data
   * @param {String} [data._id] - Omitting this results in a new _id being generated.
   * @param {String} [data._rev] - Required if updating an existing document
   * @param {Object} [data._attachments]
   * @return {Promise<ExtendedModel>}
   */
  static post (data) {
    let ExtendedModel = this
    let { database } = this

    let instance = new ExtendedModel(data)
    let validation = instance.validate()

    if (!validation.valid) {
      return Promise.reject(new ValidationError(validation))
    }

    return database.post(instance)
      .then(result => {
        instance._id = result.id
        instance._rev = result.rev
        return instance
      })
      .catch(error => {
        let { status, message, stack } = error

        // Database Conflict
        if (status === 409) {
          return this.get(instance._id)
            .then(doc => {
              data._rev = doc._rev
              return this.post(data)
            })
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * put
   *
   * @static
   *
   * @description
   * Create or update a document in the database and provide an instance of the extending class.
   *
   * @see {@link https://pouchdb.com/api.html#create_document|Put}
   *
   * @param {Object} data
   * @param {String} data._id
   * @param {String} [data._rev] - Required if updating an existing document
   * @param {Object} [data._attachments]
   * @return {Promise<ExtendedModel>}
   */
  static put (data) {
    let ExtendedModel = this
    return new ExtendedModel(data).put()
  }

  /**
   * delete
   *
   * @static
   *
   * @description
   * Delete a document in the database
   *
   * @see {@link https://pouchdb.com/api.html#delete_document|Delete}
   *
   * @param {(Object|String)} data
   * @param {String} data._id
   * @param {String} data._rev
   * @return {Promise<Boolean>}
   */
  static delete (data) {
    let ExtendedModel = this

    if (typeof data === 'string' || !data._rev) {
      return this.get(data._id || data)
        .then(doc => doc.delete())
    }

    return new ExtendedModel(data).delete()
  }

  /**
   * createIndex
   *
   * @static
   *
   * @description
   * Create an index on the database collection
   *
   * @see {@link https://pouchdb.com/api.html#create_index|Create Index}
   *
   * @param {Object} index - {@link https://pouchdb.com/api.html#create_index|Index}
   * @return {Promise}
   */
  static createIndex (index) {
    let { database } = this

    return this.database.createIndex(index)
  }

  /**
   * getIndexes
   *
   * @static
   *
   * @description
   * Get existing indices on the database collection
   *
   * @see {@link https://pouchdb.com/api.html#list_indexes|List Indexes}
   *
   * @return {Promise<Array<Index>>}
   */
  static getIndexes () {
    let { database } = this

    return this.database.getIndexes()
      .then(result => result.indexes)
  }

  /**
   * createQuery
   *
   * @static
   *
   * @description
   * Create an named on the database collection
   *
   * @see {@link https://pouchdb.com/api.html#query_database|MapReduceQuery}
   *
   * @param {String} name
   * @param {(Object|Function)} fn - {@link https://pouchdb.com/api.html#query_database|MapReduceQuery}
   * @param {Function} fn.map
   * @param {Function} [fn.reduce]
   * @returns {Promise}
   */
  static createQuery (name, fn) {
    let { database } = this

    if (!fn) {
      return Promise.reject(new InvalidConfigurationError(`createQuery requires at least a map function`))
    }

    // Normalize input
    if (typeof fn === 'function') {
      fn = { map: fn }
    } else if (typeof fn !== 'object') {
      return Promise.reject(new InvalidConfigurationError(`createQuery requires at least a map function`))
    }

    return this.put({ _id: `_design/${name}`, views: { [name]: fn } })
      .then(doc => doc._rev.startsWith('1') ? { result: 'created' } : { result: 'updated' })
  }

  /**
   * close
   *
   * @static
   *
   * @description
   * Close the database and replication connection and change feed
   *
   * @return {Promise}
   */
  static close () {
    let { database, changes, sync } = this

    if (changes) {
      changes.cancel()
    }

    if (sync) {
      sync.forEach(replication => replication.cancel())
    }

    return database.close()
  }

  /**
   * put
   *
   * @description
   * Create or update a document in the database and provide an instance of the extending class.
   *
   * @see {@link https://pouchdb.com/api.html#create_document|Put}
   *
   * @return {Promise<ExtendedModel>}
   */
  put () {
    let { database, name: modelName } = this.constructor
    let validation = this.validate()

    if (!validation.valid) {
      return Promise.reject(new ValidationError(validation))
    }

    return database.put(this)
      .then(result => {
        this._rev = result.rev
        return this
      })
      .catch(error => {
        let { status, message, stack } = error

        // Database Conflict
        if (status === 409) {
          return this.constructor.get(this._id)
            .then(doc => {
              this._rev = doc._rev
              return this.put()
            })
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * delete
   *
   * @description
   * Delete a document in the database
   *
   * @see {@link https://pouchdb.com/api.html#delete_document|Delete}
   *
   * @return {Promise<Boolean>}
   */
  delete () {
    let { database, name: modelName } = this.constructor

    return database.remove(this)
      .then(result => !!result.ok)
      .catch(error => {
        let { status, message, stack } = error

        // Database Conflict
        if (status === 409) {
          return this.constructor.get(this._id)
            .then(doc => {
              this._rev = doc._rev
              return this.delete()
            })
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * getAttachment
   *
   * @description
   * Get a document attachment from the database
   *
   * @see {@link https://pouchdb.com/api.html#get_attachment|Get Attachment}
   *
   * @param {String} name
   * @param {Object} [options={}] {@link https://pouchdb.com/api.html#get_attachment|GetAttachmentOptions}
   * @return {Promise<ExtendedModel>}
   */
  getAttachment (name, options = {}) {
    let { database, name: modelName } = this.constructor

    return database.getAttachment(this._id, name, options)
      .then(attachment => {
        if (!this._attachments) {
          this._attachments = {}
        }

        this._attachments[name] = attachment
        return this
      })
      .catch(error => {
        let { status, message, stack } = error

        if (status === 404) {
          return null
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * putAttachment
   *
   * @description
   * Put an attachment onto a document in the database
   *
   * @see {@link https://pouchdb.com/api.html#put_attachment|Put Attachment}
   *
   * @param {String} name
   * @param {Object} attachment {@link https://pouchdb.com/api.html#put_attachment|Attachment}
   * @param {String} attachment.content_type - mime type
   * @param {Buffer} attachment.data
   * @return {Promise<ExtendedModel>}
   */
  putAttachment (name, attachment) {
    let { content_type, data } = attachment
    let { database, name: modelName } = this.constructor

    return database.putAttachment(this._id, name, this._rev, data, content_type)
      .then(result => {
        this._rev = result.rev

        if (!this._attachments) {
          this._attachments = {}
        }

        this._attachments[name] = { content_type, data: data.toString('base64') }
        return this
      })
      .catch(error => {
        let { status, message, stack } = error

        if (status === 409) {
          return this.constructor.get(this._id)
            .then(doc => {
              this._rev = doc._rev
              return this.putAttachment(name, attachment)
            })
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * deleteAttachment
   *
   * @description
   * Delete an attachment from a document in the database
   *
   * @see {@link https://pouchdb.com/api.html#delete_attachment|Delete Attachment}
   *
   * @param {String} name
   * @return {Promise<ExtendedModel>}
   */
  deleteAttachment (name) {
    let { database, name: modelName } = this.constructor

    return database.removeAttachment(this._id, name, this._rev)
      .then(result => {
        this._rev = result.rev || this._rev

        if (this._attachments && this._attachments[name]) {
          delete this._attachments[name]
        }

        return this
      })
      .catch(error => {
        let { status, message, stack } = error

        if (status === 409) {
          return this.constructor.get(this._id)
            .then(doc => {
              this._rev = doc._rev
              return this.deleteAttachment(name, attachment)
            })
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Model
