'use strict'

/**
 * Dependencies
 * @ignore
 */
const fetch = require('node-fetch')

/**
 * Plugin
 * @ignore
 */
function list (remote) {
  return fetch(`${remote}/_all_dbs`)
    .then(res => res.json())
}

function plugin (PouchDB) {
  PouchDB.list = list
}

/**
 * Exports
 * @ignore
 */
module.exports = plugin
