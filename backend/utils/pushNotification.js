const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseInitialized = false;

// Path to service account key file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../firebase-service-account.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } else {
    console.warn(`\n================================================================================`);
    console.warn(`⚠️  Firebase Service Account Key not found at: ${serviceAccountPath}`);
    console.warn(`👉  Push Notifications (FCM) are currently disabled.`);
    console.warn(`👉  Please place your 'firebase-service-account.json' file in the 'backend' folder.`);
    console.warn(`================================================================================\n`);
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
}

/**
 * Send a push notification using Firebase Cloud Messaging
 * @param {string} fcmToken - The registration token of the recipient device
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} [data] - Optional metadata payload
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    return;
  }

  // Convert all values in data payload to string (FCM requirement)
  const stringifiedData = {};
  if (data) {
    Object.keys(data).forEach(key => {
      stringifiedData[key] = String(data[key]);
    });
  }

  if (!firebaseInitialized) {
    console.log('\n=========================================');
    console.log('📱 [SIMULATED PUSH NOTIFICATION]');
    console.log(`To FCM Token: ${fcmToken}`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log('Data:', stringifiedData);
    console.log('=========================================\n');
    return;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: stringifiedData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending push notification via FCM:', error.message);
  }
}

module.exports = {
  sendPushNotification,
  isFirebaseEnabled: () => firebaseInitialized,
};
