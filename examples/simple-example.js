'use strict'

/**
 * Module Dependencies
 * @ignore
 */
const { DocumentModel } = require('../src')

/**
 * TestSchema
 * @ignore
 */
const TestSchema = {
  type: 'object',
  properties: {
    foo: { type: 'string' },
    bar: { type: 'string' },
  }
}

/**
 * Test Model
 */
class Test extends DocumentModel {

  static get schema () {
    return super.schema.extend(TestSchema)
  }
}

/**
 * Example
 */

let create_results

// Set the database
Test.setDatabase('data/test')

// Add some data
return Promise.all([
  // Add data and auto-generate an ID
  Test.post({ foo: 'bar', bar: 'baz' }),

  // Add some data with a specified ID
  Test.put({ _id: 'f111551685dfb1c5c1c39bf80c000785', foo: 'baz', bar: 'qux' })
])

// Check results
.then(results => {
  let [post_res, put_res] = results
  create_results = post_res
  console.log('POST RESULT', JSON.stringify(post_res, null, 2))
  console.log('PUT RESULT', JSON.stringify(put_res, null, 2))

  // Fetch instance
  return Test.get('f111551685dfb1c5c1c39bf80c000785')
})

.then(instance => {
  console.log('TEST INSTANCE', instance)

  // Delete instance
  return instance.delete()
})

.then(delete_result => {
  console.log('DELETE RESULT', delete_result)

  // Static delete by ID
  return Test.delete(create_results._id)
})

.then(delete_result => {
  console.log('STATIC DELETE RESULT', delete_result)

  // Done
  console.log('DONE')
})

// Catch Errors
.catch(console.error)
