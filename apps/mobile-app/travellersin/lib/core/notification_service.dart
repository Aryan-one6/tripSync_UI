import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _fln =
      FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'high_importance',
    'High Importance',
    importance: Importance.max,
  );

  static Future<void> init() async {
    // Create Android notification channel
    await _fln
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(_channel);

    // Initialize local notifications
    await _fln.initialize(
      settings: InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );

    // Request permissions (Android 13+ / iOS)
    await FirebaseMessaging.instance.requestPermission();

    // iOS foreground notifications fix
    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );

    // Get FCM token
    final token = await FirebaseMessaging.instance.getToken();
    debugPrint('FCM Token: $token');

    // Foreground messages
    FirebaseMessaging.onMessage.listen(_showNotification);

    // When user taps notification
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint("Notification clicked: ${message.data}");
    });

    // Token refresh
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      debugPrint("New Token: $newToken");
    });
  }

  // Show local notification (foreground only)
  static Future<void> _showNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _fln.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          importance: Importance.max,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }
}
