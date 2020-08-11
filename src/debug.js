
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.debug = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){},{

}],2:[function(require,module,exports){
/* global window, exports, define */
    !function() {
            'use strict';

            var re = {
                not_string: /[^s]/,
                not_bool: /[^t]/,
                not_type: /[^T]/,
                not_primitive: /[^v]/,
                number: /[diefg]/,
                numeric_arg: /[bcdiefguxX]/,
                json: /[j]/,
                not_json: /[^j]/,
                text: /^[^\x25]+/,
                modulo: /^\x25{2}/,
                placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,
                key: /^([a-z_][a-z_\d]*)/i,
                key_access: /^\.([a-z_][a-z_\d]*)/i,
                index_access: /^\[(\d+)\]/,
                sign: /^[\+\-]/
            }

            function sprintf(key) {
                // `arguments` is not an array, but should be fine for this call
                return sprintf_format(sprintf_parse(key), arguments)
            }

            function vsprintf(fmt, argv) {
                return sprintf.apply(null, [fmt].concat(argv || []))
            }

            function sprintf_format(parse_tree, argv) {
                var cursor = 1, tree_length = parse_tree.length, arg, output = '', i, k, match, pad, pad_character, pad_length, is_positive, sign
                for (i = 0; i < tree_length; i++) {
                    if (typeof parse_tree[i] === 'string') {
                        output += parse_tree[i]
                    }
                    else if (Array.isArray(parse_tree[i])) {
                        match = parse_tree[i] // convenience purposes only
                        if (match[2]) { // keyword argument
                            arg = argv[cursor]
                            for (k = 0; k < match[2].length; k++) {
                                if (!arg.hasOwnProperty(match[2][k])) {
                                    throw new Error(sprintf('[sprintf] property "%s" does not exist', match[2][k]))
                                }
                                arg = arg[match[2][k]]
                            }
                        }
                        else if (match[1]) { // positional argument (explicit)
                            arg = argv[match[1]]
                        }
                        else { // positional argument (implicit)
                            arg = argv[cursor++]
                        }

                        if (re.not_type.test(match[8]) && re.not_primitive.test(match[8]) && arg instanceof Function) {
                            arg = arg()
                        }

                        if (re.numeric_arg.test(match[8]) && (typeof arg !== 'number' && isNaN(arg))) {
                            throw new TypeError(sprintf('[sprintf] expecting number but found %T', arg))
                        }

                        if (re.number.test(match[8])) {
                            is_positive = arg >= 0
                        }

                        switch (match[8]) {
                            case 'b':
                                arg = parseInt(arg, 10).toString(2)
                                break
                            case 'c':
                                arg = String.fromCharCode(parseInt(arg, 10))
                                break
                            case 'd':
                            case 'i':
                                arg = parseInt(arg, 10)
                                break
                            case 'j':
                                arg = JSON.stringify(arg, null, match[6] ? parseInt(match[6]) : 0)
                                break
                            case 'e':
                                arg = match[7] ? parseFloat(arg).toExponential(match[7]) : parseFloat(arg).toExponential()
                                break
                            case 'f':
                                arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg)
                                break
                            case 'g':
                                arg = match[7] ? String(Number(arg.toPrecision(match[7]))) : parseFloat(arg)
                                break
                            case 'o':
                                arg = (parseInt(arg, 10) >>> 0).toString(8)
                                break
                            case 's':
                                arg = String(arg)
                                arg = (match[7] ? arg.substring(0, match[7]) : arg)
                                break
                            case 't':
                                arg = String(!!arg)
                                arg = (match[7] ? arg.substring(0, match[7]) : arg)
                                break
                            case 'T':
                                arg = Object.prototype.toString.call(arg).slice(8, -1).toLowerCase()
                                arg = (match[7] ? arg.substring(0, match[7]) : arg)
                                break
                            case 'u':
                                arg = parseInt(arg, 10) >>> 0
                                break
                            case 'v':
                                arg = arg.valueOf()
                                arg = (match[7] ? arg.substring(0, match[7]) : arg)
                                break
                            case 'x':
                                arg = (parseInt(arg, 10) >>> 0).toString(16)
                                break
                            case 'X':
                                arg = (parseInt(arg, 10) >>> 0).toString(16).toUpperCase()
                                break
                        }
                        if (re.json.test(match[8])) {
                            output += arg
                        }
                        else {
                            if (re.number.test(match[8]) && (!is_positive || match[3])) {
                                sign = is_positive ? '+' : '-'
                                arg = arg.toString().replace(re.sign, '')
                            }
                            else {
                                sign = ''
                            }
                            pad_character = match[4] ? match[4] === '0' ? '0' : match[4].charAt(1) : ' '
                            pad_length = match[6] - (sign + arg).length
                            pad = match[6] ? (pad_length > 0 ? pad_character.repeat(pad_length) : '') : ''
                            output += match[5] ? sign + arg + pad : (pad_character === '0' ? sign + pad + arg : pad + sign + arg)
                        }
                    }
                }
                return output
            }

            var sprintf_cache = Object.create(null)

            function sprintf_parse(fmt) {
                if (sprintf_cache[fmt]) {
                    return sprintf_cache[fmt]
                }

                var _fmt = fmt, match, parse_tree = [], arg_names = 0
                while (_fmt) {
                    if ((match = re.text.exec(_fmt)) !== null) {
                        parse_tree.push(match[0])
                    }
                    else if ((match = re.modulo.exec(_fmt)) !== null) {
                        parse_tree.push('%')
                    }
                    else if ((match = re.placeholder.exec(_fmt)) !== null) {
                        if (match[2]) {
                            arg_names |= 1
                            var field_list = [], replacement_field = match[2], field_match = []
                            if ((field_match = re.key.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1])
                                while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                                    if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                                        field_list.push(field_match[1])
                                    }
                                    else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                                        field_list.push(field_match[1])
                                    }
                                    else {
                                        throw new SyntaxError('[sprintf] failed to parse named argument key')
                                    }
                                }
                            }
                            else {
                                throw new SyntaxError('[sprintf] failed to parse named argument key')
                            }
                            match[2] = field_list
                        }
                        else {
                            arg_names |= 2
                        }
                        if (arg_names === 3) {
                            throw new Error('[sprintf] mixing positional and named placeholders is not (yet) supported')
                        }
                        parse_tree.push(match)
                    }
                    else {
                        throw new SyntaxError('[sprintf] unexpected placeholder')
                    }
                    _fmt = _fmt.substring(match[0].length)
                }
                return sprintf_cache[fmt] = parse_tree
            }

            /**
             * export to either browser or node.js
             */
            /* eslint-disable quote-props */
            if (typeof exports !== 'undefined') {
                exports['sprintf'] = sprintf
                exports['vsprintf'] = vsprintf
            }
            if (typeof window !== 'undefined') {
                window['sprintf'] = sprintf
                window['vsprintf'] = vsprintf

                if (typeof define === 'function' && define['amd']) {
                    define(function() {
                        return {
                            'sprintf': sprintf,
                            'vsprintf': vsprintf
                        }
                    })
                }
            }
            /* eslint-enable quote-props */
        }()
},{}],3:[function(require,module,exports){
var sprintf = require("sprintf-js").sprintf;

var argsToString = function(args) {
            //sprintf-js did not support %o / %O
            args[0] = args[0].replace(/%o/g, "%s");

            switch (args.length) {
                case 1:
                    return args[0];
                case 2:
                    return sprintf(args[0], args[1]);
                case 3:
                    return sprintf(args[0], args[1], args[2]);
                case 4:
                    return sprintf(args[0], args[1], args[2], args[3]);
                case 5:
                    return sprintf(args[0], args[1], args[2], args[3], args[4]);
                case 6:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5]);
                case 7:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
                case 8:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
                case 9:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
                case 10:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
                case 11:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10]);
                case 12:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11]);
                case 13:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12]);
                case 14:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13]);
                case 15:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14]);
                case 16:
                    return sprintf(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14], args[15]);
                default:
                    return null;
            }
        };


