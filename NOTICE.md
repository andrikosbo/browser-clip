# Notices

Browser Clip credits FullDigital Motion Studio for the original idea of capturing a real page, framing it on a device and validating the render. Browser Clip implements its own scroll sampler, laptop artwork and FFmpeg composition. The Stillhouse Objects fixture and its poster and video are original outputs of this project.

| Component | Role | License or terms |
| --- | --- | --- |
| [Playwright and Playwright Core](https://github.com/microsoft/playwright/blob/v1.65.1/LICENSE) | Node dependencies for browser control | Apache-2.0. Installed by npm along with their notices. |
| [Chromium](https://chromium.googlesource.com/chromium/src/+/main/LICENSE) | Browser installed by Playwright | Chromium's license and accompanying third-party notices apply to the browser distribution. |
| [FFmpeg and FFprobe](https://ffmpeg.org/legal.html) | External tools invoked on PATH | LGPL or GPL according to the installed build. Browser Clip requires a build with the GPL-licensed libx264 encoder. |
| [GitHub Actions Checkout](https://github.com/actions/checkout/blob/d23441a48e516b6c34aea4fa41551a30e30af803/LICENSE) and [Setup Node](https://github.com/actions/setup-node/blob/6044e13b5dc448c55e2357c09f80417699197238/LICENSE) | CI only | MIT. |

The release archive contains Browser Clip source, its original assets and the encoded sample outputs. It does not distribute the browser, a codec, FFmpeg binaries or font files. The synthetic page uses system fonts. Review the license and any applicable codec requirements before redistributing a custom encoder build. Browser Clip runs independently of Remotion.
