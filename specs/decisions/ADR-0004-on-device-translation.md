# ADR-0004: Automatic translation happens on the reader's device

- Status: Accepted
- Date: 2026-07-19

## Context

Content repositories author their specs in one language (English for illo3d),
but readers should be able to read the wiki in their own.
Server-side translation would contradict ADR-0001's no-server architecture,
and translation services need keys, quotas and someone to pay for them.

## Decision

Translate the rendered page in the reader's browser
with the browser's built-in Translator API:

- The language selector (a fixed set of common languages)
  appears only when the browser exposes the API;
  everywhere else the wiki simply stays in its source language.
- Translation rewrites the rendered page's text nodes in place;
  code — fenced blocks, inline code, keyboard keys — is never translated.
- The chosen language persists and applies to every page shown;
  "Original" restores the untranslated rendering.
- Translations are cached per session as promises,
  so a phrase is translated once even when it repeats concurrently,
  and failed translations are evicted rather than poisoning the cache.
- When a language pair is unavailable the page stays in English
  under a notice saying so.

## Consequences

- Zero cost, zero keys, zero content sent to third-party services —
  the model runs on the device.
- Coverage is browser-dependent (Chromium ships the API first);
  other browsers get the untranslated wiki with no degraded chrome.
- Translation quality is whatever the local model provides;
  the canonical text remains the English source on GitHub.