function beautyDate(date) {
    var yyyy = date.getFullYear();
    var m = date.getMonth() + 1; // getMonth() is zero-based
    var d = date.getDate();
    var h = date.getHours();
    var mi = date.getMinutes();
    var sec = date.getSeconds();
    var msec = date.getMilliseconds();

    var mm  = m < 10 ? "0" + m : m;
    var dd  = d < 10 ? "0" + d : d;
    var hh  = h < 10 ? "0" + h : h;
    var min = mi < 10 ? "0" + mi : mi;
    var ss  = sec < 10 ? "0" + sec : sec;
    var mss = msec < 10 ? "00" + msec : ( msec < 100 ? "0" + msec : msec );

    return "".concat(yyyy).concat("-").concat(mm).concat("-").concat(dd).concat("@").concat(hh).concat(":").concat(min).concat(":").concat(ss).concat(".").concat(mss);
};

//For catch browser console error events
self.onerror = function(msg, url, lineNo, columnNo, error) {
    var message = [
        'Message: ' + msg,
        'URL: ' + url,
        'Line: ' + lineNo,
        'Column: ' + columnNo,
        'Error object: ' + JSON.stringify(error)
    ].join('\n');

    this.debug('Console:ERROR')(message);
    return false;
};

/***
 * indexedDB Class Model
 * @type {self.DBmanager}
 */
