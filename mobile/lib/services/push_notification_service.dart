import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api_service.dart';

// Top-level background message handler
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("Handling a background message: ${message.messageId}");
}

class PushNotificationService {
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  static Future<void> initialize() async {
    try {
      // 1. Request notification permissions
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('User granted notification permission');
      } else {
        print('User declined or has not accepted notification permission');
      }

      // 2. Set background message handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 3. Handle foreground notifications
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Got a message whilst in the foreground!');
        print('Message data: ${message.data}');

        if (message.notification != null) {
          print('Message also contained a notification: ${message.notification!.title}');
          // If you want, you could trigger a native local notification here.
        }
      });

      // 4. Handle notification tap when app is in background but still running
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print('App opened from notification: ${message.messageId}');
      });

      // 5. Handle notification tap when app is terminated
      RemoteMessage? initialMessage = await _firebaseMessaging.getInitialMessage();
      if (initialMessage != null) {
        print('App launched from terminated state via notification: ${initialMessage.messageId}');
      }

      // 6. Get and upload the FCM token
      await uploadToken();
    } catch (e) {
      print('Error initializing Firebase Push Notifications: $e');
    }
  }

  static Future<void> uploadToken() async {
    try {
      if (!ApiService.isAuthenticated) {
        print('User is not authenticated; skipping FCM token upload.');
        return;
      }

      String? token = await _firebaseMessaging.getToken();
      if (token != null) {
        print('FCM Registration Token: $token');
        bool success = await ApiService.updateFcmToken(token);
        if (success) {
          print('Successfully uploaded FCM token to server.');
        } else {
          print('Failed to upload FCM token to server.');
        }
      }
    } catch (e) {
      print('Error retrieving or uploading FCM token: $e');
    }
  }
}
