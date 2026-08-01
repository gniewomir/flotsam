# Chrome `Tab.audible` vs `Tab.mutedInfo.muted`

**Verdict: Yes — a muted tab can still be `audible === true`.** Chrome’s Tabs API treats “recently producing sound” (`audible`) and “output silenced” (`mutedInfo.muted`) as independent flags. Official docs explicitly say sound “might not be heard if also muted,” and Chromium wires mute and audible updates on separate paths. Muting does **not** clear `audible`. This is **not** a non-issue for Flotsam: gating never-auto-close on `tab.audible === true` alone will treat muted-but-playing tabs as Audible, which conflicts with a product rule that muted tabs are not Audible.

Research date: 2026-08-01.

## Findings

### 1. Official definitions (`audible` vs `mutedInfo`)

Chrome Extensions Tabs API ([developer.chrome.com/docs/extensions/reference/api/tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)):

| Property          | Official meaning                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab.audible`     | “Whether the tab has produced sound over the past couple of seconds **(but it might not be heard if also muted)**. Equivalent to whether the 'speaker audio' indicator is showing.” (Chrome 45+)           |
| `Tab.mutedInfo`   | “The tab's muted state and the reason for the last state change.” (Chrome 46+)                                                                                                                             |
| `MutedInfo.muted` | “Whether the tab is muted (prevented from playing sound). The tab may be muted even if it has not played or is not currently playing sound. Equivalent to whether the 'muted' audio indicator is showing.” |

The parenthetical in `audible` is the contract answer: **both can be true at once**. `audible` tracks production / the speaker indicator; `muted` tracks whether output is prevented / the muted indicator.

The same wording is the Chromium IDL source of truth in [`chrome/common/extensions/api/tabs.json`](https://chromium.googlesource.com/chromium/src/+/main/chrome/common/extensions/api/tabs.json) (`Tab.audible`: “but it might not be heard if also muted”; `MutedInfo.muted`: prevented from playing sound, may be muted without recent sound).

MDN’s `tabs.Tab` (derived from Chromium `tabs.json`) restates the same split: `audible` means the tab is producing sound, “However, the user will not hear the sound if the tab is muted (see the `mutedInfo` property).” ([MDN tabs.Tab](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab))

### 2. What `tabs.onUpdated` `changeInfo` contains on mute/unmute

Chrome documents `changeInfo` as able to carry either field independently ([onUpdated `changeInfo`](https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onUpdated)):

- `changeInfo.audible` — “The tab's new audible state.”
- `changeInfo.mutedInfo` — “The tab's new muted state and the reason for the change.”

Chromium’s event router shows mute and audible are **separate update keys**, not one combined flip:

- Mute path: `DidUpdateAudioMutingState` → `TabUpdated(..., { "mutedInfo" })` only.  
  Source: [`tabs_event_router.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/api/tabs/tabs_event_router.cc) (`TabEntry::DidUpdateAudioMutingState`).
- Audible path: `OnRecentlyAudibleStateChanged` → `TabUpdated(..., { "audible" })` only.  
  Same file (`TabEntry::OnRecentlyAudibleStateChanged`), driven by [`RecentlyAudibleHelper`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/ui/recently_audible_helper.h) (≈2s “recently audible” timeout after sound stops).

**Implication:** when the user mutes/unmutes a still-playing tab, Chrome should fire `onUpdated` with `changeInfo.mutedInfo` and **should not** flip `changeInfo.audible` merely because mute toggled. `audible` changes when recently-produced-sound state changes, not when mute state changes.

**Note on MDN wording:** MDN’s `tabs.onUpdated` page says muting/unmuting “updates the `audible` and `mutedInfo` properties” ([MDN tabs.onUpdated](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated)). That sentence is broader than Chromium’s mute handler (which only queues `mutedInfo`). Prefer Chrome docs + Chromium source for Chrome behavior; treat the MDN phrase as imprecise for mute-only updates.

### 3. Chromium evidence: mute does not clear audibility

