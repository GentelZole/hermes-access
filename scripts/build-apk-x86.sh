#!/usr/bin/env bash
export ANDROID_HOME=/home/moe/Android/Sdk
cd /home/moe/projects/hermes-access/app/android
./gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64 --console=plain > /tmp/ha-build-x86.log 2>&1
echo "GRADLE_DONE exit=$?" >> /tmp/ha-build-x86.log
