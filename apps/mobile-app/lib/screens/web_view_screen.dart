import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show isSkiaWeb, kIsWeb;

class MainWebView extends StatefulWidget {
  const MainWebView({super.key});

  @override
  State<MainWebView> createState() => _MainWebViewState();
}

class _MainWebViewState extends State<MainWebView> {
  InAppWebViewController?
  _webViewController; // Handles navigation inside the webview
  //bool isLoading = true;

  ValueNotifier<bool> isLoading = ValueNotifier(true);

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.white,
        statusBarIconBrightness: Brightness.dark,
      ),
    );
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
                initialSettings: InAppWebViewSettings(
                  mediaPlaybackRequiresUserGesture: false,
                  allowsInlineMediaPlayback: true,
                  useHybridComposition: true, // Android: better perf
                  allowFileAccessFromFileURLs: true,
                  allowUniversalAccessFromFileURLs: true,
                ),
                onDownloadStartRequest:
                    (controller, downloadStartRequest) async {
                      await _downloadFile(downloadStartRequest.url.toString());
                    },
                onLoadStart: (controller, url) {
                  isLoading.value = true;
                },
                onLoadStop: (controller, url) {
                  isLoading.value = false;
                },
              ),

              ValueListenableBuilder(
                valueListenable: isLoading,
                builder: (context, value, child) {
                  if (!value) return SizedBox();
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0XFF30c99d)),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _downloadFile(String url) async {
    var dir = await getExternalStorageDirectory(); // Android

    // iOS: use getApplicationDocumentsDirectory()
    if (!kIsWeb && Platform.isIOS) {
      dir = await getApplicationDocumentsDirectory(); // IOS
    }

    final filename = url.split('/').last;
    final savePath = '${dir!.path}/$filename';

    try {
      await Dio().download(url, savePath);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Saved: $filename')));
    } catch (e) {
      debugPrint('Download error: $e');
    }
  }
}
