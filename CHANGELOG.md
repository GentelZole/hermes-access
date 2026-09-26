# Changelog

All notable changes to Hermes Access are documented here.

## v0.4.5 — 2026-09-27
* **Voice:** relay requests now try the pairing-bridge origin first, then the
  agent origin — fixes "Connection failed" when the two live on different hosts
* **Voice:** recording URIs without a `file://` scheme are normalised before upload
* **Voice:** dedicated server-side rate-limit zone (the pairing zone was
  throttling legitimate mid-conversation turns into 429s)
* **Settings:** new "Audio Conversation" row under CONNECTION
* **Voice:** barge-in — tapping while the agent speaks stops playback and opens
  the microphone in the same action

## v0.4.4
* Replaced `expo-av` with `expo-audio` (the old module crashed at launch under
  React Native 0.86's new architecture)

## v0.4.3
* Voice conversation screen: push-to-talk loop
  (record → STT → agent stream → TTS → playback)

## v0.4.2
* Public HTTPS endpoints — pairing no longer requires a VPN/Tailscale connection

## v0.4.1
* Auth header fix, token migration, hardened network security config
