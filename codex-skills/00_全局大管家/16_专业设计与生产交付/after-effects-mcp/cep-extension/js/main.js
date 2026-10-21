/**
 * AE-MCP CEP Panel JavaScript
 *
 * Manages the CEP panel UI and communication with the host script.
 */

// CSInterface instance
let csInterface;
let pollInterval = null;
let isRunning = false;
let statusElement;
let logElement;

/**
 * Initialize the panel
 */
function init() {
  csInterface = new CSInterface();

  // Get DOM elements
  statusElement = document.getElementById('status');
  logElement = document.getElementById('log');

  // Set up event listeners
  document.getElementById('startBtn').addEventListener('click', startMCP);
  document.getElementById('stopBtn').addEventListener('click', stopMCP);
  document.getElementById('cleanupBtn').addEventListener('click', cleanup);

  // Initialize the host script
  evalScript('initMCP()', (result) => {
    try {
      const data = JSON.parse(result);
      if (data.success) {
        log('MCP initialized. Folder: ' + data.folder);
        startPolling();
      } else {
        log('Failed to initialize MCP');
      }
    } catch (e) {
      log('Error parsing init result: ' + e);
    }
  });

  // Update status periodically
  setInterval(updateStatus, 5000);
  updateStatus();

  log('AE-MCP Panel loaded');
}

/**
 * Start the MCP bridge
 */
function startMCP() {
  if (isRunning) {
    log('MCP is already running');
    return;
  }

  evalScript('initMCP()', (result) => {
    try {
      const data = JSON.parse(result);
      if (data.success) {
        log('MCP started');
        startPolling();
      }
    } catch (e) {
      log('Error starting MCP: ' + e);
    }
  });
}

/**
 * Stop the MCP bridge
 */
function stopMCP() {
  if (!isRunning) {
    log('MCP is not running');
    return;
  }

  stopPolling();

  evalScript('stopMCP()', (result) => {
    log('MCP stopped');
    updateStatus();
  });
}

/**
 * Start polling for commands
 */
function startPolling() {
  if (pollInterval) {
    return;
  }

  isRunning = true;
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;

  pollInterval = setInterval(() => {
    evalScript('processCommands()', (result) => {
      try {
        const data = JSON.parse(result);
        if (data.processed > 0) {
          log('Processed ' + data.processed + ' command(s)');
        }
      } catch (e) {
        // Ignore parse errors during polling
      }
    });
  }, 100);

  log('Started polling for commands');
  updateStatus();
}

/**
 * Stop polling for commands
 */
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  isRunning = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;

  log('Stopped polling');
}

/**
 * Clean up old files
 */
function cleanup() {
  evalScript('cleanupProcessedFiles()', (result) => {
    try {
      const data = JSON.parse(result);
      log('Cleaned up ' + data.cleaned + ' old file(s)');
    } catch (e) {
      log('Error during cleanup: ' + e);
    }
  });
}

/**
 * Update status display
 */
function updateStatus() {
  evalScript('getMCPStatus()', (result) => {
    try {
      const data = JSON.parse(result);
      let statusText = '';
      statusText += 'Status: ' + (isRunning ? 'Running' : 'Stopped') + '\n';
      statusText += 'AE Version: ' + data.aeVersion + '\n';
      statusText += 'Project: ' + (data.project || 'None') + '\n';
      statusText += 'Commands Processed: ' + data.processedCount;

      statusElement.textContent = statusText;
    } catch (e) {
      statusElement.textContent = 'Error getting status';
    }
  });
}

/**
 * Add a log entry
 */
function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = '[' + timestamp + '] ' + message + '\n';

  logElement.textContent += entry;

  // Auto-scroll to bottom
  logElement.scrollTop = logElement.scrollHeight;

  // Limit log size
  const lines = logElement.textContent.split('\n');
  if (lines.length > 100) {
    logElement.textContent = lines.slice(-100).join('\n');
  }
}

/**
 * Evaluate a script in the host
 */
function evalScript(script, callback) {
  csInterface.evalScript(script, callback || function() {});
}

/**
 * Persist panel state
 */
function persistState() {
  const state = {
    isRunning: isRunning
  };
  csInterface.setPersistentData('aemcp_state', JSON.stringify(state));
}

/**
 * Restore panel state
 */
function restoreState() {
  const stateStr = csInterface.getPersistentData('aemcp_state');
  if (stateStr) {
    try {
      const state = JSON.parse(stateStr);
      if (state.isRunning) {
        startMCP();
      }
    } catch (e) {
      // Ignore
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Auto-start after a short delay
  setTimeout(() => {
    if (!isRunning) {
      startMCP();
    }
  }, 1000);
});

// Handle panel close
window.addEventListener('beforeunload', () => {
  persistState();
  stopPolling();
});
