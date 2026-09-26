---
name: Feature request
about: Suggest a capability for the app or the bridge
title: "[Feature]: "
labels: ["enhancement"]
---

## What problem does this solve?

<!--
Describe the gap you are hitting, not the solution. "I can't tell whether a long cron run
finished while the app is closed" is more useful than "add push notifications".
-->

## Proposed behaviour

<!-- What you would like the app or bridge to do. Keep it to observable behaviour. -->

## Which surface does this touch?

- [ ] App UI (screen / navigation)
- [ ] Gateway client (`app/src/gateway/client.ts`)
- [ ] Connection / token storage (`app/src/gateway/store.ts`)
- [ ] Pairing bridge (`bridge/server.py`)
- [ ] Voice relay
- [ ] Docs
- [ ] Build / tooling
- [ ] Native module (needs an on-device boot test per CONTRIBUTING.md)

## Does it require a server-side change?

<!--
This client can only do what the Hermes API Server and the bridge expose. If the feature needs
a new endpoint in the gateway or the bridge, say so — that changes who can implement it.
-->

## Is it already on the roadmap?

<!-- Check the Roadmap section in README.md. Duplicates are welcome, but say so. -->

## Alternatives you considered

<!-- Including "do nothing, because the workaround is X" — that is a valid answer. -->

## Anything else

<!-- Mockups, similar apps, references. -->