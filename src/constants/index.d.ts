interface ElectronPushReceiverConstants {
    START_NOTIFICATION_SERVICE: string;
    DESTROY_NOTIFICATION_SERVICE: string;
    NOTIFICATION_SERVICE_STARTED: string;
    NOTIFICATION_SERVICE_ERROR: string;
    NOTIFICATION_RECEIVED: string;
    TOKEN_UPDATED: string;
}

declare const electronPushReceiverConstants: ElectronPushReceiverConstants;
export = electronPushReceiverConstants;
