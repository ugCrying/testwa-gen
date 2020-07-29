const WebSocketServer = require('ws').Server
const http = require('http')
const express = require('express')
const path = require('path')
const net = require('net')
const app = express()

const PORT = process.env.PORT || 9002
const { fork } = require('child_process')
app.use(express.static(path.join(__dirname, '/public')))

var server = http.createServer(app)
var wss = new WebSocketServer({ server: server })
let child

wss.on('connection', function (ws) {
  const connectScrcpy = (sn) => {
    let isSuccess = false
    console.info('Got a client')

    var stream = net.connect({
      port: 1717
    })
  
    stream.write('test')
  
    var controlStream = net.connect({
      port: 1717
  })
  
    stream.on('error', function() {
      console.error('Be sure to run `adb forward tcp:1717 localabstract:minicap`')
      process.exit(1)
    })
  
    var readBannerBytes = 0
    var bannerLength = 2
    var readFrameBytes = 0
    var frameBodyLength = 0
    var frameBody = new Buffer(0)
    var banner = {
      version: 0
    , length: 0
    , pid: 0
    , realWidth: 0
    , realHeight: 0
    , virtualWidth: 0
    , virtualHeight: 0
    , orientation: 0
    , quirks: 0
    }
    
    // TODO: pass sn
    console.log(__dirname, 'ws')
    const p = path.join(__dirname, 'scrcpy.js')
    if (child && child.pid) {
      process.kill(child.pid)
    }
    child = fork(p, [`--sn=${sn}`], { stdio: 'inherit' })
    let close = false
    let timer
  
    function tryRead() {
      // console.log(`${index++}`, isSuccess)
      for (var chunk; (chunk = stream.read());) {
        // console.info('chunk(length=%d)', chunk.length)
        for (var cursor = 0, len = chunk.length; cursor < len;) {
          if (readBannerBytes < bannerLength) {
            switch (readBannerBytes) {
            case 0:
              // version
              banner.version = chunk[cursor]
              break
            case 1:
              // length
              banner.length = bannerLength = chunk[cursor]
              break
            case 2:
            case 3:
            case 4:
            case 5:
              // pid
              banner.pid +=
                (chunk[cursor] << ((readBannerBytes - 2) * 8)) >>> 0
              break
            case 6:
            case 7:
            case 8:
            case 9:
              // real width
              banner.realWidth +=
                (chunk[cursor] << ((readBannerBytes - 6) * 8)) >>> 0
              break
            case 10:
            case 11:
            case 12:
            case 13:
              // real height
              banner.realHeight +=
                (chunk[cursor] << ((readBannerBytes - 10) * 8)) >>> 0
              break
            case 14:
            case 15:
            case 16:
            case 17:
              // virtual width
              banner.virtualWidth +=
                (chunk[cursor] << ((readBannerBytes - 14) * 8)) >>> 0
              break
            case 18:
            case 19:
            case 20:
            case 21:
              // virtual height
              banner.virtualHeight +=
                (chunk[cursor] << ((readBannerBytes - 18) * 8)) >>> 0
              break
            case 22:
              // orientation
              banner.orientation += chunk[cursor] * 90
              break
            case 23:
              // quirks
              banner.quirks = chunk[cursor]
              break
            }
  
            cursor += 1
            readBannerBytes += 1
  
            if (readBannerBytes === bannerLength) {
              // console.log('banner', banner)
              ws.send(JSON.stringify({
                type: 'banner',
                value: banner
              }))
              isSuccess = true
            }
          }
          else if (readFrameBytes < 4) {
            frameBodyLength += (chunk[cursor] << (readFrameBytes * 8)) >>> 0
            cursor += 1
            readFrameBytes += 1
            // console.info('headerByte%d(val=%d)', readFrameBytes, frameBodyLength)
          }
          else {
            if (len - cursor >= frameBodyLength) {
              // console.info('bodyFin(len=%d,cursor=%d)', frameBodyLength, cursor)
  
              frameBody = Buffer.concat([
                frameBody
              , chunk.slice(cursor, cursor + frameBodyLength)
              ])
  
              // Sanity check for JPG header, only here for debugging purposes.
              if (frameBody[0] !== 0xFF || frameBody[1] !== 0xD8) {
                // console.error(
                //   'Frame body does not start with JPG header', frameBody)
                // process.exit(1)
              } else {
                isSuccess = true
                ws.send(frameBody, {
                  binary: true
                })
              }
  
  
              cursor += frameBodyLength
              frameBodyLength = readFrameBytes = 0
              frameBody = new Buffer(0)
            }
            else {
              // console.info('body(len=%d)', len - cursor)
  
              frameBody = Buffer.concat([
                frameBody
              , chunk.slice(cursor, len)
              ])
  
              frameBodyLength -= len - cursor
              readFrameBytes += len - cursor
              cursor = len
            }
          }
        }
      }
    }
  
    stream.on('readable', tryRead)
  
    stream.on('error', console.error)
  
    ws.on('close', function () {
      close = true
      console.info('Lost a client')
      clearInterval(timer)
      timer = null
      // scrcpy.send('exit')
      stream.end()
    })

  }

  ws.on('message', (data) => {
    // console.log(data)
    try {
      // @ts-ignore
      const { type, value } = JSON.parse(data)
      console.log(type, value)
      type === 'sn' && connectScrcpy(value)
    } catch (e) {
      console.error(e);
    }
  })
})

server.listen(PORT)
console.info('Listening on port %d', PORT)
