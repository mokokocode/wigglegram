Wigglegram Bench
Align, crop and export wigglegrams from the Nishika N8000 and other multi-lens cameras. Runs entirely in the browser — one HTML file, no build step, no upload.
Open the tool →
---
What it does
A four-lens camera gives you four exposures with real parallax between them, which is the whole point — but also with lens-to-lens misregistration, which isn't. The frames need a shared anchor before the animation reads as depth rather than as a shake. This does that part, then gets you to a GIF or a video.
Load four scans, or drop one wide scan of the negative strip and slice it into frames
Align by dragging, nudging, pinning a shared point with a magnifier loupe, or letting it solve the offsets automatically
Crop to the region every frame still covers, so no blank edges creep in
Border in any colour and thickness, with optional rounding and a fixed output ratio
Export as an animated GIF, an MP4 or WebM, or the aligned frames as PNGs
Install it to the home screen and use it with no connection at all
Nothing is sent anywhere. Files are read with `createImageBitmap`, everything renders on a canvas, and the encoders run locally. Installable as an offline app.
Aligning
Three approaches, useful in roughly this order:
Pin a point. Click the same detail in every frame — an eye, a corner of a sign — and the offsets are solved exactly from those four clicks. The pinned point is what holds still while everything else parallaxes around it, so this is really a creative choice, not just a correction.
Auto-align. Coarse-to-fine normalised cross-correlation against the reference frame. Zero-mean, so it tolerates the exposure and vignetting differences between the four lenses. Translation only; it locks onto the centre of the frame, which is usually but not always what you want.
By hand. Drag on the image, or arrow-key nudge — one pixel, ten with shift, a quarter with alt. Rotation and scale sliders are there for scanner skew. Four view modes help you see the error: onion skin, difference blend, a blink comparator, and solo.
Sub-pixel offsets survive into the export — everything renders through a single transform at output scale rather than being snapped to integers.
Output
GIF uses a median-cut palette with optional Floyd–Steinberg dithering and a from-scratch LZW encoder. Worth knowing: the format stores frame delays in hundredths of a second, and most viewers silently clamp anything under 20 ms. If you want a fast wiggle, use the video.
Video records the canvas through `MediaRecorder` and honours your exact frame timing. MP4 where the browser supports it (Chrome), WebM otherwise (Safari, Firefox). Output dimensions are forced even, since H.264 requires it.
PNG frames if you'd rather finish in ffmpeg.
Controls
The tool has two layouts and a switch between them in the top bar. Mobile is the default. It is a deliberate choice rather than a width breakpoint, because screen width is a poor guess at whether there is a finger or a mouse on the other end.
On a phone
The photo gets the screen. Navigation sits at the bottom in reach of a thumb, and the controls live in a bottom sheet you can drag down out of the way.
Gesture	What it does
one finger on the photo	moves the selected frame
two fingers	pan and zoom, at any magnification
drag the sheet handle	resize the controls; tap it to cycle peek / half / tall
tap a frame number	select that frame
long press a frame number	make it the reference
Two fingers are the reliable pan because once you zoom in the photo covers the whole screen, leaving nothing "outside" to drag on. One finger always drives the tool, two always drive the view, the same split Procreate and Photoshop use.
Collapsed to a peek, the sheet leaves 75–81% of the screen to the image while keeping the frame numbers reachable, which is the state you want while dragging frames into place.
The nudge pad replaces the nudge sliders on touch. A range slider cannot place a single pixel with a thumb on it. Tap an arrow to step, hold to repeat, and pick the step size: 0.25px, 1px or 10px.
Pinning works like an eyedropper. Press, slide to the detail you want, and a magnified loupe appears clear of your finger showing the exact pixel under the crosshair. Lift to place the pin. The prompt lives in the sheet handle rather than floating over the photo, so nothing covers the thing you are aiming at.
Export offers the share sheet first, which is the route to Photos, Messages or an upload. It falls back to a download where sharing files is not supported.
On a desktop
Drag the photo itself to move the selected frame. Dragging anywhere outside it pans the view.
	
`←↑↓→`	nudge the selected frame (shift ×10, alt ×0.25)
`1`–`9`	select a frame
wheel	zoom toward the cursor
space + drag	pan (or middle-drag, or drag outside the photo)
`0`	zoom to fit
`+` / `-`	step zoom
`p`	play / pause
Double-click a frame in the strip to make it the reference.
Testing
`test/` holds a Playwright harness that runs the tool at real device sizes:
`node test/audit.js` — layout audit across iPhone 13, iPhone SE and Pixel 7 plus desktop. Reports how much of the screen the image actually gets, flags any touch target under 44px, and screenshots every tab and sheet position into `test/shots/`.
`node test/func.js` — 42 functional checks driving real touch events: one-finger frame drag, two-finger pan and pinch, the nudge pad, pin placement with the loupe, crop handles, sheet detents, GIF encoding and the mode switch.
`node test/pwa.js` — serves the app from a project subfolder, then checks the worker registers in the right scope, precaches the shell, cuts the network and does a full align-and-export offline, exercises the share target, and confirms an update prompts rather than swapping silently.
Both run against synthetic four-frame fixtures with real parallax, so they need no sample photos.
Limitations
Browsers decode JPEG, PNG, WebP, GIF and AVIF. TIFF, HEIC and raw files need converting first.
Auto-align corrects translation only. Rotation and scale are manual.
Video export records in real time, so a three-second clip takes three seconds.
Saving PNG frames triggers one download per frame; some browsers ask permission for that.
Running it
Open `index.html`. That is the whole install, and it works from `file://`.
Service workers need `https://` or `localhost`, so the offline and install
behaviour below only activates when it is served rather than opened as a file.
Serving it locally is one command:
```
python3 -m http.server 8000
# then open http://localhost:8000
```
Deploying to GitHub Pages
Put these in a repo and turn on Pages (Settings → Pages → Deploy from a branch → main → `/root`):
```
index.html
sw.js
manifest.webmanifest
icon-192.png  icon-512.png  icon-maskable-512.png  icon-180.png  favicon-64.png
```
Every path is relative, so this works from a project subfolder
(`you.github.io/wigglegram/`) as readily as from a domain root.
Offline and installing
Nothing here needs a server, so once the shell is cached the tool is fully
functional with no connection: loading frames, aligning, cropping, and
encoding GIFs and video all run locally.
Visit it once while online and the service worker caches the page and its
icons. After that it launches offline. On a phone, "Add to Home Screen"
(or Chrome's install prompt, which the app offers once you have frames
loaded) gives it an icon and a standalone window with no browser chrome.
Sharing photos into it. Once installed, the app appears in the OS share
sheet. Select your frames in Photos, share them to Wigglegram, and they open
ready to align.
Updates. When a new version is deployed the app does not swap itself out
mid-session; it offers a reload and waits. To ship an update, bump `VERSION`
at the top of `sw.js` — the new worker precaches the new shell and clears the
old caches.
Webfonts come from Google Fonts and are cached on first load. The
stylesheet is loaded asynchronously so a failed font request never delays the
first paint, and the fallback stack is used until the fonts arrive. If you
would rather have zero third-party requests, download the two families, put
them next to `index.html`, and swap the `<link>` for a local `@font-face`
block — then add the font files to the `PRECACHE` list in `sw.js`.
Licence
MIT
