import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth_session.dart';

class SecureSessionStorage {
  const SecureSessionStorage({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
  }) : _storage = storage;

  static const String _sessionKey = 'tripsync.auth_session';
  final FlutterSecureStorage _storage;

  Future<AuthSession?> read() async {
    final String? raw = await _storage.read(key: _sessionKey);
    if (raw == null) return null;
    try {
      final Object? decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Invalid stored session');
      }
      return AuthSession.fromJson(decoded);
    } on FormatException {
      await clear();
      return null;
    }
  }

  Future<void> write(AuthSession session) =>
      _storage.write(key: _sessionKey, value: jsonEncode(session.toJson()));

  Future<void> clear() => _storage.delete(key: _sessionKey);
}
