import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class MainWebView extends StatefulWidget {
  const MainWebView({super.key});

  @override
  State<MainWebView> createState() => _MainWebViewState();
}

class _MainWebViewState extends State<MainWebView> {
  InAppWebViewController?
  _webViewController; // Handles navigation inside the webview
  bool isLoading = true;
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (await _webViewController?.canGoBack() ?? false) {
          await _webViewController?.goBack();
        } else {
          if (!mounted) return;
          Navigator.of(this.context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              InAppWebView(
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                },
                initialUrlRequest: URLRequest(
                  url: WebUri('https://travellersin.com'),
                ),
                onLoadStart: (controller, url) {
                  setState(() {
                    isLoading = true;
                  });
                },
                onLoadStop: (controller, url) {
                  setState(() {
                    isLoading = false;
                  });
                },
              ),

              if (isLoading) const Center(child: CircularProgressIndicator(color: Color(0XFF30c99d),)),
            ],
          ),
        ),
      ),
    );
  }
}
