"""Encode approved real UI captures into the bilingual homepage walkthrough.

Raw captures remain outside the repository. Only reviewed crops, MP4/WebM,
posters and a credential-free provenance manifest are suitable for publication.
Requires Pillow and an FFmpeg build with libx264/libvpx-vp9/libwebp support.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

SIZE = (2304, 1296)
STORY = [
    ("01-upload", 3), ("02-file", 5), ("03-settings", 3.8),
    ("04-timeline-safe", 3.2), ("05-overview", 4), ("06-viewer", 4),
    ("07-search", 4), ("08-selection", 5), ("09-download", 5), ("06-viewer", 3),
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command: list[str]) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-2500:])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--captures", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--font", required=True, help="CJK font for the waiting-time caption")
    parser.add_argument("--review-dir", type=Path, required=True)
    args = parser.parse_args()
    cuts = json.loads((args.captures / "cuts.json").read_text(encoding="utf-8"))
    integrity = json.loads((args.captures / "integrity.json").read_text(encoding="utf-8"))
    assert integrity["ids_match"] and integrity["ungapped_match"] and integrity["same_as_public_result"]
    args.output.mkdir(parents=True, exist_ok=True)
    args.review_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(args.font, 44)
    provenance = {
        "version": "v2", "created": "2026-10-04", "durationSeconds": 40,
        "dimensions": list(SIZE), "captureScale": 2,
        "captureSource": "Fresh double-density browser rendering of the verified public example, upload form and original completed task timeline.",
        "production": "Edited walkthrough of real browser UI states; computation waiting time omitted.",
        "input": "public/examples/v1/alignment-small/input.fasta",
        "parameters": {"algorithm": "minipoa", "preprocess_mode": "audit", "realign_enabled": False, "email": None},
        "resultIntegrity": integrity,
        "chapters": [{"name": name, "startSeconds": start} for name, start in [("upload", 0), ("submit", 8), ("explore", 15), ("download", 32)]],
        "license": "MIT; synthetic demonstration data and original EasyMSA interface. Third-party tools retain their own licenses.",
        "capturePolicy": "Public synthetic data only. No browser chrome, access credentials, restore links or local file paths in the exported media.",
        "files": {}, "reviewedFrameHashes": {},
    }
    with tempfile.TemporaryDirectory(prefix="easymsa-home-encode-") as directory:
        work = Path(directory)
        for locale in ("zh", "en"):
            frames = {}
            for scene, _ in STORY:
                if scene in frames:
                    continue
                key = f"{locale}-{scene}"
                if scene == "04-timeline-safe":
                    original = Image.open(args.captures / f"{key}.png").convert("RGB")
                    # This source is already a tight, verified credential-free crop.
                    image = Image.new("RGB", SIZE, "#f8fafc")
                    image.paste(original, ((SIZE[0] - original.width) // 2, (SIZE[1] - original.height) // 2 - 50))
                    draw = ImageDraw.Draw(image)
                    caption = "等待片段已省略" if locale == "zh" else "Waiting time omitted"
                    box = draw.textbbox((0, 0), caption, font=font)
                    draw.text(((SIZE[0] - box[2]) / 2, 1120), caption, font=font, fill="#64748b")
                else:
                    crop = cuts[key]
                    original = Image.open(args.captures / crop["file"]).convert("RGB")
                    x, y = round(crop["x"]), round(crop["y"])
                    width, height = round(crop["width"]), round(crop["height"])
                    assert x >= 0 and y >= 0 and x + width <= original.width + 1
                    original = original.crop((x, y, min(x + width, original.width), min(y + height, original.height)))
                    image = ImageOps.pad(original, SIZE, color="white", method=Image.Resampling.LANCZOS)
                frame = work / f"{key}.png"
                image.save(frame)
                image.save(args.review_dir / f"{key}.png")
                provenance["reviewedFrameHashes"][key] = digest(frame)
                frames[scene] = frame
            poster = args.output / f"poster-{locale}.webp"
            Image.open(frames["06-viewer"]).save(poster, "WEBP", lossless=True, method=6)
            concat = work / f"{locale}.txt"
            lines = []
            for scene, duration in STORY:
                lines.extend([f"file '{frames[scene].as_posix()}'", f"duration {duration}"])
            lines.append(f"file '{frames[STORY[-1][0]].as_posix()}'")
            concat.write_text("\n".join(lines), encoding="utf-8")
            shared = [args.ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat), "-t", "40", "-vf", "fps=25,format=yuv420p", "-an", "-threads", "4"]
            run(shared + ["-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-crf", "14", "-movflags", "+faststart", str(args.output / f"demo-{locale}.mp4")])
            run(shared + ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "18", "-cpu-used", "4", "-row-mt", "1", str(args.output / f"demo-{locale}.webm")])
            for path in (poster, args.output / f"demo-{locale}.mp4", args.output / f"demo-{locale}.webm"):
                assert path.stat().st_size <= 8 * 1024 * 1024
                provenance["files"][path.name] = {"bytes": path.stat().st_size, "sha256": digest(path)}
            print(f"Encoded {locale}: 40 seconds", flush=True)
    version = subprocess.run([args.ffmpeg, "-version"], capture_output=True, text=True, check=True).stdout.splitlines()[0]
    provenance["encoder"] = version
    (args.output / "provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
