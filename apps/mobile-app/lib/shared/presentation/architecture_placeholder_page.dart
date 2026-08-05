import 'package:flutter/material.dart';

class ArchitecturePlaceholderPage extends StatelessWidget {
  const ArchitecturePlaceholderPage({required this.title, super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: const Center(
        child: Text(
          'Application architecture is ready. Features are intentionally not implemented.',
        ),
      ),
    );
  }
}
