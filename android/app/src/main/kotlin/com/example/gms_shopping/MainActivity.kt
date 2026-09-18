package com.example.gms_shopping

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.media.MediaPlayer
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import io.flutter.FlutterInjector
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterFragmentActivity() {
    private val notificationSoundChannel = "gms_shopping/notification_sound"
    private var mediaPlayer: MediaPlayer? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        flutterEngine
            .platformViewsController
            .registry
            .registerViewFactory(
                "gms_shopping/model_viewer",
                ProductModelViewerFactory(),
            )

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            notificationSoundChannel,
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "playNotificationSound" -> {
                    playNotificationSound()
                    result.success(null)
                }

                else -> result.notImplemented()
            }
        }
    }

    private fun playNotificationSound() {
        try {
            val assetKey = FlutterInjector.instance()
                .flutterLoader()
                .getLookupKeyForAsset("assets/sounds/notif.mp3")
            val cachedSoundFile = File(cacheDir, "notif.mp3")

            if (!cachedSoundFile.exists()) {
                assets.open(assetKey).use { input ->
                    FileOutputStream(cachedSoundFile).use { output ->
                        input.copyTo(output)
                    }
                }
            }

            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(cachedSoundFile.absolutePath)
                setOnCompletionListener { player ->
                    player.release()
                    if (mediaPlayer === player) {
                        mediaPlayer = null
                    }
                }
                setOnErrorListener { player, _, _ ->
                    player.release()
                    if (mediaPlayer === player) {
                        mediaPlayer = null
                    }
                    true
                }
                prepare()
                start()
            }
        } catch (_: Exception) {
            // Fallback handling stays in Dart when native playback is unavailable.
        }
    }

    override fun onDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
        super.onDestroy()
    }
}

private class ProductModelViewerFactory : PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, viewId: Int, args: Any?): PlatformView {
        val params = args as? Map<*, *> ?: emptyMap<Any, Any>()
        val modelUrl = params["modelUrl"]?.toString().orEmpty()
        val productName = params["productName"]?.toString().orEmpty()
        return ProductModelViewerView(context, modelUrl, productName)
    }
}

private class ProductModelViewerView(
    context: Context,
    private val modelUrl: String,
    private val productName: String,
) : PlatformView {
    private val webView = WebView(context)

    init {
        configureWebView()
        webView.loadDataWithBaseURL(
            "https://gms-shopping.local/",
            buildModelViewerHtml(modelUrl, productName),
            "text/html",
            "UTF-8",
            null,
        )
    }

    override fun getView(): View = webView

    override fun dispose() {
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.destroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.WHITE)
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowContentAccess = true
            allowFileAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
    }

    private fun buildModelViewerHtml(modelUrl: String, productName: String): String {
        val safeModelUrl = escapeHtml(modelUrl)
        val safeProductName = escapeHtml(productName.ifBlank { "Product 3D model" })
        return """
            <!doctype html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
                <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
                <style>
                  html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    overflow: hidden;
                    background: #ffffff;
                    touch-action: none;
                  }

                  model-viewer {
                    width: 100%;
                    height: 100%;
                    background: #ffffff;
                    --poster-color: transparent;
                  }

                  .loading {
                    position: fixed;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: transparent;
                    pointer-events: none;
                  }

                  .spinner {
                    width: 38px;
                    height: 38px;
                    border: 4px solid rgba(15, 23, 42, 0.14);
                    border-top-color: rgba(15, 23, 42, 0.82);
                    border-radius: 999px;
                    animation: spin 0.9s linear infinite;
                  }

                  .loading.is-hidden {
                    display: none;
                  }

                  @keyframes spin {
                    to {
                      transform: rotate(360deg);
                    }
                  }
                </style>
                <script>
                  window.addEventListener('DOMContentLoaded', function () {
                    var viewer = document.querySelector('model-viewer');
                    var loading = document.querySelector('.loading');
                    if (!viewer || !loading) {
                      return;
                    }
                    viewer.addEventListener('load', function () {
                      loading.classList.add('is-hidden');
                    });
                  });
                </script>
              </head>
              <body>
                <model-viewer
                  src="$safeModelUrl"
                  alt="$safeProductName"
                  camera-controls
                  interaction-prompt="none"
                  shadow-intensity="0.72"
                  exposure="1"
                ></model-viewer>
                <div class="loading"><div class="spinner"></div></div>
              </body>
            </html>
        """.trimIndent()
    }

    private fun escapeHtml(value: String): String {
        return value
            .replace("&", "&amp;")
            .replace("\"", "&quot;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
    }
}
