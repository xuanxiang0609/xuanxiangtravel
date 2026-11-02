// Public Web config is shared with the existing booking/login pages.
export const firebaseConfig=window.XUANXIANG_CONFIG?.FIREBASE;
if(!firebaseConfig?.apiKey||!firebaseConfig?.projectId)throw new Error('Firebase Web config is missing');
