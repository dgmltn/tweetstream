//var APP_ID = "0D7CD463";
//var NAMESPACE = "urn:x-cast:com.dgmltn.cast.shinytweets";
var APP_ID = 'F7FD2183';
var NAMESPACE = 'urn:x-cast:com.boombatower.chromecast-dashboard';

var initialized;
var session;

var remoteUrl = window.location.protocol + "//" + window.location.host + "/receiver";

window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
  if (loaded) {
    log("loaded");
    initializeApi();
  }
  else {
    log("error", errorInfo);
  }
}

var initializeApi = function() {
  var sessionRequest = new chrome.cast.SessionRequest(APP_ID);
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest, sessionConnectedListener, receiverListener);
  var success = function() {
    log("onInitSuccess");
  }
  chrome.cast.initialize(apiConfig, success, onInitError);
}

var receiverListener = function(e) {
  log("receiverListener", e);
  initialized = e === chrome.cast.ReceiverAvailability.AVAILABLE;
  onCastState();
}

var doLaunch = function() {
  chrome.cast.requestSession(sessionConnectedListener, onRequestSessionError);
};

var doStop = function() {
  var success = function() {
    log("doStop successful");
  };
  session.stop(success, onStopError);
};

var sessionConnectedListener = function(s) {
  session = s;
  session.addUpdateListener(sessionUpdateListener);
  log("sessionConnectedListener", session);
  onCastState();
};

var sessionUpdateListener = function(s) {
  log("sessionUpdateListener", session);
  onCastState();
};

var onCastState = function() {
  if (!initialized || session === undefined || session.status == 'stopped') {
  }
  else if (session.status == 'connected') {
    sendMessage();
  }
};

var sendMessage = function() {
  var data = { type: "load", url: remoteUrl };
  var success = function() {
    log("sent url to cast", data);
  };
  session.sendMessage(NAMESPACE, data, success, onMessageError);
};

var onInitError = function(e) {
    log("onInitError", e);
}

var onStopError = function(e) {
    log("onStopError", e);
}

var onRequestSessionError = function(e) {
    log("onRequestSessionError", e);
};

var onMessageError = function(e) {
    log("onMessageError", e);
}

var log = function(message, obj) {
    var stringified = (obj === undefined) ? "" : JSON.stringify(obj);
    console.log(message + " " + stringified);
};
