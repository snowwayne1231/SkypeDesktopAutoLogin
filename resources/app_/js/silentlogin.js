/**
 * Documentation: https://skype.visualstudio.com/SCONSUMER/_git/client-shared_web_login-lib?path=%2FREADME.md&version=GBmaster&_a=contents
 */
(function () {
    "use strict";

    if (typeof window.SKYPE === "undefined") {
        window.SKYPE = {};
    }
    window.SKYPE.login = window.SKYPE.login || {};

    window.SKYPE.login.Silent = (function() {
        var loginDomains = {
            qa: "https://a.qa.lw.skype.net",
            live: "https://a.lw.skype.com"
        },
        endpoint = "/login/silent", // Silent login endpoint uri
        endpointVersion = "1.0", // Endpoint version
        iFrameReference = null, // iFrame object reference
        ancestorElement, // iFrame's ancestor
        callback, // Callback function
        response = {}, // Response object
        timeout = 20000, // Timeout for the call in ms
        timeoutObj = null, // Timeout reference
        host = null, // Selected login hostname
        state = "", // State passed through the silent login
        eventRegistered = false, // Post message event listener registered
        processing = false, // Processing the Silent login request
        logEnabled = null; // Debug logging enabled

        /**
         * Settings object. will be overriden by init()
         */
        var settings = {
            env: "live",
            client_id: null,
            redirect_uri: null
        };

        /**
         * Simple debug logger
         *
         * @param string message Logged message
         * @param Object debug Optional debug data
         *
         * @return void
         */
        var _log = function(message, debug) {
            if (logEnabled === null) {
                logEnabled = (window.location.host.match(/^(pre|dev|qa).*\.net$/) || document.cookie.indexOf("debug") > -1 || window.location.search.indexOf("debug") > -1);
            }
            if (!logEnabled) {
                return;
            }
            try {
                if (typeof debug === "object") {
                    var tokens = [];

                    for (var prop in debug) {
                        if (prop === "skypetoken") {
                            // Hide the skypetoken from console
                            tokens.push(prop + ": " + "<HIDDEN>");
                        } else {
                            tokens.push(prop + ": " + JSON.stringify(debug[prop]));
                        }
                    }

                    message += " - " + tokens.join(", ");
                } else if (typeof debug === "string") {
                    message += " - " + debug;
                }
                message = "[silentlogin.js] - " + message;
                console.log(message);
            } catch (e) {}
        };

        /**
         * Post message event listener
         *
         * @return void
         */
        var _messageListener = function (e) {
            _log("Received message from " + e.origin);
            // Verify the message origin
            if (!host || e.origin !== host) {
                return;
            }

            var data = e.data;

            // If the postMessage sends just a string, try to JSON parse it
            if (typeof e.data === "string") {
                try {
                    data = JSON.parse(e.data);
                } catch (ex) {}
            }
            _log("Message data", data);

            // Verify the message state
            var receivedState = data.state || null;
            if (state !== receivedState) {
                _log("State " + receivedState + " doesn't match the last submitted state " + state);
                return;
            }
            // Response is trusted
            window.clearTimeout(timeoutObj);
            // Clone the response data
            response = {};
            for (var attr in data) {
                if (data.hasOwnProperty(attr)) {
                    response[attr] = data[attr];
                }
            }

            _callCallback();
        };

        /**
         * Create the silent login iframe and start loading
         *
         * @return void
         */
        var _createSilentLogin = function(source) {
            _destroySilentLogin();
            if (typeof ancestorElement === "undefined") {
                // Use body as the ancestor, but when it's not available yet, use head instead.
                // document.head is not available in IE8, so fallback is to get it by tag name.
                ancestorElement = document.body || document.head || document.getElementsByTagName('head')[0];
            }
            iFrameReference = document.createElement("iframe");
            iFrameReference.frameBorder = 0;
            iFrameReference.width = "1px";
            iFrameReference.height = "1px";
            iFrameReference.style.display = "none";
            iFrameReference.style.visibility = "hidden";
            iFrameReference.id = "silentLoginFrame" + Math.floor((Math.random() * 10) + 1);
            iFrameReference.setAttribute("src", source);
            ancestorElement.appendChild(iFrameReference);
            _log("Created iFrame: " + source);
        };

        /**
         * Destroy the silent login iframe
         *
         * @return void
         */
        var _destroySilentLogin = function() {
            if (iFrameReference) {
                ancestorElement.removeChild(iFrameReference);
                iFrameReference = null;
            }
        };

        /**
         * Verify if the provided settings are valid. Initialize the redirect uri if missing.
         *
         * @return void
         */
        var _validateSettings = function() {
            if (!settings.client_id) {
                throw "[silentlogin.js] client_id not initialized. Call init() first.";
            }

            if (!settings.redirect_uri) {
                // If redirect_uri not set, use the page location (without parameters)
                settings.redirect_uri = window.location.protocol + "//" + window.location.host + window.location.pathname;
            }
        };

        /**
         * Check if the browser supports postMessage and JSON.parse
         *
         * @return boolean
         */
        var _isSupportedBrowser = function() {
            return ("postMessage" in window) && (typeof JSON === "object" && JSON.parse);
        };

        /**
         * Call the callback function and pass the response object to it.
         *
         * @return void
         */
        var _callCallback = function() {
            _log("Calling callback function", response);

            // No longer processing request. Unlock.
            processing = false;

            if (typeof callback === "function") {
                callback(response);
            }
        };

        /**
         * Handle timeout event and call the callback function.
         *
         * @return void
         */
        var _handleTimeout = function() {
            _destroySilentLogin();
            response = {};
            response.error = "timeout";
            _callCallback();
        };

        /**
         * Serialize object into query parameters
         *
         * @param Object query Object holding the parameters to serialize
         * @return string Serialized query string
         */
        var _createQuery = function(query) {
            var str = [];
            for (var k in query) {
                if (query.hasOwnProperty(k)) {
                    str.push(encodeURIComponent(k) + "=" + encodeURIComponent(query[k]));
                }
            }
            return str.join("&");
        };

        /**
         * Get the iFrame source url
         *
         * @return string Frame url
         */
        var _getFrameSource = function() {
            var timestamp = new Date().getTime(),
                domainMap = loginDomains;

            state = "silentloginsdk_" + timestamp;
            var query = {
                response_type: "postmessage",
                client_id: settings.client_id,
                partner: "999",
                redirect_uri: settings.redirect_uri,
                state: state,
                _accept: endpointVersion,
                _nc: timestamp
            };

            host = domainMap[settings.env] || domainMap.live;
            return host + endpoint + "?" + _createQuery(query);
        };

        /**
         * Initialize the Silent login before using it
         *
         * Pass in the settings object:
         * <pre>
         * {
         *  env: "<live|qa>", // Skype environment to be used: Live (default), QA. Optional.
         *  client_id: <client id>, // Client id of your application. Mandatory.
         *  redirect_uri: <uri>, // Redirect uri of your application. If left empty, will be autodetected from current location. (Optional, recommended)
         * }
         * </pre>
         *
         * @param Object options Silent login options
         * @return SKYPE.login.Silent
         */
        var init = function(options) {
            if (typeof options === "object") {
                options = options || {};
                // If callback function passed into init method, set it correctly
                if (options.hasOwnProperty("callback")) {
                    setCallback(options.callback);
                }
                // Copy overrides to settings
                for (var k in settings) {
                    if (options.hasOwnProperty(k)) {
                        settings[k] = options[k];
                    }
                }
            }
            // Register the message listener
            if (!eventRegistered) {
                eventRegistered = true;
                if (!window.addEventListener) {
                    window.attachEvent("onmessage", _messageListener);
                 } else {
                    window.addEventListener("message", _messageListener, false);
                 }
            }
            return this;
        };

        /**
         * Set the callback function, which will be called once we get the result.
         * Note the function parameter will contain the response object.
         *
         * @param function callbackFunction Callback function
         * @return SKYPE.login.Silent
         */
        var setCallback = function(callbackFunction) {
            if (typeof callbackFunction === "function") {
                callback = callbackFunction;
            }
            return this;
        };

        /**
         * Trigger loading the Silent login iFrame. Registered callback will be called once finished.
         *
         * @return void
         */
        var load = function() {
            // Prevent multiple simultaneous calls
            if (processing) {
                return;
            }
            _validateSettings();
            processing = true;
            // If this browser doesn't support postMessage, we're done.
            if (!_isSupportedBrowser()) {
                response = {error: "unsupported_browser"};
                _callCallback();
                return;
            }
            // Initialize timer
            window.clearTimeout(timeoutObj);
            timeoutObj = window.setTimeout(_handleTimeout, timeout);
            // Start loading the iFrame
            _createSilentLogin(_getFrameSource());
        };

        /**
         * Get the Skypetoken from response or null if not provided
         *
         * @return string|null Skypetoken or null
         */
        var getSkypetoken = function() {
            return response.skypetoken || null;
        };

        /**
         * Get the full response object
         *
         * @return Object Response object
         */
        var getFullResponse = function() {
            return response;
        };

        return {
            init: init,
            setCallback: setCallback,
            load: load,
            getSkypetoken: getSkypetoken,
            getFullResponse: getFullResponse
        };
    }());
}());