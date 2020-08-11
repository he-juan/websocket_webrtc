
let remotePcArray = []
let pcArray = []
let ws;
let wsAddr = 'ws://localhost:3000';
let protocols = 'sip';
let role = 'offer'

// window.onload =
function start() {
    ws = createWebSocket(wsAddr, protocols)
    ws.name = "client"
}

function createWebSocket(url, protocols) {
    let ws = new WebSocket(url, protocols)

    ws.onopen = function (event) {
        console.warn('websocket onopen: ', url)
        ws.send(JSON.stringify({'msg': 'Hello server!' + ws.name, name: ws.name}))
        // sendMsg()

        createOfferPC()
    }

    ws.onmessage = function (event) {
        if(isJsonString(event.data)){
            let parseDate = JSON.parse(event.data)
            console.warn("************ parseDate: ", parseDate)
            if(parseDate.createMediaSession && parseDate.createMediaSession.type === 'doAnswer'){
                role = 'answer'
                onAnswerSetRo(parseDate.createMediaSession.sdp.data)
            }else if(parseDate.createMediaSessionRet && parseDate.createMediaSessionRet.sdp && parseDate.createMediaSessionRet.sdp.data){
                role = ''
                offerSetRemote(parseDate.createMediaSessionRet.sdp.data)
            }
        }else {
            let type = typeJudgement(event.data)
            console.warn("event.data: ", event.data)
        }
    }

    ws.onclose = function (event) {
        log.info('websocket onclose: ', event)
    }

    ws.onerror = function (event) {
        log.error('websocket onerror: ', event)
    }

    return ws
}


var presentStream = null
async function getPresentStream(){
    let constraints = {
        audio: false,
        video: {
            width: { max: 1920, },
            height: { max: 1080,},
            frameRate: { max: 15,}
        }
    };

    if('getDisplayMedia' in window.navigator){
        presentStream = await navigator.getDisplayMedia(constraints)
    }else if('getDisplayMedia' in window.navigator.mediaDevices){
        presentStream = await navigator.mediaDevices.getDisplayMedia(constraints)
    }else {
        log.warn("The browser does not support the getDisplayMedia interface.");
    }
}

/***
 * 创建PC
 */
async function createOfferPC() {
    let stream
    let config = {}
    let pcTypeList = ['audio', 'video1', 'video2', 'slides']
    for(let i = 0; i < pcTypeList.length; i++){
        let pc = createPeerConnection(pcTypeList[i], config)
        pc.peerId = 'local' + pcTypeList[i]
        pcArray.push(pc)
        if(pcTypeList[i] === 'audio'){
            stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false})
            console.warn(pcTypeList[i] + " add stream: ", stream.id)

            onRemoteStreamAdded(stream, pc.peerId)
            pc.addStream(stream)
        }else if(pcTypeList[i] === 'video1'){
            stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {width: 640, height: 360}})
            console.warn(pcTypeList[i] + " add stream: ", stream.id)

            onRemoteStreamAdded(stream, pc.peerId)
            pc.addStream(stream)
        }else if(pcTypeList[i] === 'video2'){
            stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {width: 1280, height: 720}})
            console.warn(pcTypeList[i] + " add stream: ", stream.id)

            onRemoteStreamAdded(stream, pc.peerId)
            pc.addStream(stream)
        }else
        if(pcTypeList[i] === 'slides'){
            // let constraints = {
            //     audio: false,
            //     video: {
            //         width: { max: 1920, },
            //         height: { max: 1080,},
            //         frameRate: { max: 15,}
            //     }
            // };
            //
            // if('getDisplayMedia' in window.navigator){
            //     stream = await navigator.getDisplayMedia(constraints)
            // }else if('getDisplayMedia' in window.navigator.mediaDevices){
            //     stream = await navigator.mediaDevices.getDisplayMedia(constraints)
            // }else {
            //     log.warn("The browser does not support the getDisplayMedia interface.");
            // }
            if(presentStream){
                stream = presentStream
            }

            if(stream){
                console.warn(pcTypeList[i] + " add stream: ", stream.id)
                onRemoteStreamAdded(stream, pc.peerId)
                pc.addStream(stream)
            }
        }

        await doOffer(pc, false)
    }

    for(let i = 0; i < pcTypeList.length; i++){
        let remotepc = createPeerConnection(pcTypeList[i], config)
        remotepc.peerId = 'remote' + pcTypeList[i]
        remotePcArray.push(remotepc)
    }
}

/***
 * ANSWER setremote
 * @param sdp
 * @returns {Promise<void>}
 */
async function onAnswerSetRo(sdp) {
    let pcTypeList = ['audio', 'video1', 'video2', 'slides']
    for(let i = 0; i < pcTypeList.length; i++){
        let pc = remotePcArray[i]
        let currentPcSdp = getRemoteSDPByType(pcTypeList[i], sdp)
        answerSetRemote(pc, currentPcSdp)
    }
}

function hangup() {
    console.log('Ending call');
    for(let i = 0; i<pcArray.length; i++){
        let pc = pcArray[i]
        let stream = pc.getLocalStreams()
        if(stream){
            closeStream(stream[0])
        }
        pc.close()
        pc = null
    }

    for(let j = 0; j<remotePcArray.length; j++){
        let pc = remotePcArray[j]
        let stream = pc.getLocalStreams()
        if(stream){
            closeStream(stream[0])
        }
        pc.close()
        pc = null
    }

    pcArray.length = 0
    remotePcArray.length = 0
}

/***
 * 添加流到video/audio标签
 * @param stream
 * @param peerId
 */
function onRemoteStreamAdded(stream, peerId){
    console.log(peerId + " onRemoteStreamAdded: ", stream.id)
    var target = null;
    switch (peerId) {
        case 'remoteaudio':
            target = document.getElementById('remoteAudio')
            break;
        case 'remotevideo1':
            target = document.getElementById('remoteVideo1')
            break;
        case 'remotevideo2':
            target = document.getElementById('remoteVideo2')
            break;
        case 'remoteslides':
            target = document.getElementById('remotePresent')
            break;
        case 'localaudio':
            target = document.getElementById('localAudio')
            break;
        case 'localvideo1':
            target = document.getElementById('localVideo1')
            break;
        case 'localvideo2':
            target = document.getElementById('localVideo2')
            break;
        case 'localslides':
            target = document.getElementById('localPresent')
            break;
        default:
            break;
    }

    if ( target.srcObject !== stream ) {
        target.srcObject = stream;
        console.warn(peerId + ' received remote ' + peerId +' stream');
    }
}

/***
 * 发送ws消息
 */
function sendMsg() {
    ws.send('I am client, now begin to send message!')

    ws.send(JSON.stringify({'msg': 'test payload message!'}))

    let buffer = new ArrayBuffer(128)
    ws.send(buffer)

    let intview = new Uint32Array(buffer)
    ws.send(intview)

    let blob = new Blob([buffer])
    ws.send(blob)

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
}
