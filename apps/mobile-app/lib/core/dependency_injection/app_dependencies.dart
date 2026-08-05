import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../../features/auth/presentation/auth_view_model.dart';
import '../config/app_environment.dart';
import '../network/api_client.dart';
import '../network/auth_interceptor.dart';
import '../routing/app_router.dart';
import '../services/secure_session_storage.dart';
import '../services/session_manager.dart';

class AppDependencies {
  AppDependencies._({
    required this.storage,
    required this.sessionManager,
    required this.apiClient,
    required this.appRouter,
  });

  final SecureSessionStorage storage;
  final SessionManager sessionManager;
  final ApiClient apiClient;
  final AppRouter appRouter;

  static Future<AppDependencies> create() async {
    const SecureSessionStorage storage = SecureSessionStorage();
    final SessionManager sessionManager = SessionManager(
      storage: storage,
      refreshClient: Dio(
        BaseOptions(
          baseUrl: AppEnvironment.apiBaseUrl,
          connectTimeout: AppEnvironment.connectTimeout,
          receiveTimeout: AppEnvironment.receiveTimeout,
        ),
      ),
    );
    await sessionManager.restore();

    final Dio dio = Dio(
      BaseOptions(
        baseUrl: AppEnvironment.apiBaseUrl,
        connectTimeout: AppEnvironment.connectTimeout,
        receiveTimeout: AppEnvironment.receiveTimeout,
        responseType: ResponseType.json,
        headers: const <String, Object>{'Accept': 'application/json'},
      ),
    );
    dio.interceptors.add(
      AuthInterceptor(dio: dio, sessionManager: sessionManager),
    );

    final ApiClient apiClient = ApiClient(dio);
    final AppRouter appRouter = AppRouter(sessionManager);

    return AppDependencies._(
      storage: storage,
      sessionManager: sessionManager,
      apiClient: apiClient,
      appRouter: appRouter,
    );
  }

  Widget wrap(Widget child) {
    return MultiProvider(
      providers: [
        Provider<SecureSessionStorage>.value(value: storage),
        ChangeNotifierProvider<SessionManager>.value(value: sessionManager),
        Provider<ApiClient>.value(value: apiClient),
        Provider<AppRouter>.value(value: appRouter),
        ChangeNotifierProvider<AuthViewModel>(
          create: (_) => AuthViewModel(sessionManager),
        ),
      ],
      child: child,
    );
  }
}
