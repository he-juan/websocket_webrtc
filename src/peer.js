/***
 * 创建peerConnection实例
 * @param type
 * @param config
 * @returns {RTCPeerConnection}
 */
function createPeerConnection(type, config) {
    console.info("create peerConnection of type " + type)
    let pc
    pc = new window.RTCPeerConnection(config)
    pc.isLocalSdpPending = true
    pc.type = type;
    pc.config = config;

    pc.onicecandidate = async function(event) {
        let iceState = pc.iceGatheringState
        console.info('iceGatheringState type: ' + pc.type + ', connectionState: ' + iceState)

        if(iceState === "completed" || iceState === "complete" || (event && !event.candidate)){
            console.warn("onIceCandidate: ICE GATHERING COMPLETED( PC: )");
            onIceGatheringCompleted(pc);
        }

        console.log(`${ pc.type } ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    };

    pc.onsignalingstatechange = function (){
        console.info('signalingState type: ' + pc.type + ', connectionState: ' + pc.signalingState)
    }

    pc.onicegatheringstatechange = function(){
        console.info('iceGatheringState type: ' + pc.type + ', connectionState: ' + pc.iceGatheringState)
    }

    pc.oniceconnectionstatechange = function(){
        console.info("onIceConnectionStateChange this type: " + pc.type + ", iceConnectionState: " + pc.iceConnectionState);
    }

    pc.onconnectionstatechange = function (){
        console.info('onConnectionStateChange type: ' + pc.type + ', connectionState: ' + pc.connectionState)
    }

    subscribeStreamEvents(pc)

    return pc
}

/***
 * pc 上接收到从远端传过来的流时触发
 * @param pc
 */
function subscribeStreamEvents(pc){
    if (isReplaceTrackSupport()) {
        pc.ontrack = function (evt) {
            console.info('__on_add_track')
            onRemoteStreamAdded(evt.streams[0], pc.peerId)

            evt.streams[0].onremovetrack = function (evt) {
                console.info('__on_remove_track')
            }
        }
    } else {
        pc.onaddstream = function (evt) {
            console.info('__on_add_stream')
            onRemoteStreamAdded(evt.stream, pc.peerId)
        }
        pc.onremovestream = function (evt) {
            console.info('__on_remove_stream')
        }
    }
}

/***
 * offer 创建流程
 * @param pc
 * @param iceRestart
 * @returns {Promise<void>}
 */
async function doOffer(pc, iceRestart) {
    console.info("doOffer! ")
    // Added checks to ensure that connection object is defined first
    if (!pc) {
        console.info('RTCSessionDescription offer, Dropping of creating of offer as connection does not exists');
        return;
    }

    // Added checks to ensure that state is "stable" if setting local "offer"
    if (pc.signalingState !== 'stable') {
        console.info("Dropping of creating of offer as signalingState is not "+ pc.signalingState);
        return;
    }
    console.info('Creating offer');

    pc.offerConstraints = {
        offerToReceiveAudio: pc.type === 'audio',
        offerToReceiveVideo: pc.type !== 'audio'
    }

    if(iceRestart){
        pc.offerConstraints.iceRestart = true
    }

    async function onCreateOfferSuccess(desc) {
        // console.log(`Offer from ` + pc.type +` \n${desc.sdp}`);
        console.log('pc1 setLocalDescription start');
        try {
            await pc.setLocalDescription(desc);
            onSetLocalSuccess(pc);
        } catch (error) {
            onSetSessionDescriptionError(error);
        }
    }

    function onCreateSessionDescriptionError(error) {
        console.log(`Failed to create session description: ${error.toString()}`);
    }

    try {
        console.log('pc1 createOffer start');
        const offer = await pc.createOffer(pc.offerConstraints);
        await onCreateOfferSuccess(offer);
    } catch (error) {
        onCreateSessionDescriptionError(error);
    }
}

/***
 * answer 创建流程
 * @param pc
 * @returns {Promise<void>}
 */
async function doAnswer(pc) {
    console.info("doAnswer!")
    // Added checks to ensure that connection object is defined first
    if (!pc) {
        console.info('RTCSessionDescription offer Dropping of creating of answer as connection does not exists');
        return;
    }

    // Added checks to ensure that state is "HAVE_REMOTE_OFFER" if createAnswer
    if (pc.signalingState !== 'have-remote-offer') {
        console.info("Dropping of creating of offer as signalingState is not " + pc.signalingState);
        return;
    }

    async function onCreateAnswerSuccess(desc){
        console.log(`Answer from pc:\n${desc.sdp}`);
        console.log('pc setLocalDescription start');
        try {
            await pc.setLocalDescription(desc);
            onSetLocalSuccess(pc);
        } catch (e) {
            onSetSessionDescriptionError(e);
        }
    }

    console.log('createAnswer start');
    try {
        const answer = await pc.createAnswer();
        await onCreateAnswerSuccess(answer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

function onSetLocalSuccess(pc) {
    console.log(`${ pc.type } setLocalDescription complete`);
    if(pc.iceGatheringState  === "complete"){
        console.info("onSetLocalDescriptionSuccess send invite( PC: " + pc.type + " )");
        onIceGatheringCompleted(pc);
    }
}

function onSetSessionDescriptionError(error) {
    console.error(`Failed to set session description: ${error.toString()}`);
}

function onCreateSessionDescriptionError(error) {
    console.error(`Failed to create session description: ${error.toString()}`);
}

/***
 * ICE 收集完成
 * @param pc
 */
function onIceGatheringCompleted(pc) {
    console.warn("onIceGatheringCompleted ...")
    pc.isLocalSdpPending = false

    if(!pc.isLocalSdpPending){
        console.warn("onIceGatheringCompleted( PC:" + pc.type + ")");
        getLoSuccess();
    }else {
        console.warn("local sdp pending is: ", pc.isLocalSdpPending);
    }
}

/***
 * local sdp 获取成功
 */
function getLoSuccess() {
    let message
    let peerConnectionArray = []

    if(role === 'offer'){
        peerConnectionArray = pcArray
    }else if(role === 'answer'){
        peerConnectionArray = remotePcArray
    }
    for(let i = 0; i < peerConnectionArray.length; i++){
        let pc = peerConnectionArray[i]
        if(pc.isLocalSdpPending === true){
            console.warn("MyOnIceGatheringCompleted not ready( PC: " + pc.peerId + " )");
            return
        }
    }
    console.info("GET_LO_SUCCESS: MyOnIceGatheringCompleted be ready to send INVITE or 200OK");
    let sdp = getLocalSdp()
    console.warn("getLocalSdp combine sdp: \n", sdp)

    if(role === 'offer'){
        console.warn("offer")
        message = {
            createMediaSession: {
                userName: "chrou_test",
                sdp: {
                    length: sdp.length,
                    data: sdp,
                }
            }
        }
    }else if(role === 'answer'){
        console.warn("answer")
        message = {
            createMediaSessionRet: {
                userName: "chrou_test",
                sdp: {
                    length: sdp.length,
                    data: sdp,
                }
            }
        }
    }

    if(sdp){
        ws.send(JSON.stringify(message))
    }else {
        console.warn("no local sdp")
    }
}

/***
 * 获取所有pc整合的sdp
 * @returns {*}
 */
function getLocalSdp(){
    console.info('get local peers combine sdp')
    let sdp
    let sdpArray = [];
    let parseSdp = null
    let peerConnectionArray = []
    if(role === 'offer'){
        peerConnectionArray = pcArray
    }else if(role === 'answer'){
        peerConnectionArray = remotePcArray
    }

    for(let i = 0; i < peerConnectionArray.length; i++){
        let pc = peerConnectionArray[i]
        let subSDP = pc.localDescription.sdp;
        if(pc.type === 'audio'){
            // parseSdp = SDPTools.parseSDP(subSDP)
            // SDPTools.removeCodecByPayload(parseSdp, 0, [103, 104, 105, 106, 110, 112, 113, 126, 13, 0, 8])
            // subSDP = SDPTools.writeSDP(parseSdp)
        }else if(pc.type === 'video1'){
            // parseSdp = SDPTools.parseSDP(subSDP)
            // SDPTools.removeCodecByPayload(parseSdp, 0, [98, 99,127, 121, 125, 107, 108, 109, 124, 120, 123 ,119, 114, 115 ,116])
            // subSDP = SDPTools.writeSDP(parseSdp)
            subSDP = subSDP + 'a=content:main'
        }else if(pc.type === 'video2'){
            // parseSdp = SDPTools.parseSDP(subSDP)
            // SDPTools.removeCodecByPayload(parseSdp, 0, [98, 99,127, 121, 125, 107, 108, 109, 124, 120, 123 ,119, 114, 115 ,116])
            // subSDP = SDPTools.writeSDP(parseSdp)
            subSDP = subSDP + 'a=content:main2'
        }
        else if(pc.type === 'slides'){
            // parseSdp = SDPTools.parseSDP(subSDP)
            // SDPTools.removeCodecByPayload(parseSdp, 0, [98, 99, 127, 121, 125, 107, 108, 109, 124, 120, 123 ,119, 114, 115 ,116])
            // subSDP = SDPTools.writeSDP(parseSdp)
            subSDP = subSDP + 'a=content:slides'
            // let stream = pc.getLocalStreams()
            // if(stream){
            //     subSDP = subSDP.replace(/a=sendrecv/g, "a=sendonly");
            //     subSDP = subSDP.replace(/a=recvonly/g, "a=sendonly");
            // }else {
            //     subSDP = subSDP.replace(/a=sendrecv/g, "a=recvonly");
            // }
        }
        sdpArray.push(subSDP);
    }

    sdp = SDPTools.mergeSDP(sdpArray);

    return sdp
}

/***
 * 根据200 ok的sdp获取每个pc的sdp
 * @param type
 * @param remoteSDP
 */
function getRemoteSDPByType(type, remoteSDP) {
    if(!type || !remoteSDP){
        log.warn('invalid parameters remote sdp or type!');
        return
    }

    let sdpArray = SDPTools.splitSDP(remoteSDP);
    let sdp = null
    for(let i = 0;  i< sdpArray.length; i++) {
        if (type === 'audio' && sdpArray[i].indexOf('m=audio') >= 0) {
            sdp = sdpArray[i]
            break
        } else if (type === 'video1' && sdpArray[i].indexOf('a=content:main') >= 0) {
            sdp = sdpArray[i]
            break
        }else if (type === 'video2' && sdpArray[i].indexOf('a=content:main2') >= 0) {
            sdp = sdpArray[i]
            break
        } else if (type === 'slides' && sdpArray[i].indexOf('a=content:slides') >= 0) {
            sdp = sdpArray[i]
            break
        }
    }

    return sdp
}

function onSetRemoteSuccess(pc) {
    console.log(`${ pc.peerId } setRemoteDescription complete`);
}

/***
 * answer setRemote
 * @param pc
 * @param sdp
 * @returns {Promise<void>}
 */
async function answerSetRemote(pc, sdp) {
    console.warn(pc.peerId + ' setRemoteDescription start');
    console.log("currentPcSdp: \n", sdp)
    let desc = new window.RTCSessionDescription({ type: 'offer', sdp: sdp })
    try {
        await pc.setRemoteDescription(desc);
        onSetRemoteSuccess(pc);
    } catch (error) {
        onSetSessionDescriptionError(error);
    }

    console.log('pc2 createAnswer start');
    try {
        // await doAnswer()
        const answer = await pc.createAnswer();
        await onCreateAnswerSuccess(answer, pc);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

async function onCreateAnswerSuccess(desc, pc) {
    // console.log(`Answer from `+ pc.peerId +` :\n${desc.sdp}`);
    console.log(pc.peerId + ' setLocalDescription start');
    try {
        await pc.setLocalDescription(desc);
        console.warn("这里后续回复自己的200 ok sdp")
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
}

async function offerSetRemote(sdp) {
    console.warn("offer set remote")
    for(let i = 0; i<pcArray.length; i++){
        let pc = pcArray[i]
        let currentPcSdp = getRemoteSDPByType(pc.type, sdp)
        let desc = new window.RTCSessionDescription({ type: 'answer', sdp: currentPcSdp })
        console.log("peerId: ", pc.peerId)
        try {
            await pc.setRemoteDescription(desc);
            console.warn(pc.peerId + " onSetRemoteSuccess success!")
            onSetRemoteSuccess(pc);
        } catch (e) {
            onSetSessionDescriptionError();
        }
    }
}