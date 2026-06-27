// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

bool redirectToLoginHtmlIfSupported() {
  html.window.location.href = '/login.html';
  return true;
}
