import 'package:flutter/foundation.dart';

import '../../../core/models/auth_session.dart';
import '../../../core/services/session_manager.dart';

class AuthViewModel extends ChangeNotifier {
  AuthViewModel(this._sessionManager);

  final SessionManager _sessionManager;
  bool _isBusy = false;

  bool get isBusy => _isBusy;
  bool get isAuthenticated => _sessionManager.isAuthenticated;

  Future<void> setSession(AuthSession session) async {
    _isBusy = true;
    notifyListeners();
    try {
      await _sessionManager.save(session);
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() => _sessionManager.signOut();
}
