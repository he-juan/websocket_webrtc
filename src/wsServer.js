/** 搭建本地服务器 */

/** 导入WebSocket模块 */
const WebSocket = require('ws');
/** 引用Server类并实例化 */
const server = new WebSocket.Server({
    port: 3000
});

function isJsonString(str) {
    try {
        if (typeof JSON.parse(str) == "object") {
            return true;
        }
    } catch(e) {
    }
    return false;
}


/**  在connection事件中，回调函数会传入一个WebSocket的实例，表示这个WebSocket连接。
 *  对于每个WebSocket连接，我们都要对它绑定某些事件方法来处理不同的事件。
 * 这里，我们通过响应message事件，在收到消息后再返回一个ECHO: xxx的消息给客户端。
 */
server.on('connection', function (ws) {
    console.log("webSocket 已建立连接...");

    // 收到消息
    ws.on('message', function (message) {
        if(message === "\r\n\r\n"){
            // 发送保活包 \r\n
            ws.send("\r\n", (err) => {
                if (err) {
                    console.log(`[SERVER] error: ${err}`);
                }
            });
        }else {
            if(isJsonString(message)){
                console.log("Json data !!!")
                let parseDate = JSON.parse(message)
                if(parseDate.name){
                    // 保存ws名称
                    ws.name = parseDate.name
                }

                if(ws.name && ws.name === 'client'){
                    let sdp
                    if(parseDate.createMediaSession && parseDate.createMediaSession.sdp && parseDate.createMediaSession.sdp.data){
                        console.warn("createMediaSession!")
                        sdp = parseDate.createMediaSession.sdp.data
                        // 处理远端sdp
                        let data = {
                            createMediaSession: {
                                sdp: {
                                    length: sdp.length,
                                    data: sdp,
                                },
                                type: 'doAnswer',
                                userName: "chrou_test",
                            }
                        }

                        console.warn("把invite发送回去，给pc处理")
                        ws.send(JSON.stringify(data), (err) => {
                            if (err) {
                                console.log(`[SERVER] error: ${err}`);
                            }
                        });
                    }else if(parseDate.createMediaSessionRet && parseDate.createMediaSessionRet.sdp && parseDate.createMediaSessionRet.sdp.data){
                        console.warn("answer方回复的200 ok sdp")
                        ws.send(message, (err) => {
                            if (err) {
                                console.log(`[SERVER] error: ${err}`);
                            }
                        });
                    }
                }
                console.warn("ws.name:  ", ws.name)
            }else {
                console.log("[SERVER Received]：", message)
                ws.send(message, (err) => {
                    if (err) {
                        console.log(`[SERVER] error: ${err}`);
                    }
                });
            }
        }
    });

    // 连接关闭
    ws.on('close',function (error) {
        console.warn(error.message)
        console.log('webSocket 已断开连接...');
    })
})

console.log('websocket server is running at http://localhost:3000');
