import 'package:dio/dio.dart';

import '../models/api_envelope.dart';

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<T> get<T>(
    String path, {
    Map<String, Object?>? queryParameters,
    required T Function(Object? json) decoder,
  }) async {
    final Response<Object?> response = await _dio.get<Object?>(
      path,
      queryParameters: queryParameters,
    );
    return _readEnvelope(response.data, decoder);
  }

  Future<T> post<T>(
    String path, {
    Object? data,
    required T Function(Object? json) decoder,
  }) async {
    final Response<Object?> response = await _dio.post<Object?>(
      path,
      data: data,
    );
    return _readEnvelope(response.data, decoder);
  }

  T _readEnvelope<T>(Object? body, T Function(Object? json) decoder) {
    if (body is! Map<String, Object?> || !body.containsKey('data')) {
      throw const ApiException(
        'The API response did not contain a data envelope.',
      );
    }
    return decoder(
      ApiEnvelope<Object?>.fromJson(body, (Object? json) => json).data,
    );
  }
}

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
