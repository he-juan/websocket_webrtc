/***
 * Function that get the version of each browser that uses replaceTrack
 * @returns
 */
function isReplaceTrackSupport() {
    var version = adapter.browserDetails.version
    var result = false

    switch (adapter.browserDetails.browser) {
        case 'chrome':
            result = version >= 72
            break
        case 'opera':
            result = version >= 59
            break
        case 'firefox':
            result = version >= 59
            break
        case 'safari':
            version = adapter.browserDetails.UIVersion
            result = version >= '12.1.1'
            break
        default:
            break
    }
    return result
}

function closeStream(stream) {
    if(!stream){
        return
    }
    try {
        var tracks = stream.getTracks();
        for (var track in tracks) {
            tracks[track].onended = null;
            log.info("close stream");
            tracks[track].stop();
        }
    }
    catch (error) {
        log.info('closeStream: Failed to close stream');
        log.error(error);
    }
}

/***
 * JS 数据类型判断
 * @param data
 * @returns {string}
 */
function typeJudgement(data) {
    let result
    let type = Object.prototype.toString.call(data)
    let endIndex = type.indexOf(']')
    result = type.substring(8, endIndex).toLocaleLowerCase()
    console.log("current match case: ", result)
    return result
}

/***
 * 判断字符串是否为Json
 * @param str
 * @returns {boolean}
 */
function isJsonString(str) {
    try {
        if (typeof JSON.parse(str) == "object") {
            return true;
        }
    } catch(e) {
    }
    return false;
}

/***
 * 页面内内容输出
 * @param message
 */
function writeToScreen(message) {
    let parent = document.getElementById('output');
    let newChild = document.createElement("div");
    newChild.innerHTML = message;
    parent.appendChild(newChild);
}

/***
 * 当前时间格式化处理
 */
function formatDate(now) {
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let hour = now.getHours();
    let minute = now.getMinutes();
    let second = now.getSeconds();
    return year + "-" + (month = month < 10 ? ("0" + month) : month) + "-" + (date = date < 10 ? ("0" + date) : date) + " " + (hour = hour < 10 ? ("0" + hour) : hour) + ":" + (minute = minute < 10 ? ("0" + minute) : minute) + ":" + (second = second < 10 ? ("0" + second) : second);
}