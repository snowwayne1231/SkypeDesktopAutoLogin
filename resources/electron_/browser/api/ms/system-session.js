const { EventEmitter } = require('events')
const { systemSession, SystemSession } = process.atomBinding('system_session')

// SystemSession is an EventEmitter.
Object.setPrototypeOf(SystemSession.prototype, EventEmitter.prototype)
EventEmitter.call(systemSession)

module.exports = systemSession