How the extension `Tab` object is built ([`extension_tab_util.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/extension_tab_util.cc)):

- `tab.audible` ← `RecentlyAudibleHelper::WasRecentlyAudible()` (or `WebContents::IsCurrentlyAudible()` if no helper).
- `tab.mutedInfo` ← `CreateMutedInfo()` using `contents->IsAudioMuted()` (and mute reason metadata).

Those are independent reads of independent WebContents signals.

How mute is applied ([`WebContentsImpl::SetAudioMuted`](https://chromium.googlesource.com/chromium/src/+/main/content/browser/web_contents/web_contents_impl.cc)):

- Sets the audio factory muted flag and notifies `DidUpdateAudioMutingState`.
- Does **not** clear `is_currently_audible_`.

How “currently audible” is maintained (same file, `OnAudioStateChanged`):

- Aggregates `AudioStreamMonitor::IsCurrentlyAudible()` (and guests / inner contents).
- Independent of the mute flag.

So at the content layer: **streams can still be “audible” while output is muted.** The Tabs API surfaces that as `audible: true` + `mutedInfo.muted: true`, matching the speaker-vs-muted indicators described in the docs.

Historical context: audible and muted were exposed to extensions as parallel states (Chromium review [757033005](https://codereview.chromium.org/757033005), BUG=438903), not as a single mutually exclusive enum.

### 4. Implications for Flotsam’s product rule

Product rule under discussion: **“Audible = browser reports playing sound; muted tabs and silent playback are not Audible.”**

| Claim in the product rule               | Chrome API reality                                                                               | Fit                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Audible ≈ browser reports playing sound | Closest signal is `tab.audible === true` (recent sound / speaker indicator)                      | Partial — use `audible`, but not alone if muted must be excluded |
| Muted tabs are **not** Audible          | Chrome can report `audible: true` while `mutedInfo.muted: true`                                  | **Mismatch** if code only checks `audible`                       |
| Silent playback is not Audible          | Docs tie `audible` to producing sound / speaker indicator; silent streams are not that indicator | Aligned for typical silent playback (not re-verified live here)  |

**Current Flotsam gap (from question context):** never-auto-close gated on `tab.audible === true` only, with no `mutedInfo` check.

**API-faithful encoding of the product rule** would be along the lines of:

```js
const isAudibleForProduct = tab.audible === true && tab.mutedInfo?.muted !== true;
```

(Exact nullish handling for missing `mutedInfo` should follow whatever Chrome guarantees for normal tabs; docs mark `mutedInfo` optional.)

**Bottom line:** Chrome does **not** already clear `audible` when muted. Relying on `audible` alone is insufficient for “muted tabs are not Audible.”

## What remains empirically unverified

These points are strongly implied by docs/IDL/source but were **not** exercised with a live extension in a running Chrome build for this note:

1. Exact `changeInfo` payload when muting a currently playing tab (source says `mutedInfo` only; not logged in a live session).
2. Whether any niche mute reason (`capture`, content settings, etc.) ever co-fires an `audible` change.
3. Edge cases for silent `<audio>` / Web Audio that still mark the tab audible (or not) in current Chrome UI.
4. Whether `mutedInfo` is always present on normal `chrome.tabs.Tab` objects in practice (schema marks it optional).

None of these threaten the core verdict: the documented and implemented contract allows `audible: true` with `mutedInfo.muted: true`.

## Sources

1. [chrome.tabs API — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/tabs) — `Tab.audible`, `MutedInfo`, `onUpdated` `changeInfo`
2. [Chromium `tabs.json` IDL (main)](https://chromium.googlesource.com/chromium/src/+/main/chrome/common/extensions/api/tabs.json) — canonical property descriptions
3. [MDN `tabs.Tab`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab) — Chromium-derived; audible vs muted wording
4. [MDN `tabs.onUpdated`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated) — changeInfo shape; mute wording noted as broader than Chromium mute path
5. [Chromium `tabs_event_router.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/api/tabs/tabs_event_router.cc) — mute → `mutedInfo` only; recently audible → `audible` only
6. [Chromium `extension_tab_util.cc`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/extension_tab_util.cc) — `audible` and `mutedInfo` populated independently
7. [Chromium `recently_audible_helper.h`](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/ui/recently_audible_helper.h) — “audio playing” icon / recently-audible timeout
8. [Chromium `web_contents_impl.cc`](https://chromium.googlesource.com/chromium/src/+/main/content/browser/web_contents/web_contents_impl.cc) — `SetAudioMuted` vs `IsCurrentlyAudible` / `OnAudioStateChanged`
9. [Chromium code review 757033005](https://codereview.chromium.org/757033005) — audible and muted exposed as parallel extension API state
