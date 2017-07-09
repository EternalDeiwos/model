'use strict'

/**
 * Dependencies
 * @ignore
 */
const cwd = process.cwd()
const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

/**
 * Assertions
 * @ignore
 */
chai.use(chaiAsPromised)
chai.should()
let expect = chai.expect

/**
 * Code Under Test
 * @ignore
 */
const Model = require(path.join(cwd, 'src', 'Model'))

/**
 * Constants
 * @ignore
 */

/**
 * Tests
 * @ignore
 */
describe('Model', () => {
})