self.DBmanager = class DBmanager {
    constructor(dbName, storeName, version, index) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = version || 1;
        this.index = index;
        this.currentDB = null;
    }

    /***
     * create database
     */
    openDB() {
        var request = self.indexedDB.open(this.dbName, this.version);
        request.onerror = function (e) {
            console.log(e.currentTarget.error.message);
        }.bind(this);

        request.onsuccess = function (e) {
            this.currentDB = e.target.result;
            console.log(this.currentDB.name + ' database is already opened!');
        }.bind(this);

        request.onupgradeneeded = function (e) {
            console.log('database version is already upgrade to ' + this.version);
            this.currentDB = e.target.result;
            if (!this.currentDB.objectStoreNames.contains(this.storeName)) {
                var objectStore = this.currentDB.createObjectStore(this.storeName, {keyPath: "id", autoIncrement: true});

                // create index
                if(this.index && this.index.length > 0){
                    this.index.forEach(function (item) {
                        objectStore.createIndex(item, item);
                    })
                }
            }
        }.bind(this);
    }

    /***
     * get store by storeName
     * @returns {IDBObjectStore}
     */
    getStoreByName() {
        return this.currentDB.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
    }

    /***
     * add one data
     * data should be an object
     * @param data
     */
    setItem(data) {
        var store = this.getStoreByName(this.storeName);
        store.add(data);

        store.onsuccess = function (event) {
            console.log('Data write succeeded');
        };

        store.onerror = function (event) {
            console.log('Data write failed');
        }
    }

    /***
     * add more than one data
     * data should be array
     * @param items
     */
    setItems(items){
        var store = this.getStoreByName(this.storeName);
        for(var i = 0; i < items.length; i++){
            store.put(items[i]);
        }
    }

    /***
     * Get a piece of data by key value
     * @param key  Index name
     * @param value
     */
    getItem (key, value) {
        var store = this.getStoreByName(this.storeName);
        var index = store.index(key);
        var request = index.get(value);

        request.onsuccess = function( e) {
            if ( request.result) {
                console.log(request.result);
            } else {
                console.log('未获得数据记录');
            }
        };
    }

    /***
     * get all items
     */
    getAllItems() {
        var store = this.getStoreByName(this.storeName);
        var request = store.openCursor();

        request.onsuccess = function (event) {
            var cursor = event.target.result;

            if (cursor) {
                console.log(cursor.value);
                cursor.continue();
            } else {
                console.log('没有更多数据了！');
            }
        };
    }

    /***
     * update data
     * @param newItem
     */
    update(newItem) {
        var store = this.getStoreByName(this.storeName);
        store.put(newItem);

        store.onsuccess = function (event) {
            console.log('data update success');
        };

        store.onerror = function (event) {
            console.log('data update failed');
        }
    }

    clear () {
        var store = this.getStoreByName(this.storeName);
        var request = store.clear();

        request.onsuccess = function (event) {
            console.log('clear Success');
        };
        request.onerror = function (event) {
            console.log('clear Error');
        };
    }
};


