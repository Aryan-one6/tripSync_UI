import 'package:flutter/material.dart';

abstract class AppColors {
  // ─── Brand Primary ─────────────────────────────────────────────────────────
  /// Main brand green – used for primary buttons, active states, key CTAs
  static const Color primary = Color(0xFF1A6B3A);

  /// Lighter green – hover states, selected chips, progress fills
  static const Color primaryLight = Color(0xFF2E8B57);

  /// Very light green tint – backgrounds, subtle highlights
  static const Color primarySurface = Color(0xFFE8F5EE);

  /// Dark green – pressed states, AppBar, nav elements
  static const Color primaryDark = Color(0xFF0F4A27);

  // ─── Accent / CTA ──────────────────────────────────────────────────────────
  /// Warm orange – "Book Now" buttons, badges, urgency labels (🔥 offer banners)
  static const Color accent = Color(0xFFE8621A);

  /// Light orange tint – badge backgrounds, soft chips
  static const Color accentLight = Color(0xFFFFF0E8);

  /// Deep orange – pressed accent state
  static const Color accentDark = Color(0xFFC04D10);

  // ─── Neutrals / Backgrounds ────────────────────────────────────────────────
  /// App scaffold background – near-white warm stone
  static const Color background = Color(0xFFFAF8F5);

  /// Card surface color
  static const Color surface = Color(0xFFFFFFFF);

  /// Subtle section dividers / shimmer base
  static const Color surfaceVariant = Color(0xFFF2EFE9);

  /// Stroke / divider color
  static const Color border = Color(0xFFE4DDD3);

  // ─── Background ────────────────────────────────────────────────
  static const Color scaffoldBg = Color(0xFFF7F8FC); // Page background
  static const Color cardBg = Color(0xFFFFFFFF); // Card / surface white
  static const Color cardBorder = Color(0xFFE8EBF2); // Card border

  // ─── Text ──────────────────────────────────────────────────────────────────
  /// Primary headings
  static const Color textPrimary = Color(0xFF1A1A1A);

  /// Body / secondary text
  static const Color textSecondary = Color(0xFF5C5C5C);

  /// Hint / placeholder / meta text
  static const Color textMuted = Color(0xFF9E9E9E);

  /// Text on dark/green backgrounds
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  /// Text on orange accent backgrounds
  static const Color textOnAccent = Color(0xFFFFFFFF);

  // ─── Status / Semantic ─────────────────────────────────────────────────────
  /// Success – verified badge, escrow confirmed
  static const Color success = Color(0xFF2E7D32);
  static const Color successSurface = Color(0xFFE8F5E9);

  /// Warning – partial fill badges, limited spots
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningSurface = Color(0xFFFFF8E1);

  /// Error – validation, failed payment
  static const Color error = Color(0xFFD32F2F);
  static const Color errorSurface = Color(0xFFFFEBEE);

  /// Info – neutral status chips
  static const Color info = Color(0xFF0288D1);
  static const Color infoSurface = Color(0xFFE1F5FE);

  // ─── Trip / Category Tag Colors ────────────────────────────────────────────
  /// Adventure vibe
  static const Color tagAdventure = Color(0xFFE65100);

  /// Beach vibe
  static const Color tagBeach = Color(0xFF0097A7);

  /// Mountains vibe
  static const Color tagMountain = Color(0xFF5C6BC0);

  /// Culture vibe
  static const Color tagCulture = Color(0xFF8D6E63);

  /// Budget vibe
  static const Color tagBudget = Color(0xFF43A047);

  /// Weekend vibe
  static const Color tagWeekend = Color(0xFF7B1FA2);

  // ─── Overlay / Shadow ──────────────────────────────────────────────────────
  static const Color overlay = Color(0x66000000); // 40% black
  static const Color cardShadow = Color(0x14000000); // 8% black

  // ─── Bottom Nav / Tab Bar ──────────────────────────────────────────────────
  static const Color navBackground = Color(0xFFFFFFFF);
  static const Color navActive = Color(0xFF1A6B3A);
  static const Color navInactive = Color(0xFFB0BEC5);

  // ─── Input Fields ──────────────────────────────────────────────────────────
  static const Color inputFill = Color(0xFFF5F3F0);
  static const Color inputBorder = Color(0xFFDDD8D0);
  static const Color inputFocusBorder = Color(0xFF1A6B3A);

  // ─── Gradient Helpers ──────────────────────────────────────────────────────

  /// Used on hero image overlay (destination cards)
  static const LinearGradient cardOverlayGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x00000000), Color(0xCC000000)],
  );

  /// Brand gradient for splash / onboarding headers
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0F4A27), Color(0xFF2E8B57)],
  );

  /// Savings / offer badge gradient
  static const LinearGradient savingsGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFE8621A), Color(0xFFF59E0B)],
  );
}
