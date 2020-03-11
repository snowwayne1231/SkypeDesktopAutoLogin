'use strict'

const ipcMain = require('@electron/internal/browser/ipc-main-internal')
const errorUtils = require('@electron/internal/common/error-utils')

const callHandler = async function (handler, event, args, reply) {
  try {
    const result = await handler(event, ...args)
    reply([null, result])
  } catch (error) {
    reply([errorUtils.serialize(error)])
  }
}

exports.handle = function (channel, handler) {
  ipcMain.on(channel, (event, requestId, ...args) => {
    callHandler(handler, event, args, responseArgs => {
      if (requestId) {
        event.sender._sendInternal(`${channel}_RESPONSE_${requestId}`, ...responseArgs)
      } else {
        event.returnValue = responseArgs
      }
    })
  })
}
