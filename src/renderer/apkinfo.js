const os = require('os')
const path = require('path')
const { exec } = require('child_process')
const mime = require('mime-types')
const yauzl = require('yauzl')
const requests = require('request')

const appActivity = (app) => new Promise((resolve) => {
  requests.get(
    `http://127.0.0.1:50819/packages/${app}/info`,
    { json: true },
    (_err, _res, body) => {
      if (!body) return resolve()
      const { data } = body
      if (data) {
        return resolve(data.mainActivity)
      }
      return resolve()
    },
  )
})
