/**
 * AMD, CommonJS, Global compatible Script Wrapper
 * https://github.com/umdjs/umd
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
        /* istanbul ignore next */
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.WebSocketClient = factory();
    }
}(this, function () {


    function WebSocketClient() {
        WebSocketClient.prototype.isopen = false;
        // 定义保活重连参数
        WebSocketClient.prototype.reconnectAttempt = 0;       // 当前重连次数
        WebSocketClient.prototype.maxReconnectAttempts = 3;   // 最大重连次数
        WebSocketClient.prototype.keepAliveAttempt = 0;       // 当前保活次数
        WebSocketClient.prototype.wsKeepAliveInterval = null;    // 保活定时器

        /***
         * webSocket关闭的错误状态码
         * @type {{}}
         */
        WebSocketClient.prototype.closeEventCode = {
            CLOSE_NORMAL: 1000,         // 正常关闭
            CLOSE_GOING_AWAY: 1001,     // 终端离开, 可能因为服务端错误, 也可能因为浏览器正从打开连接的页面跳转离开.
            CLOSE_PROTOCOL_ERROR: 1002, // 由于协议错误而中断连接.
            CLOSE_UNSUPPORTED: 1003,    // 由于接收到不允许的数据类型而断开连接
            CLOSE_ABNORMAL: 1006,       //  用于期望收到状态码时连接非正常关闭
            UNSUPPORTED_DATA: 1007,     // 由于收到了格式不符的数据而断开连接
            POLICY_VIOLATION: 1008,     // 由于收到不符合约定的数据而断开连接.
            CLOSE_TOO_LARGE: 1009,      // 由于收到过大的数据帧而断开连接.
            MISSING_EXTENSION: 1010,    // 客户端期望服务器商定一个或多个拓展, 但服务器没有处理, 因此客户端断开连接.
            INTERNAL_ERROR: 1011,       // 客户端由于遇到没有预料的情况阻止其完成请求, 因此服务端断开连接
            SERVICE_RESTART: 1012,      // 服务器由于重启而断开连接
            TRY_AGAIN_LATER: 1013,       // 服务器由于临时原因断开连接, 如服务器过载因此断开一部分客户端连接.
        };

        /***
         * 收到的消息类型
         */
        WebSocketClient.prototype.wsOnmessageMethodCode = {
            NONE: { id: -1, name: "NONE" },
            ACK: { id: 0, name: "ACK" },
            BYE: { id: 1, name: "BYE" },
            CANCEL: { id: 2, name: "CANCEL" },
            INVITE: { id: 3, name: "INVITE" },
            OPTIONS: { id: 4, name: "OPTIONS" },
            REGISTER: { id: 5, name: "REGISTER" },
            SUBSCRIBE: { id: 6, name: "SUBSCRIBE" },
            NOTIFY: { id: 7, name: "NOTIFY" },
            REFER: { id: 8, name: "REFER" },
            INFO: { id: 9, name: "INFO" },
            UPDATE: { id: 10, name: "UPDATE" },
            MESSAGE: { id: 11, name: "MESSAGE" },
            PUBLISH: { id: 12, name: "PUBLISH" },
            PRACK: { id: 13, name: "PRACK" }
        };

        this.webSocket = null;
        this.connectUrl = function (url) {
            // 本地服务器
            this.url = url;
            this.webSocket = new WebSocket(url, "sip");

            this.webSocket.onopen = function (event) {
                this.binaryType = 'arraybuffer';
                WebSocketClient.prototype.setConnFlag(true);
                WebSocketClient.prototype.wsOnopenCallback(event);
            };

            this.webSocket.onmessage = function (event) {
                WebSocketClient.prototype.wsOnmessageCallback(event);
            };

            this.webSocket.onclose = function (event) {
                WebSocketClient.prototype.wsOncloseCallback(event);
                WebSocketClient.prototype.unInit();
            };

            this.webSocket.onerror = function (event) {
                WebSocketClient.prototype.wsOnerrorCallback(event);
            };
        };

        /***
         * webSocket 连接打开
         */
        WebSocketClient.prototype.wsOnopenCallback = function (evt) {
            console.log("websocket server is running at " + this.url);
            writeToScreen("<span style='color:#2196F3'>连接成功，现在你可以发送信息啦！！！</span>");

            if(!WebSocketClient.prototype.wsKeepAliveInterval){
                console.log("The connection is successful. Set the 10s keepalive timer.");
                var data = "\r\n\r\n";
                WebSocketClient.prototype.wsKeepAliveInterval = setInterval( function(){ this.sendMessage(data, this);}, 10000 );
            }
        };

        /***
         * 向服务器发送消息
         */
        WebSocketClient.prototype.sendMessage = function (data) {
            if (WebSocketClient.prototype.isWsConnected() && this.webSocket != null) {
                if(data === "\r\n\r\n"){
                    // 发送保活包
                    console.warn("keepalive attempt： ", WebSocketClient.prototype.keepAliveAttempt);
                    switch (WebSocketClient.prototype.keepAliveAttempt) {
                        case 0 :
                            /* 保活次数为0， 即 websokect 连接后第一次发送，5s内没有收到服务器的回复，则以5s频率发送保活包 */
                            WebSocketClient.prototype.wsKeepAliveInterval && clearInterval( WebSocketClient.prototype.wsKeepAliveInterval );
                            WebSocketClient.prototype.wsKeepAliveInterval = setInterval( function(){this.sendMessage(data, this); }, 5000 );
                            this.webSocket.send(data);
                            break;
                        case 1:
                            /* 保活次数为1，2.5s内没有收到服务器回复，则以2.5s 频率发送保活包，同时清除5s定时器和10s定时器 */
                            WebSocketClient.prototype.wsKeepAliveInterval && clearInterval( WebSocketClient.prototype.wsKeepAliveInterval );
                            WebSocketClient.prototype.wsKeepAliveInterval = setInterval( function(){ this.sendMessage(data, this); }, 2500 );
                            this.webSocket.send(data);
                            break;
                        case 2:
                        case 3:
                            /* 保活次数为2~3s，2.5s内没有收到服务器回复，继续以2.5s 频率发送保活包 */
                            this.webSocket.send(data);
                            break;
                        case 4:
                            console.warn("保活失败，重新建立新的连接！");
                            /* webSocket 重发三次不成功即认为失败，断开之前的连接，重新建立新的连接 */
                            WebSocketClient.prototype.wsKeepAliveInterval && clearInterval( WebSocketClient.prototype.wsKeepAliveInterval );
                            WebSocketClient.prototype.wsKeepAliveInterval = null;
                            WebSocketClient.prototype.keepAliveAttempt = 0;

                            WebSocketClient.prototype.isopen = false;
                            this.webSocket.close();
                            WebSocketClient.prototype.reConnection();

                            break;
                        default:
                            break;
                    }
                    WebSocketClient.prototype.keepAliveAttempt++;
                }else {
                    // 发送其他类型的消息，可定义event和type: INVITE  INFO  NOTIFY  MESSAGE
                    // 发送的INVITE和收到的INVITE是否有相应的200 OK/ACK处理，这里做个保存，为了后续的491处理
                    this.webSocket.send( JSON.stringify({
                        "event" : data.event ? data.event : "message",
                        "data" : {
                            "sdp" : data.sdp ? data.sdp : null,
                            "message": data.message ? data.message : null
                        }
                    }));
                }
                return true;
            } else {
                console.log("webSocket is not exist or connected");
                return false;
            }
        };

        /***
         * 收到服务器发送的消息
         */
        WebSocketClient.prototype.wsOnmessageCallback = function (event) {
            console.log("receive message form server!");
            var data = "\r\n\r\n";
            if(event.data === '\r\n'){
                console.log("Receive a keep-alive packet from the server and restore the 10s timer.");
                WebSocketClient.prototype.keepAliveAttempt = 0;
                WebSocketClient.prototype.wsKeepAliveInterval && clearInterval(WebSocketClient.prototype.wsKeepAliveInterval);
                WebSocketClient.prototype.wsKeepAliveInterval = setInterval( function(){ this.sendMessage(data, this);}, 10000 );
            }else {
                // 判断收到的类型，调用相应的回调
                var receiveData = JSON.parse(event.data);
                writeToScreen('<span style="color:blue">服务端回应&nbsp;' + formatDate(new Date()) + '</span><br/><span class="bubble"> ' + `ECHO:` + receiveData.data.message + '</span>');
                // 调用相应回调
                WebSocketClient.prototype.GetRequestType(receiveData.method);
            }
        };

        WebSocketClient.prototype.GetRequestType = function(method) {
            var onmessageMethodCode = WebSocketClient.prototype.wsOnmessageMethodCode;
            if (method) {
                switch (method.toUpperCase()) {
                    case onmessageMethodCode.ACK.name:
                        // ACK CALLBACK
                        break;
                    case onmessageMethodCode.BYE.name:
                        // BYE CALLBACK
                        break;
                    case onmessageMethodCode.CANCEL.name:
                        // CANCEL CALLBACK
                        break;
                    case onmessageMethodCode.INVITE.name:
                        // INVITE CALLBACK
                        break;
                    case onmessageMethodCode.OPTIONS.name:
                        // OPTIONS CALLBACK
                        break;
                    case onmessageMethodCode.REGISTER.name:
                        // REGISTER CALLBACK
                        break;
                    case onmessageMethodCode.SUBSCRIBE.name:
                        // SUBSCRIBE CALLBACK
                        break;
                    case onmessageMethodCode.NOTIFY.name:
                        // NOTIFY CALLBACK
                        break;
                    case onmessageMethodCode.INFO.name:
                        // INFO CALLBACK
                        break;
                    case onmessageMethodCode.UPDATE.name:
                        // UPDATE CALLBACK
                        break;
                    case onmessageMethodCode.MESSAGE.name:
                        // MESSAGE CALLBACK
                        break;
                    case onmessageMethodCode.PUBLISH.name:
                        // PUBLISH CALLBACK
                        break;
                    case onmessageMethodCode.PRACK.name:
                        // PRACK CALLBACK
                        break;
                    default:
                        // OTHER CALLBACK
                        break;
                }
            }else {
                // method is not exist's callback
            }
        };

        /***
         * webSocket 重连
         */
        WebSocketClient.prototype.reConnection = function () {
            if(WebSocketClient.prototype.reconnectAttempt < WebSocketClient.prototype.maxReconnectAttempts){
                ws.connectUrl(wsAddr);
                WebSocketClient.prototype.reconnectAttempt++;
                return true;
            }else {
                console.warn("重连失三次未成功，webSocket重连失败！！");
                writeToScreen("<span style='color:red'>重连失三次未成功，webSocket重连失败！！</span>");
                WebSocketClient.prototype.unInit();
                return false;
            }
        };

        /***
         * 未初始化状态
         */
        WebSocketClient.prototype.unInit = function () {
            WebSocketClient.prototype.isopen = false;
            WebSocketClient.prototype.reconnectAttempt = 0;
            WebSocketClient.prototype.keepAliveAttempt = 0;
            clearInterval(WebSocketClient.prototype.wsKeepAliveInterval);
            WebSocketClient.prototype.wsKeepAliveInterval = null;
            this.webSocket = null;
            return true;
        };

        /***
         * webSocket 是否已连接
         */
        WebSocketClient.prototype.isWsConnected = function (data) {
            return WebSocketClient.prototype.isopen;
        };

        /***
         * 设置是否连接的标志位
         */
        WebSocketClient.prototype.setConnFlag = function (flag) {
            WebSocketClient.prototype.isopen = flag;
        }

        /***
         * 关闭连接
         */
        WebSocketClient.prototype.close = function (error) {
            console.error("WebSocket error: ", error.toString());
            try{
                // 关闭连接的状态号code ,关闭的原因reason
                this.webSocket.close(1000, "normalClosure");
            }catch(e){
                console.error(e.toString());
            }

            WebSocketClient.prototype.isopen = false;
            this.webSocket = null;
            return true;
        };

        /***
         * webSocket 连接关闭
         */
        WebSocketClient.prototype.wsOncloseCallback = function (event) {
            console.log("WebSocket is closed now.");
            WebSocketClient.prototype.getCloseEventCode(event);
            if(this.webSocket && this.webSocket.close){
                this.webSocket.close();
            }
            WebSocketClient.prototype.isopen = false;
            this.webSocket = null;
        };

        /***
         * webSocket 连接错误
         */
        WebSocketClient.prototype.wsOnerrorCallback = function (event) {
            console.error("WebSocket connected error", event);
            writeToScreen('<span style="color: #ddc919;">服务器连接失败，请检查服务器是否开启！</span> ');
        };

        WebSocketClient.prototype.getCloseEventCode = function (event) {
            var code = WebSocketClient.prototype.closeEventCode;
            switch (event.code) {
                case code.CLOSE_NORMAL:
                    writeToScreen("<span style='color:red'>websocket 正常关闭</span>");
                    break;
                case code.CLOSE_GOING_AWAY:
                    writeToScreen("<span style='color:red'>终端离开, 可能因为服务端错误, 也可能因为浏览器正从打开连接的页面跳转离开</span>");
                    break;
                case code.CLOSE_PROTOCOL_ERROR:
                    writeToScreen("<span style='color:red'>由于协议错误而中断连接.</span>");
                    break;
                case code.CLOSE_ABNORMAL:
                    writeToScreen("<span style='color:red'>期望收到状态码时连接非正常关闭</span>");
                    break;
                case code.CLOSE_UNSUPPORTED:
                    writeToScreen("<span style='color:red'>接收到不允许的数据类型而断开连接</span>");
                    break;
                case code.UNSUPPORTED_DATA:
                    writeToScreen("<span style='color:red'>收到了格式不符的数据而断开连接</span>");
                    break;
                case code.POLICY_VIOLATION:
                    writeToScreen("<span style='color:red'>收到不符合约定的数据而断开连接</span>");
                    break;
                case code.CLOSE_TOO_LARGE:
                    writeToScreen("<span style='color:red'>收到过大的数据帧而断开连接!</span>");
                    break;
                case code.MISSING_EXTENSION:
                    writeToScreen("<span style='color:red'>客户端期望服务器商定一个或多个拓展, 但服务器没有处理, 客户端断开连接</span>");
                    break;
                case code.INTERNAL_ERROR:
                    writeToScreen("<span style='color:red'>客户端由于遇到没有预料的情况阻止其完成请求, 因此服务端断开连接</span>");
                    break;
                case code.SERVICE_RESTART:
                    writeToScreen("<span style='color:red'>服务器由于重启而断开连接</span>");
                    break;
                case code.TRY_AGAIN_LATER:
                    writeToScreen("<span style='color:red'>服务器由于临时原因断开连接, 如服务器过载因此断开一部分客户端连接.</span>");
                    break;
                default:
                    writeToScreen("<span style='color:red'>websocket连接已断开, ERROR CODE " + evt.code + "</span>");
                    break;
            }
        }
    }

    /***
     * 连接状态显示
     * @param message
     */
    function writeToScreen(message) {
        var parent = document.getElementById('output');
        var newChild = document.createElement("div");
        newChild.innerHTML = message;
        parent.appendChild(newChild);
    }

    /***
     * 当前时间格式化处理
     */
    function formatDate(now) {
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var date = now.getDate();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        return year + "-" + (month = month < 10 ? ("0" + month) : month) + "-" + (date = date < 10 ? ("0" + date) : date) + " " + (hour = hour < 10 ? ("0" + hour) : hour) + ":" + (minute = minute < 10 ? ("0" + minute) : minute) + ":" + (second = second < 10 ? ("0" + second) : second);
    }

    return WebSocketClient;

}));