import 'package:flutter/widgets.dart';

import 'app.dart';
import 'core/dependency_injection/app_dependencies.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final AppDependencies dependencies = await AppDependencies.create();
  runApp(dependencies.wrap(const TravellersInApp()));
}
