'use strict'

/**
 * Dependencies
 * @ignore
 */
const { JSONDocument } = require('@trust/json-document')
const PouchDB = require('pouchdb')
  .plugin(require('./DBListPlugin'))

/**
 * Module Dependencies
 * @ignore
 */
const { createStore } = require('redux')
const { AbstractError, OperationError, InvalidConfigurationError, InternalError } = require('../errors')

/**
 * EventSource
 * @ignore
 */
class EventSource {

  /**
   * constructor
   */
  constructor (options = {}) {
    let { constructor: { actions, reducer } } = this
    let { name, initialState, enhancers } = options
    let store = createStore(reducer, initialState, enhancers)
    let db = new PouchDB(name)
    let changes = db.changes({
      live: true,
      include_docs: true,
      since: 0
    })

    changes.on('change', change => {
      console.log('CHANGE', change)
      let { doc, deleted } = change

      if (doc && !deleted) {
        store.dispatch(doc)
      }
    })

    this.store = store
    this.internalDatabase = db
  }

  static get reducer () {
    let { actions } = this

    return (state, event) => {
      let { type } = event

      if (!type) {
        throw new OperationError('All events require a type')
      }

      let action = actions[type]
      if (!action) {
        throw new OperationError(`No action registered for event type ${type}`)
      }

      return action.reducer(state, event)
    }
  }

  static get actions () {
    throw new AbstractError('actions must be overriden in the child class')
  }

  get database () {
    return this.internalDatabase
  }

  get state () {
    return this.store.getState()
  }

  factory (name) {
    let { constructor: { actions } } = this
    let Action = actions[name]
    return new Action(this)
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = EventSource
