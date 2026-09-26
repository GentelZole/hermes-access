<!--
Thanks for the PR. Keep the description honest and specific: what changed, why, and how you
verified it. Unverified native changes will be asked for a boot test before review.
-->

## What changed

<!-- One or two sentences. Link the issue if there is one: Closes #123 -->

## Why

<!-- The problem being solved. If this is a behaviour change, say what it changes for users. -->

## How it was verified

<!--
Be concrete. "tsc passes" is table stakes. For UI work: which screen, which identity theme,
which language. For bridge work: which endpoint, which status codes.
-->

- [ ] `cd app && npx tsc --noEmit` — clean
- [ ] Ran on: <!-- device / emulator x86_64 / dev build — say which -->
- [ ] Screenshots or recording attached for visible changes

## Checklist

- [ ] Scope matches the title; no unrelated refactors
- [ ] No secrets, keys, tokens, pairing codes, personal hostnames, or real gateway addresses added anywhere
- [ ] Docs updated if behaviour, config, or API shapes changed (README / docs/ARCHITECTURE.md / SECURITY.md)
- [ ] Commits follow the conventional-commit convention in docs/CONTRIBUTING.md
- [ ] **Native module added, removed, or bumped?** Built for `x86_64`, booted on an emulator, and `adb logcat -d | grep -i "FATAL EXCEPTION"` returned nothing
- [ ] **Touched pairing, token storage, or transport?** Flagged in the description below — these paths get a closer review
- [ ] **Touches `bridge/server.py` auth or `app/src/gateway/store.ts`?** Flagged below for a security-focused review

## Review notes

<!--
Anything a reviewer should know before reading the diff: risk areas, follow-ups you deliberately
left out, or parts you are unsure about. "I'm not confident about X" is welcome here.
-->