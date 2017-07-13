'use strict'

/**
 * Dependencies
 * @ignore
 */
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
 * @param {Class} superclass - should be JSONDocument or JWD
 */
const MixinModel = superclass => class Model extends superclass {

  /**
   * constructor
   * @ignore
   */
  constructor (data, options) {
    // TODO FIXME
    // JSON Document hack
    console.log(superclass.name)
    if (superclass.name === 'JWD') {
      data.type = data.type || 'JWS'
      data.serialization = data.serialization || 'document'
    }

    let overrideOptions = Object.assign({}, options, { filter: false })
    super(data, overrideOptions)
  }

  /**
   * schema
   *
   * @static
   * @abstract
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
   * get database
   *
   * @type {PouchDB}
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
   *
   * @type {Array<Sync>}
   */
  static get sync () {
    if (!this.internalSync) {
      this.internalSync = []
    }

    return this.internalSync
  }

  /**
   * get changes
   *
   * @type {Array<ChangeFeed>}
   */
  static get changes () {
    if (!this.internalChanges) {
      this.internalChanges = []
    }

    return this.internalChanges
  }

  /**
   * setDatabase
   *
   * @static
   *
   * @description
   * Configure the database
   *
   * @param {Object} options - {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   *
   * @return {Promise}
   */
  static setDatabase (options) {
    // Close current open database
    let closePromise
    if (this.internalDatabase) {
      closePromise = this.internalDatabase.close()
    } else {
      closePromise = Promise.resolve()
    }

    // Try create database connection
    try {
      this.internalDatabase = new PouchDB(options)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} database options invalid`)
    }

    // Create indices
    let indexPromises = this.indexes.map(index => this.createIndex(index))

    // Create queries
    let queryPromises = this.queries.map(query => this.createQuery(query.name, query.query))

    return closePromise
      .then(() => Promise.all([
        Promise.all(indexPromises).catch(error => Promise.reject(new InvalidConfigurationError(`Model ${this.name} index configuration invalid`))),
        Promise.all(queryPromises).catch(error => Promise.reject(new InvalidConfigurationError(`Model ${this.name} map-reduce query configuration invalid`)))
      ]))
      .then(([indexResults, queryResults]) => indexResults.concat(queryResults))
  }

  /**
   * setSync
   *
   * @static
   *
   * @description
   * Configure a remote database for bidirectional replication
   *
   * @param {Object} options - {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   * @param {Object} [replicationOptions = { live: true, retry: true }] - {@link https://pouchdb.com/api.html#sync|Sync Options}
   *
   * @return {Sync}
   */
  static setSync (options, replicationOptions = { live: true, retry: true }) {
    // Try create remote connection and sync
    try {
      let remote = new PouchDB(options)
      let sync = this.database.sync(remote, replicationOptions)

      sync.on('error', error => { throw new InternalError(error.message, error.stack) })

      this.sync.push(sync)
      return sync

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
   * @param {Object} options - {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   * @param {Ibject} [replicationOptions = { live: true, retry: true }] - {@link https://pouchdb.com/api.html#replication|Replication Options}
   *
   * @return {Replication}
   */
  static replicateTo (options, replicationOptions = { live: true, retry: true }) {
    // Try create remote connection and replicate
    try {
      let remote = new PouchDB(options)
      let replicate = this.database.replicate.to(remote, replicationOptions)

      replicate.on('error', error => { throw new InternalError(error.message, error.stack) })

      this.sync.push(replicate)
      return replicate

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
   * @param {Object} options - {@link https://pouchdb.com/api.html#create_database|PouchDB Constructor Options}
   * @param {Object} [replicationOptions = { live: true, retry: true }] - {@link https://pouchdb.com/api.html#replication|Replication Options}
   *
   * @return {Replication}
   */
  static replicateFrom (options, replicationOptions = { live: true, retry: true }) {
    // Try create remote connection and replicate
    try {
      let remote = new PouchDB(options)
      let replicate = this.database.replicate.from(remote, replicationOptions)

      replicate.on('error', error => { throw new InternalError(error.message, error.stack) })

      this.sync.push(replicate)
      return replicate

    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for replicate`)
    }
  }

  /**
   * setChanges
   *
   * @static
   *
   * @description
   * Configure a change feed for the database
   *
   * @param {Object} [options = { live: true, include_docs: true, since: 'now' }] - {@link https://pouchdb.com/api.html#changes|PouchDB Changes Options}
   *
   * @return {Changes}
   */
  static setChanges (options = { live: true, include_docs: true, since: 'now' }) {
    let { database, changes } = this

    let changeFeed = database.changes(options)
    changes.push(changeFeed)

    return changeFeed
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
      .catch(error => Promise.reject(new InternalError(error.message, error.stack)))
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
   * Create a named query on the database collection
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
   * Close the database and replication connections and change feeds
   *
   * @return {Promise}
   */
  static close () {
    let { database, changes, sync } = this

    if (changes) {
      changes.forEach(change => change.cancel())
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
    let { database } = this.constructor

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
    let { database } = this.constructor

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
          if (!this._attachments) {
            this._attachments = {}
          }

          this._attachments[name] = null
          return this
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
    let { database } = this.constructor

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

        // Database conflict
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
    let { database } = this.constructor

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
              return this.deleteAttachment(name)
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
module.exports = MixinModel
