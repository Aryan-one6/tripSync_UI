import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:travellersin/core/router/route_name.dart';
import 'package:travellersin/core/theme/app_colors.dart';

class SplashView extends StatefulWidget {
  const SplashView({super.key});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(
      const Duration(seconds: 2),
    ); // your logo animation time

    if (!mounted) return;
    context.go(RouteName.discover);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        "This is splash scree",
        style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
      ),
    );
  }
}
