import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:travellersin/core/theme/app_colors.dart';

class MainScaffoled extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainScaffoled({super.key, required this.navigationShell});

  static const List<_NavItemData> _navItems = [
    _NavItemData(icon: Icons.explore_rounded, label: 'Discover'),
    _NavItemData(icon: Icons.luggage_rounded, label: 'My Trips'),
    _NavItemData(icon: Icons.chat_bubble_outline_rounded, label: 'Messages'),
    _NavItemData(icon: Icons.person_rounded, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;

        if (navigationShell.currentIndex != 0) {
          // not on Discover → go back to Discover
          navigationShell.goBranch(0);
        } else {
          // already on Discover → exit app
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        body: navigationShell,
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: AppColors.navBackground,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          padding: EdgeInsets.only(
            top: 6,
            bottom: MediaQuery.of(context).padding.bottom + 10,
            left: 8,
            right: 8,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_navItems.length, (index) {
              final isActive = index == navigationShell.currentIndex;
              final item = _navItems[index];

              return GestureDetector(
                onTap: () {
                  if (index == navigationShell.currentIndex) {
                    // tap active tab → reset to root of that branch
                    navigationShell.goBranch(index, initialLocation: true);
                  } else {
                    // tap different tab → switch to it
                    navigationShell.goBranch(index, initialLocation: false);
                  }
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.primary
                            : AppColors.scaffoldBg,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        item.icon,
                        size: 20,
                        color: isActive ? Colors.white : AppColors.navInactive,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isActive
                            ? AppColors.primary
                            : AppColors.navInactive,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItemData {
  final IconData icon;
  final String label;

  const _NavItemData({required this.icon, required this.label});
}
