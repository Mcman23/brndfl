# Reviewer Briefing — Round 1

## Mission
Review and verify the implementation of Hero Media Integration (R1) between Admin Panel Settings and the main page Hero section (`index.html`), as well as the Clean System Verification (R2) ensuring legacy backup files are absent from root.

## Scope of Review
1. Actively challenge and stress-test the implementer's changes in `index.html` and `js/app.js`.
2. Evaluate critical edge cases:
   - What happens when BOTH `showreelVideoUrl` and `showreelPosterUrl` are provided?
   - What happens during dynamic state switching (video -> poster -> both -> none)?
   - Are video elements injected with compliant cross-browser autoplay attributes (`muted`, `playsinline`, `webkit-playsinline`, `autoplay`, `loop`)?
   - Is the lightbox video modal (`#modalVideo`) properly synchronized in source and poster?
3. Verify directory hygiene (R2).
4. Direct fix of flaws identified and full verification record.
