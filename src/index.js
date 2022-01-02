const { register, listen } = require('push-receiver');
const { ipcMain } = require('electron');
const Store = require('electron-store');
const {
  START_NOTIFICATION_SERVICE,
  DESTROY_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
} = require('./constants');

let store;

module.exports = {
  START_NOTIFICATION_SERVICE,
  DESTROY_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
  setup,
};

// To be sure that start is called only once
let started = false;

//  used as a ref to client instance
let client;
// To be call from the main process
function setup(webContents, encrypt) {
  if (!store) {
    store = new Store({
      name: 'fcm',
      encryptionKey: encrypt,
    });
  }
  // Will be called by the renderer process
  ipcMain.on(START_NOTIFICATION_SERVICE, async (_, senderId) => {
    // Retrieve saved credentials
    let credentials = store.get('credentials');
    // Retrieve saved senderId
    const savedSenderId = store.get('senderId');
    if (started) {
      webContents.send(NOTIFICATION_SERVICE_STARTED, (credentials.fcm || {}).token);
      return;
    }
    started = true;
    try {
      // Retrieve saved persistentId : avoid receiving all already received notifications on start
      const persistentIds = store.get('persistentIds') || [];
      // Register if no credentials or if senderId has changed
      if (!credentials || savedSenderId !== senderId) {
        credentials = await register(senderId);
        // Save credentials for later use
        store.set('credentials', credentials);
        // Save senderId
        store.set('senderId', senderId);
        // Notify the renderer process that the FCM token has changed
        webContents.send(TOKEN_UPDATED, credentials.fcm.token);
      }
      // Listen for GCM/FCM notifications
      client = await listen(
        Object.assign({}, credentials, { persistentIds }),
        onNotification(webContents),
      );
      // Notify the renderer process that we are listening for notifications
      webContents.send(NOTIFICATION_SERVICE_STARTED, credentials.fcm.token);
    } catch (e) {
      console.error('PUSH_RECEIVER:::Error while starting the service', e);
      // Forward error to the renderer process
      webContents.send(NOTIFICATION_SERVICE_ERROR, e.message);
    }
  });

  ipcMain.on(DESTROY_NOTIFICATION_SERVICE, () => {
    // destroy push notifications service
    if (client !== undefined) {
      client.destroy();
    }
    // clear cache
    store.set('credentials', null);
    store.set('senderId', null);
    store.set('persistentIds', null);
    started = false;
  });
}

// Will be called on new notification
function onNotification(webContents) {
  return ({ notification, persistentId }) => {
    const persistentIds = store.get('persistentIds') || [];
    // Update persistentId
    store.set('persistentIds', [...persistentIds, persistentId]);
    // Notify the renderer process that a new notification has been received
    // And check if window is not destroyed for darwin Apps
    if (!webContents.isDestroyed()) {
      webContents.send(NOTIFICATION_RECEIVED, notification);
    }
  };
}
