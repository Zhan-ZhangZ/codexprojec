/**
 * CSInterface.js - Adobe CEP Interface Library
 * Simplified version for AE-MCP
 */

function CSInterface() {}

/**
 * Evaluates a JavaScript script in the host application
 */
CSInterface.prototype.evalScript = function(script, callback) {
  if (callback === null || callback === undefined) {
    callback = function() {};
  }

  try {
    window.__adobe_cep__.evalScript(script, callback);
  } catch (e) {
    callback('{"error": "' + e.toString() + '"}');
  }
};

/**
 * Gets the system path
 */
CSInterface.prototype.getSystemPath = function(pathType) {
  try {
    return window.__adobe_cep__.getSystemPath(pathType);
  } catch (e) {
    return '';
  }
};

/**
 * Gets the extension ID
 */
CSInterface.prototype.getExtensionID = function() {
  try {
    return window.__adobe_cep__.getExtensionID();
  } catch (e) {
    return '';
  }
};

/**
 * Gets host environment info
 */
CSInterface.prototype.getHostEnvironment = function() {
  try {
    var hostEnvStr = window.__adobe_cep__.getHostEnvironment();
    return JSON.parse(hostEnvStr);
  } catch (e) {
    return {};
  }
};

/**
 * Sets persistent data
 */
CSInterface.prototype.setPersistentData = function(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Gets persistent data
 */
CSInterface.prototype.getPersistentData = function(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

/**
 * Opens a URL in the default browser
 */
CSInterface.prototype.openURLInDefaultBrowser = function(url) {
  try {
    window.__adobe_cep__.openURLInDefaultBrowser(url);
  } catch (e) {
    window.open(url);
  }
};

/**
 * Gets the current extension's path
 */
CSInterface.prototype.getExtensionPath = function() {
  try {
    return window.__adobe_cep__.getExtensionPath();
  } catch (e) {
    return '';
  }
};

/**
 * Requests to open a native extension
 */
CSInterface.prototype.requestOpenExtension = function(extensionId, params) {
  try {
    window.__adobe_cep__.requestOpenExtension(extensionId, params);
  } catch (e) {
    console.error('Failed to open extension:', e);
  }
};

/**
 * Closes this extension
 */
CSInterface.prototype.closeExtension = function() {
  try {
    window.__adobe_cep__.closeExtension();
  } catch (e) {
    window.close();
  }
};

/**
 * System path types
 */
CSInterface.prototype.SYSTEM_PATH = {
  USER_DATA: 'userData',
  COMMON_FILES: 'commonFiles',
  MY_DOCUMENTS: 'myDocuments',
  APPLICATION: 'application',
  EXTENSION: 'extension',
  HOST_APPLICATION: 'hostApplication'
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSInterface;
}
