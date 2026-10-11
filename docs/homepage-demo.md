# Homepage demonstration — v2

> Archived media implementation: the current homepage cover now uses a lightweight sequence-alignment animation and the selected B brand mark. It no longer renders or requests these videos. The workflow, methods and footer remain unchanged. The media below is retained as production history.

## Current revision: sharper media and MSA focus

The current homepage uses `public/media/home/v2/`. New source images were rendered at double density (2560 × 1800 browser viewport, dev-only `?demo-capture=2` before the hash route), then encoded at **2304 × 1296**, 25 fps, 40 seconds. This is fresh UI rendering, not enlargement of v1 images. MP4 uses H.264 CRF 14 and WebM uses VP9 CRF 18; posters are lossless WebP. Each video is about 3 MiB. Posters are about 0.85 MiB, prioritizing the requested sharp text over the previous poster size target. Exact sizes and hashes are in the v2 manifest.

Result scenes use the public interactive synthetic example, whose output was previously verified identical to the actual demo task. Upload/settings use real form captures; the timeline uses the previously approved credential-free synthetic demo-task crop. The videos remain edited real UI frames, not continuous recordings. The public overview is cropped to its complete summary, with no unavailable preprocessing fields.

Playback now defaults to **muted autoplay on desktop and mobile** when visible, including reduced-motion environments, following the latest user request. Explicit pause is preserved. Offscreen/background pauses and browser-blocked manual-play fallback remain available. The earlier v1 manual/mobile behavior below is historical.

The hero is now “核酸多序列比对” / “Multiple nucleotide sequence alignment”. The main method list contains MiniPOA, HAlign4, FMAlign2 and MAFFT. ReAlign-N remains a secondary optional link.

Revision verification: 58 files / 284 frontend tests passed; final player suite 20/20 passed; TypeScript and production build passed. Real Chromium checks confirmed 2304 × 1296 muted autoplay after reload at desktop and mobile widths, and language switching to English media. No horizontal overflow at 1440 × 900 and 390 × 844. Evidence is in `C:/mnt/d/code/easymsa-home-hd`; see the v2 entry in `design-qa.md`. No publication or backend deployment.

## Historical v1 implementation evidence

Date: 2026-10-04. Scope: local homepage implementation; no publication or backend deployment.

## Public assets

`public/media/home/v1/` contains the Chinese and English MP4/WebM videos, WebP posters and `provenance.json`. Paths are resolved through Vite's `/easymsa/` base. Each language is a 40-second, silent, 1184 × 668 walkthrough. The browser chooses one format and loads only the current language.

| Asset | Bytes |
| --- | ---: |
| Chinese MP4 | 570,079 |
| Chinese WebM | 796,903 |
| English MP4 | 554,903 |
| English WebM | 876,689 |
| Chinese poster | 60,534 |
| English poster | 59,076 |

The manifest records SHA-256 values for every video, poster and reviewed source frame. All videos are below the 8 MiB target and both posters are below 250 KiB.

## Source and real computation

- Public synthetic input: `public/examples/v1/alignment-small/input.fasta` (20 DNA sequences; seed 20261002).
- A new real task was submitted through the browser file chooser, with MiniPOA, Audit, refinement disabled and email empty.
- The completed result was downloaded through the results page as `alignment.fasta.gz`.
- Download verification: 20 unique IDs, all sequences 515 columns, IDs match the effective Audit input, and ungapped sequences match that input by ID. The result is byte-identical to the existing public `final.fasta`.
- Input SHA-256: `890f3518de5e51975df334bc7738cff7122731da8b31f5e8bd1119162e3ae2c5`.
- Decompressed output SHA-256: `4d024fc7fe4e30bd2c8e2cab8354ee2fd09f2dab1bfdb27bcd372ba5655e5cae`.

The videos are edited sequences of screenshots from these real browser interactions, not an uninterrupted screen recording. They show file selection, selected input, configuration, completed stage timeline, statistics, viewer, motif search, selected region and download controls. Computation waiting time is omitted and labelled in both languages. The public poster comes from the real viewer. No generated mockup UI is included.

## Editing and reproduction

`scripts/prepare-home-demo.py` requires Pillow, a local FFmpeg with H.264/VP9/WebP support, and a CJK font. These are asset-production tools, not website dependencies. This edition used FFmpeg 7.0.2.

```sh
python3 scripts/prepare-home-demo.py \
  --captures /path/to/private-reviewed-captures \
  --review-dir /path/to/reviewed-frames \
  --output public/media/home/v1 \
  --ffmpeg /path/to/ffmpeg \
  --font /path/to/cjk-font.ttc
```

The captures directory contains `cuts.json`, `integrity.json` and the actual screenshots. `cuts.json` maps language/scene names to a file and its reviewed crop (`x`, `y`, `width`, `height`). The timeline sources are already tightly cropped credential-free regions. The script normalizes those crops, encodes the two formats and writes the public manifest. Review all final crops before using this script with new material. Raw private-page captures are not part of the repository or release.

Chapters: upload 0 s, submit 8 s, explore 15 s, download 32 s. The final 3 seconds return to the viewer. Caption, source and controls switch with the website language. Public media contains no browser address bar, task token, recovery link, email or local path.

## Playback and layout

- Desktop: muted looping playback when visible, unless reduced motion is enabled or autoplay is blocked.
- Mobile: poster first, explicit play. Reduced motion also defaults to the poster.
- Pause offscreen/background; resume only when playback intent permits it. Explicit pause stays paused.
- Play/pause, keyboard-accessible seek slider, four chapters and fullscreen controls.
- Failed formats fall back to the other source. A complete failure retains the poster, retry action and interactive-example link.
- Homepage loads the video and lightweight metadata, not the MSA viewer. The complete viewer loads on the existing example route.
- The cover is at least one desktop viewport; shorter desktop windows may scroll within the cover to preserve the complete video frame. Mobile uses natural height.

## Verification

- Frontend regression: **58 files / 284 tests passed**, including **20 HomeDemo tests**.
- TypeScript project check: passed.
- Vite production build: passed, retaining `/easymsa/` and the production API domain.
- Real browser checks: Chinese/English media, play/pause, chapter jump, keyboard seeking, fullscreen entry/exit, offscreen pause, reduced-motion poster, mobile manual playback, and navigation/download links.
- Layout checks: 1440 × 900, 1280 × 800, 390 × 844, 360 × 800; no horizontal overflow.
- An isolated temporary frontend with an unavailable API still played the video and opened the public example viewer. The normal development connection stayed available.
- Autoplay rejection, individual-source failure, all-source failure/retry, background visibility and fullscreen-unavailable branches have component-test coverage. Actual browser checks used the Codex Chromium browser; a new Firefox/WebKit run was not performed for this homepage change.
- Visual acceptance and screenshots: see `design-qa.md`.

## Licensing

Original EasyMSA UI imagery and this synthetic demonstration material are covered by the repository MIT license. Existing algorithm and dependency licenses remain unchanged. No task credentials, raw private captures or unrelated user data are included in these assets.
