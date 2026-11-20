# Testing

The demo starts an HTTP server on an ephemeral loopback port and records the original Stillhouse Objects fixture. There are no accounts, cookies from earlier sessions, client assets or external fonts.

## Automated checks

Run `npm test` from a checkout after installing the [runtime tools](../README.md#quick-start). The suite verifies accepted durations and URLs, scroll progress, the frame bounds, the actual MP4 and poster, protection of existing results and the treatment of cross-origin resources, redirects and POST requests.

## Reference render

The [reference clip](media/stillhouse.mp4) and [poster](media/stillhouse.png) were created on macOS 27.3 with Node.js 26.10.0, Playwright 1.65.1, Chromium 159.0.8154.6, and FFmpeg/FFprobe 9.0.2.

- FFprobe measured 4.000 seconds, 96 frames at 24 fps and 1280 × 720 H.264 with one video stream.
- The opening, middle and last frames show separate sections of the fixture. The laptop bezel stays aligned around the page in all three frames.
- FFmpeg's black-frame detection found no black intervals of at least 0.05 seconds.
- A clean-install test regenerates and validates its own video and poster in temporary directories.

## Clean installs

The source ZIP was extracted before running the documented install, doctor,
tests, demo and validation commands on both environments.

| Environment | Node.js | FFmpeg and FFprobe | Result |
| --- | --- | --- | --- |
| macOS 27.3 on Apple silicon | 26.10.0 | 9.0.2 | Seven tests passed. A fresh four-second clip and poster validated. |
| Debian 12 ARM64 in a clean container | 22.23.5 | 5.1.9 | Seven tests passed. A fresh four-second clip and poster validated. |

Both used Playwright 1.65.1 and Chrome Headless Shell 159.0.8154.6.
