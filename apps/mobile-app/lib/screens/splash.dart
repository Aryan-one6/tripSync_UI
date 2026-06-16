import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:travellersin/screens/web_view_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  // Controllers
  late AnimationController _bgController;
  late AnimationController _logoController;
  late AnimationController _textController;
  late AnimationController _taglineController;
  late AnimationController _dotPulseController;
  late AnimationController _particleController;

  // Background gradient animation
  late Animation<double> _bgAnimation;

  // Logo entrance
  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;
  late Animation<Offset> _logoSlide;

  // Text animations
  late Animation<double> _travellersOpacity;
  late Animation<Offset> _travellersSlide;
  late Animation<double> _inMarkOpacity;
  late Animation<Offset> _inMarkSlide;

  // Tagline
  late Animation<double> _taglineOpacity;
  late Animation<Offset> _taglineSlide;

  // Dot pulse
  late Animation<double> _dotScale;

  // Particle fade
  late Animation<double> _particleOpacity;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startAnimations();
    redirectToDashboard();
  }

  void _setupAnimations() {
    // Background shift
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    );
    _bgAnimation = CurvedAnimation(
      parent: _bgController,
      curve: Curves.easeInOut,
    );

    // Logo pop-in
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _logoScale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.elasticOut),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );
    _logoSlide = Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero)
        .animate(
          CurvedAnimation(parent: _logoController, curve: Curves.easeOutCubic),
        );

    // Text animations
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _travellersOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOut),
      ),
    );
    _travellersSlide =
        Tween<Offset>(begin: const Offset(-0.2, 0), end: Offset.zero).animate(
          CurvedAnimation(parent: _textController, curve: Curves.easeOutCubic),
        );
    _inMarkOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
      ),
    );
    _inMarkSlide = Tween<Offset>(begin: const Offset(0.2, 0), end: Offset.zero)
        .animate(
          CurvedAnimation(parent: _textController, curve: Curves.easeOutCubic),
        );

    // Tagline
    _taglineController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _taglineOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _taglineController, curve: Curves.easeOut),
    );
    _taglineSlide = Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _taglineController,
            curve: Curves.easeOutCubic,
          ),
        );

    // Dot pulse
    _dotPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _dotScale = Tween<double>(begin: 0.85, end: 1.2).animate(
      CurvedAnimation(parent: _dotPulseController, curve: Curves.easeInOut),
    );

    // Particles
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );
    _particleOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _particleController,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOut),
      ),
    );
  }

  void _startAnimations() async {
    _bgController.forward();
    _particleController.forward();

    await Future.delayed(const Duration(milliseconds: 200));
    _logoController.forward();

    await Future.delayed(const Duration(milliseconds: 600));
    _textController.forward();

    await Future.delayed(const Duration(milliseconds: 400));
    _taglineController.forward();
  }

  @override
  void dispose() {
    _bgController.dispose();
    _logoController.dispose();
    _textController.dispose();
    _taglineController.dispose();
    _dotPulseController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  void redirectToDashboard() async {
    // Splash delay
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;
    // Navigate to Dashboard
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const MainWebView()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: AnimatedBuilder(
        animation: Listenable.merge([
          _bgAnimation,
          _logoController,
          _textController,
          _taglineController,
          _dotScale,
          _particleOpacity,
        ]),
        builder: (context, child) {
          return Stack(
            fit: StackFit.expand,
            children: [
              // ── Animated background ──────────────────────────────────
              _buildBackground(size),

              // ── Floating particles ───────────────────────────────────
              Opacity(
                opacity: _particleOpacity.value,
                child: CustomPaint(
                  size: size,
                  painter: ParticlePainter(progress: _particleController.value),
                ),
              ),

              // ── Main content ─────────────────────────────────────────
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Traveller icon
                    SlideTransition(
                      position: _logoSlide,
                      child: FadeTransition(
                        opacity: _logoOpacity,
                        child: ScaleTransition(
                          scale: _logoScale,
                          child: _buildTravellerIcon(),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Logo wordmark row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // "travellers"
                        SlideTransition(
                          position: _travellersSlide,
                          child: FadeTransition(
                            opacity: _travellersOpacity,
                            child: Text(
                              'travellers',
                              style: TextStyle(
                                fontFamily: 'Georgia',
                                fontSize: 34,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 1.2,
                                shadows: [
                                  Shadow(
                                    color: Colors.black.withOpacity(0.18),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 6),

                        // "in" mark with animated dot
                        SlideTransition(
                          position: _inMarkSlide,
                          child: FadeTransition(
                            opacity: _inMarkOpacity,
                            child: _buildInMark(),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Tagline
                    SlideTransition(
                      position: _taglineSlide,
                      child: FadeTransition(
                        opacity: _taglineOpacity,
                        child: Text(
                          'Explore. Connect. Belong.',
                          style: TextStyle(
                            fontFamily: 'Georgia',
                            fontSize: 14,
                            fontStyle: FontStyle.italic,
                            color: Colors.white.withOpacity(0.75),
                            letterSpacing: 2.0,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Bottom loading bar ────────────────────────────────────
              Positioned(
                bottom: 52,
                left: 0,
                right: 0,
                child: FadeTransition(
                  opacity: _taglineOpacity,
                  child: _buildLoadingBar(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBackground(Size size) {
    final t = _bgAnimation.value;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(const Color(0xFF1A3A2A), const Color(0xFF0D2B1E), t)!,
            Color.lerp(const Color(0xFF2D6A4F), const Color(0xFF1B4332), t)!,
            Color.lerp(const Color(0xFF1A3A2A), const Color(0xFF081C15), t)!,
          ],
          stops: const [0.0, 0.5, 1.0],
        ),
      ),
    );
  }

  Widget _buildTravellerIcon() {
    return Container(
      width: 110,
      height: 110,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withOpacity(0.08),
        border: Border.all(
          color: const Color(0xFF2ECC71).withOpacity(0.4),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2ECC71).withOpacity(0.25),
            blurRadius: 32,
            spreadRadius: 4,
          ),
        ],
      ),
      child: Center(
        child: CustomPaint(
          size: const Size(60, 60),
          painter: TravellerIconPainter(),
        ),
      ),
    );
  }

  Widget _buildInMark() {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        // The arch / pin shape
        CustomPaint(size: const Size(36, 42), painter: InMarkPainter()),
        // Animated green dot on top
        Positioned(
          top: -4,
          right: 2,
          child: Transform.scale(
            scale: _dotScale.value,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2ECC71),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2ECC71).withOpacity(0.7),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingBar() {
    return Column(
      children: [
        SizedBox(
          width: 160,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              backgroundColor: Colors.white.withOpacity(0.12),
              valueColor: const AlwaysStoppedAnimation<Color>(
                Color(0xFF2ECC71),
              ),
              minHeight: 3,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Discovering journeys...',
          style: TextStyle(
            fontFamily: 'Georgia',
            fontSize: 11,
            color: Colors.white.withOpacity(0.4),
            letterSpacing: 1.5,
          ),
        ),
      ],
    );
  }
}

// ─── Traveller Icon Painter ──────────────────────────────────────────────────

class TravellerIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF2ECC71)
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;

    // Head
    canvas.drawCircle(Offset(w * 0.52, h * 0.13), w * 0.11, paint);

    // Body (torso leaning forward)
    final bodyPath = Path()
      ..moveTo(w * 0.52, h * 0.25)
      ..lineTo(w * 0.35, h * 0.55)
      ..lineTo(w * 0.42, h * 0.57)
      ..lineTo(w * 0.50, h * 0.40)
      ..lineTo(w * 0.60, h * 0.57)
      ..lineTo(w * 0.68, h * 0.55)
      ..close();
    canvas.drawPath(bodyPath, paint);

    // Left leg
    final leftLeg = Path()
      ..moveTo(w * 0.42, h * 0.57)
      ..lineTo(w * 0.30, h * 0.82)
      ..lineTo(w * 0.38, h * 0.84)
      ..lineTo(w * 0.48, h * 0.60)
      ..close();
    canvas.drawPath(leftLeg, paint);

    // Right leg
    final rightLeg = Path()
      ..moveTo(w * 0.60, h * 0.57)
      ..lineTo(w * 0.72, h * 0.78)
      ..lineTo(w * 0.64, h * 0.82)
      ..lineTo(w * 0.52, h * 0.60)
      ..close();
    canvas.drawPath(rightLeg, paint);

    // Left arm (swinging forward)
    final leftArm = Path()
      ..moveTo(w * 0.47, h * 0.30)
      ..lineTo(w * 0.22, h * 0.48)
      ..lineTo(w * 0.26, h * 0.54)
      ..lineTo(w * 0.50, h * 0.38)
      ..close();
    canvas.drawPath(leftArm, paint);

    // Right arm (back, holding walking stick)
    final rightArm = Path()
      ..moveTo(w * 0.57, h * 0.30)
      ..lineTo(w * 0.75, h * 0.44)
      ..lineTo(w * 0.72, h * 0.50)
      ..lineTo(w * 0.54, h * 0.37)
      ..close();
    canvas.drawPath(rightArm, paint);

    // Walking stick
    final stickPaint = Paint()
      ..color = const Color(0xFF2ECC71)
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawLine(
      Offset(w * 0.75, h * 0.44),
      Offset(w * 0.85, h * 0.88),
      stickPaint,
    );

    // Backpack
    final packPaint = Paint()
      ..color = const Color(0xFF27AE60)
      ..style = PaintingStyle.fill;
    final packPath = Path()
      ..moveTo(w * 0.55, h * 0.26)
      ..lineTo(w * 0.70, h * 0.30)
      ..lineTo(w * 0.72, h * 0.50)
      ..lineTo(w * 0.57, h * 0.48)
      ..close();
    canvas.drawPath(packPath, packPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── "in" Mark Painter ───────────────────────────────────────────────────────

class InMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF555555)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round;

    final w = size.width;
    final h = size.height;

    // Left vertical bar of "i"
    canvas.drawLine(
      Offset(w * 0.18, h * 0.28),
      Offset(w * 0.18, h * 0.90),
      paint,
    );

    // Right arch (like a location pin / "n" shape)
    final archPath = Path()
      ..moveTo(w * 0.42, h * 0.28)
      ..lineTo(w * 0.42, h * 0.90)
      ..moveTo(w * 0.42, h * 0.28)
      ..cubicTo(w * 0.42, h * 0.10, w * 0.88, h * 0.10, w * 0.88, h * 0.40)
      ..lineTo(w * 0.88, h * 0.90);
    canvas.drawPath(archPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Particle Painter ────────────────────────────────────────────────────────

class ParticlePainter extends CustomPainter {
  final double progress;

  ParticlePainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final rng = math.Random(42);
    final paint = Paint()..style = PaintingStyle.fill;

    for (int i = 0; i < 28; i++) {
      final x = rng.nextDouble() * size.width;
      final baseY = rng.nextDouble() * size.height;
      // Float upward slowly
      final y = baseY - (progress * 60 * rng.nextDouble());
      final radius = rng.nextDouble() * 2.8 + 0.6;
      final opacity =
          (rng.nextDouble() * 0.35 + 0.05) *
          (i.isEven ? progress : (1 - progress * 0.4));

      paint.color = (i % 3 == 0 ? const Color(0xFF2ECC71) : Colors.white)
          .withOpacity(opacity.clamp(0.0, 1.0));

      canvas.drawCircle(Offset(x, y), radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) =>
      oldDelegate.progress != progress;
}
