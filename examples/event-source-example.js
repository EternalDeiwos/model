'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { EventSource, Action } = require('../src')

/**
 * TestEventSchema
 * @ignore
 */
const TestEventSchema = {
  type: 'object',
  properties: {
    foo: { type: 'string' },
    bar: { type: 'string' },
  }
}

/**
 * Test Action
 */
class TestAction extends Action {

  get schema () {
    return super.schema.extend(TestEventSchema)
  }

  static reducer (state = {}, event) {
    console.log('TEST ACTION', event)
    let { _id: id, foo, type } = event
    return Object.assign({}, state, { [id]: { foo, type } })
  }
}

/**
 * ReduxInit Action
 */
class ReduxInit extends Action {

  get schema () {
    return super.schema.extend(TestEventSchema)
  }

  static reducer (state = {}, event) {
    return state
  }
}

/**
 * Test EventSource
 */
class Test extends EventSource {

  static get actions () {
    return {
      test: TestAction,
      '@@redux/INIT': ReduxInit
    }
  }
}

let source = new Test({
  name: 'data/test'
  // sync: 'http://localhost:5984',
  // rotate: '1d'
})

source.store.subscribe(() => console.log('STATE', source.state))
source.database.sync('http://localhost:5984/test', { live: true, retry: true })

let testActionInstance = source.factory('test')
let storePromise = testActionInstance.put({ foo: 'bar', type: 'test' })
storePromise.then(() => console.log('DONE'))
