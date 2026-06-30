import 'package:go_router/go_router.dart';
import 'package:travellersin/main_scaffold.dart';
import 'package:travellersin/views/authentication/login_page.dart';

final appRouter = GoRouter(
    initialLocation: '/discover',
    routes: [
      ShellRoute(
        builder: (context, state, child) => MainScaffoled(child: child),
        routes: [
          GoRoute(
            path: '/discover',
            name: 'discover',
            builder: (context, state) => LoginPage(),
          ),
          GoRoute(
            path: '/trips',
            name: 'trips',
            builder: (context, state) => LoginPage(),
          ),
          GoRoute(
            path: '/messages',
            name: 'messages',
            builder: (context, state) => LoginPage(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => LoginPage(),
          ),
        ],
      ),
    ],
  );