// require('../../../api/scrcpy/index.js')

const startScrcpy = (sn, canvas, { success, error }) => {
  var isSuccess = false
  var ws
  var banner
  const connect = () => {
    var BLANK_IMG =
      'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    
    var g = canvas.getContext('2d')

    if (ws) {
      ws.close()
      ws = null
    }
    ws = new WebSocket('ws://localhost:9002', 'minicap')
    ws.binaryType = 'blob'
    
    ws.onclose = function() {
      console.log('onclose', arguments)
    }
    
    ws.onerror = function() {
      console.log('onerror', arguments)
    }
    
    ws.onmessage = function({ data }) {
      isSuccess = true
      if (data === JSON.stringify({ type: 'beat' })) {
        return 
      }
      try {
        const { type, value } = JSON.parse(data)
        if (type === 'banner') {
          console.log('banner', value)
          banner = value
          return
        }
      } catch (e) {
        // return
      }
      var blob = new Blob([data], {type: 'image/jpeg'})
      var URL = window.URL || window.webkitURL
      var img = new Image()
      img.onload = function() {
        // console.log(img.width, img.height)
        canvas.width = img.width
        canvas.height = img.height
        g.drawImage(img, 0, 0)
        img.onload = null
        img.src = BLANK_IMG
        img = null
        u = null
        blob = null
      }
      var u = URL.createObjectURL(blob)
      img.src = u
    }
    
    ws.onopen = function() {
      console.log('onopen', arguments)
      // ws.send('1920x1080/0')
      ws.send(JSON.stringify({
        type: 'sn',
        value: sn
      }))
    }
  }


  var timer
  timer = setInterval(() => {
    if (!isSuccess) {
      error()
      console.log('retry');
      connect()
    } else {
      console.log('')
      clearInterval(timer)
      success(banner)
      timer = null
    }
  }, 1000);
  connect()
}  

export {
  startScrcpy
}
