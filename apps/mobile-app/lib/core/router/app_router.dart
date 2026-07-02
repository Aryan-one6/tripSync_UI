import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:travellersin/core/router/route_name.dart';
import 'package:travellersin/main_scaffold.dart';
import 'package:travellersin/views/authentication/login_page.dart';
import 'package:travellersin/views/splash_view_page.dart';

final appRouter = GoRouter(
  initialLocation: RouteName.splash,
  routes: [
    GoRoute(
      path: RouteName.splash,
      name: 'Splash',
      builder: (con, st) => SplashView(),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainScaffoled(navigationShell: navigationShell);
      },
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: RouteName.discover,
              name: 'discover',
              builder: (context, state) => LoginPage(),
            ),
          ],
        ),

        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/trips',
              name: 'trips',
              builder: (context, state) => SizedBox(
                child: Center(
                  child: Text(
                    "Hello mF",
                    style: TextStyle(color: Colors.black),
                  ),
                ),
              ),
            ),
          ],
        ),

        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/messages',
              name: 'messages',
              builder: (context, state) => LoginPage(),
            ),
          ],
        ),

        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              name: 'profile',
              builder: (context, state) => LoginPage(),
            ),
          ],
        ),
      ],
    ),
  ],
);
