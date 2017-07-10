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
 * A PouchDB adapter for the json-document modelling framework.
 */
class Model extends JSONDocument {

  /**
   * schema
   *
   * @static
   */
  static get schema () {
    return ModelSchema
  }

  /**
   * set database
   *
   * @static
   */
  static set database (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} database options are required`)
    }

    // Close current open database
    if (this.database) {
      this.database.close()
    }

    // Try create database connection
    try {
      Object.defineProperty(this, '_database', { value: new PouchDB(options), enumerable: true })
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} database options invalid`)
    }

    // Create indices
    this.indexes.forEach(index => this._database.createIndex(index))
  }

  /**
   * set sync
   *
   * @static
   */
  static set sync (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options are required for sync`)
    }

    if (!this.sync) {
      Object.defineProperty(this, '_sync', { value: [], enumerable: true })
    }

    if (!this.database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    // Try create remote connection and sync
    try {
      let remote = new PouchDB(options)
      let sync = this.database.sync(remote, {
        live: true,
        retry: true
      })

      sync.on('error', error => throw new InternalError(error.message, error.stack))

      this.sync.push(sync)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for sync`)
    }
  }

  /**
   * replicateTo
   *
   * @static
   */
  static set replicateTo (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options are required for replicate`)
    }

    if (!this.sync) {
      Object.defineProperty(this, '_sync', { value: [], enumerable: true })
    }

    if (!this.database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    // Try create remote connection and replicate
    try {
      let remote = new PouchDB(options)
      let replicate = this.database.replicate.to(remote, {
        live: true,
        retry: true
      })

      replicate.on('error', error => throw new InternalError(error.message, error.stack))

      this.sync.push(replicate)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for replicate`)
    }
  }

  /**
   * replicateFrom
   *
   * @static
   */
  static set replicateFrom (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options are required for replicate`)
    }

    if (!this.sync) {
      Object.defineProperty(this, '_sync', { value: [], enumerable: true })
    }

    if (!this.database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    // Try create remote connection and replicate
    try {
      let remote = new PouchDB(options)
      let replicate = this.database.replicate.from(remote, {
        live: true,
        retry: true
      })

      replicate.on('error', error => throw new InternalError(error.message, error.stack))

      this.sync.push(replicate)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} remote database options invalid for replicate`)
    }
  }

  /**
   * set changes
   *
   * @static
   */
  static set changes (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} changes options are required`)
    }

    if (!this.database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    // Cancel existing change feed
    if (this.changes) {
      this.changes.cancel()
    }

    // Try create change feed
    try {
      Object.defineProperty(this, '_changes', { value: this.database.changes(options), enumerable: true })
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} changes options invalid`)
    }
  }

  /**
   * get database
   *
   * @static
   */
  static get database () {
    return this._database
  }

  /**
   * get sync
   *
   * @static
   */
  static get sync () {
    return this._sync
  }

  /**
   * get changes
   *
   * @static
   */
  static get changes () {
    return this._changes
  }

  /**
   * get indexes
   *
   * @static
   */
  static get indexes () {
    return []
  }

  /**
   * get
   *
   * @static
   */
  static get (id, options = {}) {
    let ExtendedModel = this
    let { database } = this

    if (!database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

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
   * find
   *
   * @static
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
   * post
   *
   * @static
   */
  static post (data) {
    let ExtendedModel = this
    return new ExtendedModel(data).post()
  }

  /**
   * put
   *
   * @static
   */
  static put (data) {
    let ExtendedModel = this
    return new ExtendedModel(data).put()
  }

  /**
   * delete
   *
   * @static
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
   */
  static createIndex (index) {
    return this.database.createIndex(index)
  }

  /**
   * getIndexes
   */
  static getIndexes () {
    return this.database.getIndexes()
  }

  /**
   * post
   */
  post () {
    let { database, name: modelName } = this.constructor
    let validation = this.validate()

    if (!database) {
      return Promise.reject(new OperationError(`Model ${modelName} has no database set`))
    }

    if (!validation.valid) {
      return Promise.reject(new ValidationError(validation))
    }

    return database.post(this)
      .then(result => {
        this._id = result.id
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
              return this.post()
            })
        }

        return Promise.reject(new InternalError(message, stack))
      })
  }

  /**
   * put
   */
  put () {
    let { database, name: modelName } = this.constructor
    let validation = this.validate()

    if (!database) {
      return Promise.reject(new OperationError(`Model ${modelName} has no database set`))
    }

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
   */
  delete () {
    let { database, name: modelName } = this.constructor

    if (!database) {
      return Promise.reject(new OperationError(`Model ${modelName} has no database set`))
    }

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
   */
  getAttachment (name, options = {}) {
    let { database, name: modelName } = this.constructor

    if (!database) {
      return Promise.reject(new OperationError(`Model ${modelName} has no database set`))
    }

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
   */
  putAttachment (name, attachment) {
    let { content_type, data } = attachment
    let { database, name: modelName } = this.constructor

    if (!database) {
      return Promise.reject(new OperationError(`Model ${modelName} has no database set`))
    }

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
   */
  deleteAttachment (name) {
    let { database, name: modelName } = this.constructor

    if (!database) {
      return Promise.reject(new OperationError(`Model ${modelName} has no database set`))
    }

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
