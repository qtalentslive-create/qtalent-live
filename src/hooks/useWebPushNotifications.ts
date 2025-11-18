export const useWebPushNotifications = () => ({
  isSupported: false,
  isSubscribed: false,
  isPWA: false,
  requestPermission: async () => false,
  unsubscribe: async () => false,
  showNotification: async () => {},
});
