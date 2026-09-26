#!/usr/bin/env bash
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
cd "$(dirname "$0")/../app/android"
./gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64 --console=plain > /tmp/ha-build-x86.log 2>&1
echo "GRADLE_DONE exit=$?" >> /tmp/ha-build-x86.log
