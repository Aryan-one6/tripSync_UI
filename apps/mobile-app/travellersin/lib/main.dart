import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:travellersin/core/notification_service.dart';
import 'package:travellersin/firebase_options.dart';
import 'package:travellersin/screens/web_view_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  await NotificationService.init();

  runApp(const MyApp());
}

Future<void> getFcmToken() async {
  FirebaseMessaging messaging = FirebaseMessaging.instance;

  // Android 13+ / iOS
  NotificationSettings settings =
      await messaging.requestPermission();

  debugPrint("Permission: ${settings.authorizationStatus}");

  String? token = await messaging.getToken();

  debugPrint("FCM TOKEN => $token");

  messaging.onTokenRefresh.listen((newToken) {
    debugPrint("REFRESH TOKEN => $newToken");
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Travellers.in',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        appBarTheme: AppBarTheme(
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.white,
            statusBarIconBrightness: Brightness.dark,
          ),
        ),
      ),
      home: MainWebView(),
    );
  }
}