/**
 * This is the common logic for both the Node.js and web browser implementations of `debug()`.
 */
module.exports = function setup(env) {
    createDebug.debug = createDebug['default'] = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.sessionStorageSave = sessionStorageSave();
    createDebug.enabledLocalLog = enabledLocalLog;
    createDebug.enableLocalLog = enableLocalLog;
    createDebug.disableLocalLog = disableLocalLog;
    createDebug.getLocalLogs = getLocalLogs;
    createDebug.getLocalDBName = getLocalDBName;
    createDebug.exportLog = exportLog;

    //The currently state of Local Log.
    createDebug.localLogState = true;
    createDebug.createdDBList = false; //marked the DB List is saved.
    createDebug.logBuffer = [];

    // Function is converted to a function under createDebug, eg useColors、formatArgs ect.
    Object.keys(env).forEach(function(key) {
        createDebug[key] = env[key];
    });

    // create dataBase
    createDebug.dataBaseListDB = new self.DBmanager('DatabaseLists', "keyvaluepairs", 1, ["dbName", "TS"]);
    createDebug.localLogsDB = new self.DBmanager(env.sessionStorage.dbName, "localLogs", 1, ["cseqNumber", "moduleName", "logLevel", "TS", "content"]);
    createDebug.dataBaseListDB.openDB();
    createDebug.localLogsDB.openDB();


   // Active `debug` instances.
    createDebug.instances = [ ];
    // The currently active debug mode names, and names to skip.
    createDebug.names = [ ];
    createDebug.skips = [ ];


     // Map of special "%n" handling functions, for the debug "format" argument.
     // Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
    createDebug.formatters = { };

    /**
     * Select a color.
     * @param {String} namespace
     * @return {Number}
     * @api private
     */
    function selectColor(namespace) {
        var hash = 0, i;

        for (i in namespace) {
            hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }

        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;

    /**
     * Select a background color.
     * @param {String} namespace
     * @return {Number}
     * @api private
     */

    function selectBGColor(namespace) {
        var hash = 0, i;

        var level = namespace.match(/:(\w+)/)[1];
        switch (level) {
        case 'DEBUG':
            i = 0;
            break;
        case 'LOG':
            i = 1;
            break;
        case 'INFO':
            i = 2;
            break;
        case 'WARN':
            i = 3;
            break;
        case 'ERROR':
            i = 4;
            break;
        case 'FATAL':
            i = 5;
            break;
        default:
            i = 2;
            break;
        }

        return createDebug.bgColors[i];
    }
    createDebug.selectBGColor = selectBGColor;

    function destroy() {
        var index = createDebug.instances.indexOf(this);
        if (index !== -1) {
            createDebug.instances.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Enables a debug mode by namespaces. This can include modes
     * separated by a colon and wildcards.
     *
     * @param {String} namespaces
     * @api public
     */
    function enable(namespaces) {
        createDebug.save(namespaces);

        createDebug.names = [ ];
        createDebug.skips = [ ];

        var i;
        var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
        var len = split.length;

        for (i = 0; i < len; i++) {
            if (!split[i]) continue; // ignore empty strings
            namespaces = split[i].replace(/\*/g, '.*?');
            if (namespaces[0] === '-') {
                createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
            } else {
                createDebug.names.push(new RegExp('^' + namespaces + '$'));
            }
        }

        for (i = 0; i < createDebug.instances.length; i++) {
            var instance = createDebug.instances[i];
            instance.enabled = createDebug.enabled(instance.namespace);
        }
    }

    /**
     * Disable debug output.
     *
     * @api public
     */

    function disable() {
        createDebug.enable('');
    }

    /**
     * Returns true if the given mode name is enabled, false otherwise.
     *
     * @param {String} name
     * @return {Boolean}
     * @api public
     */

    function enabled(name) {
        if (name[name.length - 1] === '*') {
            return true;
        }
        var i, len;
        for (i = 0, len = createDebug.skips.length; i < len; i++) {
            if (createDebug.skips[i].test(name)) {
                return false;
            }
        }
        for (i = 0, len = createDebug.names.length; i < len; i++) {
            if (createDebug.names[i].test(name)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create a debugger with the given `namespace`.
     * @param {String} namespace
     * @return {Function}
     * @api public
     */
    function createDebug(namespace) {
        //var prevTime;
        function debug() {

            var date = new Date();
            // turn the `arguments` into a proper Array
            var args = new Array(arguments.length);
            for (var i = 0; i < args.length; i++) {
                args[i] = arguments[i];
            }
            args[0] = createDebug.coerce(args[0]);

            if ('string' !== typeof args[0]) {
                // anything else let's inspect with %O
                args.unshift('%O');
            }

            if (createDebug.localLogState === true) {
                //Save log into localforage whatever debug is disabled or not.
                var logTime = beautyDate(date);
                var logList = {
                    cseqNumber: createDebug.logIndex,
                    moduleName: namespace.split(":")[0],
                    logLevel: namespace.split(":")[1],
                    TS: (new Date()).getTime(),
                    content: argsToString(args)
                }

                createDebug.logBuffer.push(logList);

                // To avoid writing too often, write data to the database for every 20 data.
                if (createDebug.logBuffer.length >= 20) {
                    createDebug.localLogsDB.setItems(createDebug.logBuffer);
                    createDebug.logBuffer = [ ];

                    // save the databaseName into DatabaseLists database if not exist
                    if (!createDebug.createdDBList) {
                        var key = env.sessionStorage.dbName;
                        var store = createDebug.dataBaseListDB.getStoreByName();
                        var request = store.index('dbName').get(key);
                        var infoJson = {};

                        request.onsuccess = function( e) {
                            if ( !request.result) {
                                infoJson = {
                                    TS: [ (new Date()).getTime() ],
                                    dbName: env.sessionStorage.dbName,
                                    data: {
                                        confID: env.sessionStorage.confID,
                                        userName: self.localStorage.userName,
                                        email: self.localStorage.email
                                    }
                                };
                            } else {
                                infoJson = request.result;
                                var ts = request.result.TS;
                                if (ts) {
                                    infoJson.TS.push((new Date()).getTime());
                                }
                            }
                            createDebug.dataBaseListDB.update(infoJson);
                            createDebug.createdDBList = true;
                        };
                    }
                }
                createDebug.logIndex++;

                self.logIndex = createDebug.logIndex;
                self.sessionStorage.dbIndex = self.logIndex;
            }

            // apply env-specific formatting (colors, etc.)
            if (debug.enabled){
            createDebug.logFormatters(args, debug)
            }
        }

        debug.namespace = namespace;
        debug.enabled = createDebug.enabled(namespace);
        debug.useColors = createDebug.useColors();
        debug.color = selectColor(namespace);
        debug.bgColor = selectBGColor(namespace);
        debug.destroy = destroy;

        // env-specific initialization logic for debug instances
        if ('function' === typeof createDebug.init) {
            createDebug.init(debug);
        }

        createDebug.instances.push(debug);
        return debug;
    }

    /**
     * Log formatted output, add color, etc.
     * @param args
     * @param debug
     */
    function logFormatters(args, debug) {
        var self = debug;
        var index = 0;

        args[0] = args[0].replace(/%[a-zA-Z%]/g,function(match, format) {
            // if we encounter an escaped % then don't increase the array index
            if (match === '%%') return match;
            index++;
            var formatter = createDebug.formatters[format];
            if ('function' === typeof formatter) {
                var val = args[index];
                match = formatter.call(self, val);

                // now we need to remove `args[index]` since it's inlined in the `format`
                args.splice(index, 1);
                index--;
            }
            return match;
        });

        // apply env-specific formatting (colors, etc.)
        createDebug.formatArgs.call(self, args);

        var logFn = self.log || createDebug.log;
        logFn.apply(self, args);
    }
    createDebug.logFormatters = logFormatters;

    /***
     * 本地会话存储
     */
    function sessionStorageSave() {
        var tabID = (env.sessionStorage.tabID && env.sessionStorage.closedLastTab !== '2') ? env.sessionStorage.tabID : (env.sessionStorage.tabID = Math.random().toString(36).substr(2));

        env.sessionStorage.closedLastTab = '2';
        self.onunload = self.onbeforeunload = function() {
            env.sessionStorage.closedLastTab = '1';
        };

        if (!env.sessionStorage.dbName || !env.sessionStorage.dbName.match(tabID) ) {
            console.log("Create dbName !!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            // env.sessionStorage.setItem("dbName", "db_" + tabID);
            env.sessionStorage.setItem("dbName", tabID + "_db");
            env.sessionStorage.setItem("dbIndex", "0");
        }

        if (!env.sessionStorage.dbIndex) {
            createDebug.logIndex = 0;
        } else {
            createDebug.logIndex = env.sessionStorage.dbIndex;
        }
        self.logIndex = createDebug.logIndex;
    }

    /**
   * Enable LocalLog
   *
   * @api public
   */
    function enableLocalLog() {
        createDebug.saveLocalLogState(true);
        createDebug.localLogState = true;
    }

    /**
     * Disable LocalLog.
     *
     * @api public
     */

    function disableLocalLog() {
        createDebug.saveLocalLogState(false);
        createDebug.localLogState = false;
    }

    /**
     * Returns true if the LocalLog is enabled, false otherwise.
     *
     * @return {Boolean}
     * @api public
     */

    function enabledLocalLog() {
        return createDebug.localLogState;
    }

    /**
     * Get the local log
     *
     * @param dbName
     * @param {String} filter  {String} dbName (null means current
     *        DB) {function} callback(logs)
     * @param callback
     * @return {Array} logs self.logs =
     *         self.logs.filter(function(x){return (x !==
     *         (undefined || null || ''));});
     * @api public
     */

    function getLocalLogs(dbName, filter, callback) {
        var localLogs = [];
        var skips = [ ];
        var names = [ ];
        var db;

        function enabled(name, skips, names) {
            if (name[name.length - 1] === '*') {
                return true;
            }
            var i, len;

            for (i = 0, len = skips.length; i < len; i++) {
                if (skips[i].test(name)) {
                    return false;
                }
            }

            for (i = 0, len = names.length; i < len; i++) {
                if (names[i].test(name)) {
                    return true;
                }
            }
            return false;
        }

        if (dbName && dbName !== createDebug.sessionStorage.dbName) {
            db = new self.DBmanager(dbName, "localLogs", 1, ["cseqNumber", "moduleName", "logLevel", "TS", "content"]);
        } else {
            db = createDebug.localLogsDB;
        }
        db.openDB();

        if (filter !== '*') {
            //Process filter
            var i = 0;
            var split = (typeof filter === 'string' ? filter : '').split(/[\s,]+/);
            var len = split.length;

            for (i = 0; i < len; i++) {
                if (!split[i]) continue; // ignore empty strings
                filter = split[i].replace(/\*/g, '.*?');
                if (filter[0] === '-') {
                    skips.push(new RegExp('^' + filter.substr(1) + '$'));
                } else {
                    names.push(new RegExp('^' + filter + '$'));
                }
            }

            //Filter all keys
            db.keys().then(function(keys) {
                    for (var i = 0; i < keys.length; i++) {

                        //Remove the logIndex first "index-REALKEY"
                        var index = parseInt(keys[i]);
                        var key = keys[i].substr(index.toString().length + 1);

                        if (enabled(key, skips, names)) {
                            db.getItem(keys[i]).then(function(log) {
                                    var index = parseInt(log);
                                    localLogs[index] = '[' + index + ']' + log.substr(index.toString().length) + "\r\n";
                                }).catch(function(err) {})
                        }
                    }
                }).catch(function(err) {});

        } else {
            var request = self.indexedDB.open(db.dbName);

            request.onsuccess = function (e) {
                var transaction = db.currentDB.transaction(db.storeName, 'readwrite');
                var store = transaction.objectStore(db.storeName);

                store.openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;

                    if (cursor) {
                        var string =  JSON.stringify(cursor.value);
                        var cseqNumber  = cursor.value.cseqNumber;
                        localLogs[cseqNumber] = '[' + cseqNumber + ']' + string + "\r\n";
                        cursor.continue();
                    } else {
                        callback(localLogs);
                    }
                };
            }
        }
    }

    /**
     * Get all Database name list
     * @api public
     */

    function getLocalDBName(callback) {
        var localDBs = [];
        var request = self.indexedDB.open(createDebug.dataBaseListDB.dbName);

        request.onsuccess = function (e) {
            var dbName = createDebug.dataBaseListDB.storeName;
            var transaction = createDebug.dataBaseListDB.currentDB.transaction(dbName, 'readwrite');
            var objectStore = transaction.objectStore(dbName);
            objectStore.openCursor().onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor) {
                    localDBs.push(cursor.value);
                    cursor.continue();
                } else {
                    console.log('no more data!');
                    callback(localDBs);
                }
            };
            objectStore.openCursor().onerror = function (error) {
                console.error(error)
            }
        }.bind(this);

        request.onerror = function (e) {
            console.log(e.currentTarget.error.message);
        }.bind(this);
    }

    /**
     * Update the sipID and confSEQ in dbInformation in database
     * "DatabaseList" .
     * info should be { sipID: XXX, confSEQ: xxx, userName: aaa,
     * email: bbb }
     *
     */
    function updateConfInfo(confInfo) {
        try {
            var store = createDebug.dataBaseListDB.getStoreByName(createDebug.sessionStorage.dbName);
            var index = store.index("dbName");
            var request = index.get(createDebug.sessionStorage.dbName);
            var infoJson;

            request.onsuccess = function( e) {
                if ( request.result) {
                    if (request.result != null && request.result !== "[object Object]") { //Todo: figure out why info is [object Object], when dbName is not exisit.
                        infoJson = request.result;
                        infoJson.data.confID = createDebug.sessionStorage.confID;
                    } else {
                        infoJson = {
                            TS: [ (new Date()).getTime() ],
                            dbName: createDebug.sessionStorage.dbName,
                            data: {
                                confID: createDebug.sessionStorage.confID,
                                userName: self.localStorage.userName,
                                email: self.localStorage.email
                            }
                        };
                    }

                    if (confInfo.sipID) {
                        if (!infoJson.sipID) {
                            infoJson.data.sipID = [ ];
                        }
                        infoJson.data.sipID.push(confInfo.sipID);
                    }

                    if (confInfo.confSEQ) {
                        if (!infoJson.data.confSEQ) {
                            infoJson.data.confSEQ = [ ];
                        }
                        infoJson.data.confSEQ.push(confInfo.confSEQ);
                    }

                    if (confInfo.userName) {
                        infoJson.data.userName = confInfo.userName;
                    }

                    if (confInfo.email) {
                        infoJson.data.email = confInfo.email;
                    }

                    if (confInfo.confTitle) {
                        infoJson.data.confTitle = confInfo.confTitle;
                    }

                    createDebug.dataBaseListDB.update(infoJson);
                    createDebug.createdDBList = true;
                }
            };
        } catch (e) {}
    }
    createDebug.updateConfInfo = updateConfInfo;

    /**
     * Flush buffer into DB
     *将缓冲区刷新到database里
     */
    function flushLogBuffer() {
        try {
            if (createDebug.logBuffer.length > 0) {
                createDebug.logBuffer.push( createDebug.logBuffer);
                createDebug.logBuffer = [ ];
            }

        } catch (e) {}
    }
    createDebug.flushLogBuffer = flushLogBuffer;

    /**
     * Coerce `val`.
     *
     * @param {Mixed} val
     * @return {Mixed}
     * @api private
     */

    function coerce(val) {
        if (val instanceof Error) return val.stack || val.message;
        return val;
    }

    /**
     * Export the local log
     * 导出日志文件
     * @api public
     */

    function exportLog() {

        var fileName = 'meetingLog.txt';

        debug.getLocalLogs(null, "*",
           function(logs) {
               if ( navigator.userAgent.match('(rv:11.0|Edge)') ) {
                   /*IE 11 or Edge*/

                   var log_file;
                   try {
                       log_file = new Blob(logs, { type: 'text/plain' });
                   } catch (e) {
                       // Old browser, need to use blob builder
                       self.BlobBuilder = self.BlobBuilder || self.MSBlobBuilder;
                       if (self.BlobBuilder) {
                           var tmp = new BlobBuilder('text/plain');
                           tmp.append(logs);
                           log_file = tmp.getBlob();
                       }

                   }

                   if (self.navigator && self.navigator.msSaveBlob) {
                       self.navigator.msSaveBlob(log_file, fileName);
                   }

                   delete log_file;

               } else {

                   var log_file = new Blob(logs, { type: 'text/plain' });
                   var b = document.createElement('a');
                   var ev = document.createEvent('MouseEvents');
                   ev.initEvent("click", false, false);
                   b.href = URL.createObjectURL(log_file);
                   b.download = fileName;
                   b.dispatchEvent(ev)

                   delete b;
                   delete log_file;
               }
           });
    }

    createDebug.enable(createDebug.load());

    createDebug.localLogState = createDebug.loadLocalLogState() !== "false" ;

    return createDebug;
}

},{"sprintf-js":2}],4:[function(require,module,exports){
/**
 * This is the web browser implementation of `debug()`.   这是`debug()`的Web浏览器实现。
 */
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();
exports.log = log;
exports.saveLocalLogState = saveLocalLogState;
exports.loadLocalLogState = loadLocalLogState;
exports.sessionStorage = self.sessionStorage;
/*-------------------------------------------*/

exports.colors = [
    '#295288'
   //'#46A7C9'
    ];

/**
 * Background Colors
 */
exports.bgColors = [
  'inherit', //DEBUG
  'inherit', //LOG
  '#46A7C9', //INFO
  '#D08005;font-size:14px', //WARN
  '#F64863;font-size:16px', //ERROR
  '#F64863;font-size:18px'  //FATAL
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && self.process && self.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/trident\/(\d+)/)) {
      return false;
  }

  // Rzhang: Edge supports colors since 16215
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/edge\/(\d+)/)
      && (parseInt(navigator.userAgent.toLowerCase().match(/edge\/\d+.(\d+)/)[1]) < 16215)) {
      return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && self.console && (self.console.firebug || (self.console.exception && self.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ');
    //+ '+' + module.exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: ' + this.bgColor)

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  if (this.bgColor !== debug.bgColors[4]) {
    return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
  } else {
    return 'object' === typeof console
           && console.error
           && Function.prototype.apply.call(console.error, console, arguments);

  }
}

/**
 * Save `namespaces`.
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  //if (!r && typeof process !== 'undefined' && 'env' in process) {
  //  r = process.env.DEBUG;
  //}

  if ( !r ) {
      //Set default namespaces
      r = '*:INFO,*:WARN,*:ERROR';
  }

  return r;
}

/**
 * Save LocalLog enable state.
 * @param {Bool} state
 * @api private
 */
function saveLocalLogState(state) {
  try {
    if (null == state || state != false) {
      exports.storage.setItem('localLog', true);
    } else {
      exports.storage.setItem('localLog', false);
    }
  } catch (e) {
  }
}

/**
 * Load `localLog` setting.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function loadLocalLogState() {
  var r = true;
  try {
      r = exports.storage.localLog;
  } catch (e) {
  }

  // If debug isn't set in LS
  if (!r ) {
    r = true;
  }

  return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return self.localStorage;
  } catch (e) {}
}

module.exports = require('./common')(exports);

var formatters = module.exports.formatters;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};

},{"./common":3}]},{},[4])(4)
});