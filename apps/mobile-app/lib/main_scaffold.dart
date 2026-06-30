import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:travellersin/core/theme/app_colors.dart';

class MainScaffoled extends StatelessWidget {
  final Widget child;

  const MainScaffoled({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/discover')) return 0;
    if (location.startsWith('/trips')) return 1;
    if (location.startsWith('/messages')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: AppColors.primary,
        currentIndex: _currentIndex(context),
        onTap: (index) {
          switch (index) {
            case 0:
              context.go('/discover');
            case 1:
              context.go('/trips');
            case 2:
              context.go('/messages');
            case 3:
              context.go('/profile');
          }
        },
        items: [
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: 'Discover'),
          BottomNavigationBarItem(icon: Icon(Icons.luggage), label: 'My Trips'),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline),
            label: 'Messages',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
