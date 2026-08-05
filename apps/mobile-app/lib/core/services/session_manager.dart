import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import 'secure_session_storage.dart';

class SessionManager extends ChangeNotifier {
  SessionManager({
    required SecureSessionStorage storage,
    required Dio refreshClient,
  }) : _storage = storage,
       _refreshClient = refreshClient;

  final SecureSessionStorage _storage;
  final Dio _refreshClient;
  AuthSession? _session;
  Future<bool>? _refreshInFlight;

  AuthSession? get session => _session;
  String? get accessToken => _session?.accessToken;
  bool get isAuthenticated => _session != null;

  Future<void> restore() async {
    _session = await _storage.read();
    notifyListeners();
  }

  Future<void> save(AuthSession session) async {
    _session = session;
    await _storage.write(session);
    notifyListeners();
  }

  Future<void> signOut() async {
    _session = null;
    await _storage.clear();
    notifyListeners();
  }

  Future<bool> refresh() {
    return _refreshInFlight ??= _performRefresh().whenComplete(
      () => _refreshInFlight = null,
    );
  }

  Future<bool> _performRefresh() async {
    final AuthSession? current = _session;
    if (current == null) return false;
    try {
      final Response<Object?> response = await _refreshClient.post<Object?>(
        '/auth/refresh',
        data: <String, String>{'refreshToken': current.refreshToken},
      );
      final Object? body = response.data;
      if (body is! Map<String, Object?> ||
          body['data'] is! Map<String, Object?>) {
        throw const FormatException('Invalid refresh response');
      }
      await save(AuthSession.fromJson(body['data']! as Map<String, Object?>));
      return true;
    } catch (_) {
      await signOut();
      return false;
    }
  }
}
