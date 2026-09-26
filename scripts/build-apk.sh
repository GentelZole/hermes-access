#!/usr/bin/env bash
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
cd "$(dirname "$0")/../app/android"
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain > /tmp/ha-build.log 2>&1
echo "GRADLE_DONE exit=$?" >> /tmp/ha-build.log
