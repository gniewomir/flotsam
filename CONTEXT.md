# Flotsam

Browser extension that auto-closes tabs after a set time unless you explicitly keep them open.

## Language

**Flotsam**:
A browser extension that auto-closes tabs after a set time unless you explicitly keep them open.
_Avoid_: temporary-tab manager, tab cleaner

**Tab**:
A browser tab Flotsam may schedule for auto-close, keep open, or ignore.

**Managed tab**:
A tab with a normal http or https address — the only kind Flotsam applies to.
_Avoid_: managed URL, normal web domain (as the noun for the tab)

**Anchored**:
A managed tab the user has marked to stay open until they unanchor it.
_Avoid_: pinned, kept, saved

**Floating**:
A managed tab that is not anchored — subject to auto-close unless Focused, Pinned, Grouped, Audible, or on an Excluded domain. Canonical opposite of Anchored; “will auto-close” is explanatory copy, not the state name.
_Avoid_: temporary, unanchored (as the primary name), will auto-close (as the state name)

**Anchor**:
The action of marking the current managed tab as Anchored.

**Unanchor**:
The action of clearing Anchored so the tab becomes Floating again.

**Auto-close**:
Flotsam closing a tab when its countdown finishes and no never-auto-close reason applies.

**Auto-close timeout**:
The user-configured duration in minutes used for each countdown. Default 15.
_Avoid_: timer (for the setting), alarm

**Countdown**:
The running per-tab wait that ends in auto-close or a reschedule.
_Avoid_: timer (prefer Countdown), alarm (implementation)

**Excluded domain**:
A hostname the user opts out of auto-close for; exclusion also covers its subdomains.
_Avoid_: blocked domain, whitelist, blacklist

**Focused**:
The tab the user is currently looking at. Flotsam does not auto-close it.
_Avoid_: active (Chrome API term; keep that in implementation talk only)

**Pinned**:
A tab the browser marks as pinned. Flotsam does not auto-close it.

**Grouped**:
A tab that belongs to a browser tab group. Flotsam does not auto-close it.

**Audible**:
A tab the browser reports as playing sound. Flotsam does not auto-close it. Muted tabs and silent playback are not Audible.

**Flotsam Settings**:
The page where the user configures auto-close timeout and excluded domains. Short form: Settings.
_Avoid_: Options (Chrome page-type / manifest term; keep that in implementation talk only)

_Avoid as umbrella_: Protected tab, protected — name the specific reason instead (Focused, Anchored, Pinned, Grouped, Audible, Excluded domain, or not a Managed tab).
