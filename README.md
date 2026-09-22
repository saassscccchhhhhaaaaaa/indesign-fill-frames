# Fill Frames (InDesign script)

Author: Sascha Fronczek | [saschafronczek.de](https://saschafronczek.de) | License: [MIT](LICENSE) | free

## What is it for?

You have one image and want it split across several frames, for example 15 vertical
strips of 26 × 300 mm across a 390 × 300 mm area. Each strip should show exactly its part
of the image, so that together they show the whole picture without any offset.

Doing this by hand means placing the image 15 times and lining it up in every frame.
**This script does it in one step.**

## How to use

1. With the **Selection tool** (black arrow), select the frame that holds the content
   **and** all the empty target frames.
2. Run `FillFrames.jsx` from the Scripts panel.
3. The script asks whether to delete the original frame.

The content is mapped onto the combined area of all target frames:

- The source frame can sit **anywhere**: on top of the strips, next to them, or on the pasteboard.
- If the target area has a different size, the content is **scaled proportionally to fill it and centered**.
- Rotation, scaling and effects are kept.
- The target frames stay as they are (stroke, object style, shape, even non-rectangular frames).
- Everything can be undone with a single **Undo**.

## Removing the content again

Select **only the filled frames** and run the script again. A dialog lets you choose:

- **Empty the frames**: the content is removed from all frames.
- **Empty the frames and merge the content into one frame** (default): one frame spanning
  the whole area is created with the complete content in its exact position, so you can
  distribute it again later.

## What can be distributed?

Anything that sits inside a frame: images (JPG, PSD, TIFF …), EPS/PDF/AI graphics, and
**groups** (for example a graphic together with a text frame that was pasted into a frame).

## Notes

- Exactly **one** frame with content and at least one **empty** frame must be selected.
  Text frames in the selection are ignored, and selected groups of frames are resolved.
- The script uses the **clipboard** (copy + Paste Into), so the clipboard's previous
  content is replaced.

## Requirements

Adobe InDesign 2026, developed and tested on macOS. Other versions and Windows should
work but have not been tested.

## Installation

Copy `FillFrames.jsx` into your Scripts Panel folder. To find it in InDesign, go to
*Window › Utilities › Scripts*, right-click **User**, and choose *Reveal in Finder / Explorer*.
