import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/session_manager.dart';
import '../../shared/presentation/architecture_placeholder_page.dart';

class AppRouter {
  AppRouter(SessionManager sessionManager)
    : router = GoRouter(
        initialLocation: AppRoute.home.path,
        refreshListenable: sessionManager,
        redirect: (BuildContext context, GoRouterState state) {
          final bool protectedRoute =
              state.matchedLocation.startsWith('/app') ||
              state.matchedLocation.startsWith('/agency');
          if (protectedRoute && !sessionManager.isAuthenticated) {
            return AppRoute.signIn.path;
          }
          return null;
        },
        routes: <RouteBase>[
          GoRoute(
            path: AppRoute.home.path,
            builder: (context, state) =>
                const ArchitecturePlaceholderPage(title: 'TravellersIn'),
          ),
          GoRoute(
            path: AppRoute.signIn.path,
            builder: (context, state) =>
                const ArchitecturePlaceholderPage(title: 'Sign in'),
          ),
          GoRoute(
            path: AppRoute.travelerShell.path,
            builder: (context, state) =>
                const ArchitecturePlaceholderPage(title: 'Traveler workspace'),
          ),
          GoRoute(
            path: AppRoute.agencyShell.path,
            builder: (context, state) =>
                const ArchitecturePlaceholderPage(title: 'Agency workspace'),
          ),
        ],
      );

  final GoRouter router;
}

enum AppRoute {
  home('/'),
  signIn('/sign-in'),
  travelerShell('/app'),
  agencyShell('/agency');

  const AppRoute(this.path);
  final String path;
}
