# animated-covers

**Animated song covers for Spotify, powered by Spicetify Extensions.**  
An enhanced alternative to the default Canvas feature — without regional or technical limitations.

---

## Features

✅ **Available in all regions**  
No more "Canvas isn't supported in your country" — this works globally.

✅ **More songs with animation**  
You decide which tracks get animated covers. Total control.

✅ **Enhanced covers**  
Add animated visuals not just from Spotify, but even **Apple Music**, or your own custom designs.

✅ **We listen to your feedback**  
You want a feature, a fix, or a new vibe? Open an issue — your opinion matters here.

---

## How It Works

- The `animatedCover.js` extension replaces the static album image with a `<video>` element for selected tracks.
- Works in both **main view** and **full-screen (TV)** mode.
- You manage everything via a simple `videoMap`.

---

## Installation

First Way:
1. Install 'Animated Covers' from Spicetify marketplace

Second Way:
1. Copy `animatedCover.js` to your Spicetify Extensions folder (for example: 'C:\Users<YourUsername>\AppData\Roaming\spicetify\Extensions')
2. Edit your `config-xpui.ini` and add this line under `[Extensions]`: 'animatedCover.js'
3. Apply the changes: 'spicetify apply' (type this in PowerShell)
