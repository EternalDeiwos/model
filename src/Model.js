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
    this.indices.forEach(index => this._database.createIndex(index))
  }

  /**
   * set sync
   *
   * @static
   */
  static set sync (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} sync options are required`)
    }

    if (!this.sync) {
      Object.defineProperty(this, '_sync', { value: [], enumerable: true })
    }

    if (!this.database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    // Try create remote connection
    try {
      let remote = new PouchDB(options)
      let sync = this.database.sync(remote, {
        live: true,
        retry: true
      })

      sync.on('error', error => throw new InternalError(error.message, error.stack))

      this.sync.push(sync)
    } catch (error) {
      throw new InvalidConfigurationError(`Model ${this.name} sync options invalid`)
    }
  }

  /**
   * set changes
   *
   * @static
   */
  static set changes (options) {
    if (!options) {
      throw new InvalidConfigurationError(`Model ${this.name} database options are required`)
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
      throw new InvalidConfigurationError(`Model ${this.name} database options invalid`)
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
   * get indices
   *
   * @static
   */
  static get indices () {
    return []
  }

  /**
   * get
   *
   * @static
   */
  static get (id) {
    let ExtendedModel = this
    let { database } = this

    if (!database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    return database.get(id)
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
   * onSync
   *
   * @static
   */
  static onSync (name, fn) {
    this.sync.forEach(sync => sync.on(name, fn))
  }

  /**
   * onChange
   *
   * @static
   */
  static onChange (fn) {
    if (!this.database) {
      return Promise.reject(new OperationError(`Model ${this.name} has no database set`))
    }

    // Create change feed if not already present
    if (!this.changes) {
      Object.defineProperty(this, '_changes', { value: this.database.changes({ since: 'now', live: true, include_docs: true }), enumerable: true })
    }

    // Subscribe change listener
    let { changes } = this

    changes.on('error', error => throw new InternalError(error.message, error.stack))
    changes.on('change', fn)
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
}

/**
 * Exports
 * @ignore
 */
module.exports = Model
