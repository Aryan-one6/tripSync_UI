import 'package:dio/dio.dart';

import '../services/session_manager.dart';

class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({required Dio dio, required SessionManager sessionManager})
    : _dio = dio,
      _sessionManager = sessionManager;

  final Dio _dio;
  final SessionManager _sessionManager;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final String? token = _sessionManager.accessToken;
    if (token != null &&
        token.isNotEmpty &&
        !options.extra.containsKey(_skipAuthKey)) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final RequestOptions request = err.requestOptions;
    final bool canRetry =
        err.response?.statusCode == 401 &&
        request.extra[_retriedKey] != true &&
        request.extra[_skipAuthKey] != true;
    if (!canRetry) {
      handler.next(err);
      return;
    }

    final bool refreshed = await _sessionManager.refresh();
    if (!refreshed) {
      handler.next(err);
      return;
    }

    try {
      request.extra[_retriedKey] = true;
      request.headers['Authorization'] =
          'Bearer ${_sessionManager.accessToken}';
      final Response<Object?> response = await _dio.fetch<Object?>(request);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}

const String _retriedKey = 'auth_retry_completed';
const String _skipAuthKey = 'skip_auth';
