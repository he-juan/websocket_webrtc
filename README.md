> 本用例使用webSocket实现自己和自己的互通，sdp通过webSocket进行交换

![sdp交换流程.jpg](https://i.loli.net/2019/11/07/hWglbK1jDJi7THG.jpg)

### 运行

> $ cd WFU_ScreenShare      # 进入目录
> $ npm install --save-dev  # 安装依赖
> $ cd WFU_ScreenShare/src
> $ node wsServer.js        # 启动ws服务

访问：
> http://localhost:3000

说明：代码设置端口为3000（可配置）
    
### webSocket 创建

```javascript
function createWebSocket(url, protocols){
    var ws = new WebSocket(url, protocols)

    ws.onopen = function (event) {
        console.warn('websocket onopen')
        ws.send('Hello server!')
    }

    ws.onmessage = function (event) {
       console.warn("onmessage: ", event.data)
    }

    ws.onclose = function (event) {
        log.info('websocket onclose: ', event)
    }

    ws.onerror = function (event) {
        log.error('websocket onerror: ', event)
    }

    return ws
}
```

例如：
```javascript
var  ws = createWebSocket('ws://localhost:3000', 'sip')
```

### 消息发送格式
    
ws 发送格式可以是简单地string、stringify、buffer、blob。例如：

```javascript
 ws.send('I am client, now begin to send message!')

    ws.send(JSON.stringify({'msg': 'test payload message!'}))

    var buffer = new ArrayBuffer(128)
    ws.send(buffer)

    var intview = new Uint32Array(buffer)
    ws.send(intview)

    var blob = new Blob([buffer])
    ws.send(blob)
```

#### WFU 消息发送格式

类型：Json
```javascript
 let test = {
    createMediaSession: {
        userName: "admin",
        sdp: {
            "length": 3,
            "data": "a= ",
        }
    }
}
ws.send(JSON.stringify(test))
```

- userName：SIP层在和多用户建立连接时需要标识是哪个用户，所以每次都需要携带用户名
- sdp: 端口等连接信息，初始入会连接时携带，后续共享桌面通过建立好的端口发流即可


#### 流程说明

client 发送invite，收到200 ok之后，可以发送自己的info信息，也可以不发送

createOffer出来的sdp包含了所以可用PT和其他信息，除了candidate


### FAQ 

1、按照标准，多个m行时，为了区分，主流携带`a=content:main` ，演示流携带`a=content:slides`。目前临时处理为：
    - 主流1： `a=content:main`
    - 主流2： `a=content:main2`
    - 演示流： `a=content:slides`


### 错误处理

1、【error】Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.at WebSocket.ws.sendMessage
    - cause：websocket onopen is not trigger
    
    
2、【error】 Failed to set session description: InvalidStateError: Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': Failed to set remote answer sdp: Called in wrong state: kStable
    - cause: 对端收到invite作为answer setRemoteDescription 时，type为offer，而不是answer。如：
    ```
    let desc = new window.RTCSessionDescription({ type: 'offer', sdp: sdp })
    ```
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    