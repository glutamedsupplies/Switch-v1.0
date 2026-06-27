import 'package:lottie/lottie.dart';

const int appTargetMotionFps = 60;
const int _appMotionFrameMicros = 16667;
const FrameRate appLottieFrameRate = FrameRate.max;

Duration appMotionFrames(int frameCount) {
  final safeFrameCount = frameCount < 1 ? 1 : frameCount;
  return Duration(microseconds: _appMotionFrameMicros * safeFrameCount);
}
