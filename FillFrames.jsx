// FillFrames.jsx
// Distributes the content of one frame seamlessly across several frames,
// as if it were visible through all of them at once.
//
// Usage:
//   1. With the Selection tool, select the frame holding the content AND all (empty) target frames.
//   2. Run the script.
//   The content (image, graphic, EPS/PDF or group) is mapped onto the combined area of the target
//   frames: scaled proportionally to fill it and centered. Rotation and effects are preserved.
//   Afterwards you are asked whether to delete the original frame.
//   Note: the script uses the clipboard.
//
//   To remove the content again, select only the filled frames and run the script:
//   choose to just empty them, or to merge the content back into one frame spanning all of them.

#target indesign

(function () {
    if (app.documents.length === 0) {
        alert("No document open.");
        return;
    }
    var sel = app.selection;
    if (!sel || sel.length < 2) {
        alert("Please select the content frame AND all target frames together.");
        return;
    }
    app.doScript(main, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Fill Frames");
})();

function main() {
    var sel = app.selection;
    var frames = [];
    collectFrames(sel, frames);

    var sources = [], targets = [];
    for (var i = 0; i < frames.length; i++) {
        (frames[i].pageItems.length > 0 ? sources : targets).push(frames[i]);
    }
    // Only filled frames selected: remove mode
    if (sources.length > 1 && targets.length === 0) {
        removeContent(sources);
        return;
    }
    if (sources.length !== 1) {
        alert("Select ONE frame with content plus the empty target frames to fill them,\n" +
              "or only filled frames to remove their content (found: " + sources.length + " filled, " +
              targets.length + " empty).");
        return;
    }
    if (targets.length === 0) {
        alert("No empty target frames found in the selection.");
        return;
    }

    var src = sources[0];
    var srcContent = src.pageItems[0].getElements()[0]; // image, graphic or group inside the frame

    var PB = CoordinateSpaces.PASTEBOARD_COORDINATES;
    var srcMatrix = linearPart(srcContent.transformValuesOf(PB)[0]);

    // Map the source frame's area onto the combined area of the targets (fill proportionally, centered)
    var sb = boundsOf([src]), tb = boundsOf(targets);
    var sw = sb[2] - sb[0], sh = sb[3] - sb[1], tw = tb[2] - tb[0], th = tb[3] - tb[1];
    var scale = Math.max(tw / sw, th / sh);
    var contentCorner = innerTopLeft(srcContent);
    var targetCorner = [
        tb[0] + (tw - sw * scale) / 2 + (contentCorner[0] - sb[0]) * scale,
        tb[1] + (th - sh * scale) / 2 + (contentCorner[1] - sb[1]) * scale
    ];
    var scaleMatrix = app.transformationMatrices.add({ horizontalScaleFactor: scale, verticalScaleFactor: scale });

    // Copy the content and "Paste Into" every target frame
    app.select(srcContent);
    app.copy();

    for (var t = 0; t < targets.length; t++) {
        var frame = targets[t];
        try { frame.frameFittingOptions.autoFit = false; } catch (e) {}

        app.select(frame);
        app.pasteInto();
        var content = frame.pageItems[0].getElements()[0];

        // Reset the transformation, then apply the original's (plus scaling)
        content.transform(PB, AnchorPoint.CENTER_ANCHOR, linearPart(content.transformValuesOf(PB)[0]).invertMatrix());
        content.transform(PB, AnchorPoint.CENTER_ANCHOR, srcMatrix);
        if (Math.abs(scale - 1) > 1e-6) content.transform(PB, AnchorPoint.CENTER_ANCHOR, scaleMatrix);

        // Align position: move the content's corner to the same spot on the pasteboard
        var c = innerTopLeft(content);
        content.transform(PB, AnchorPoint.CENTER_ANCHOR,
            app.transformationMatrices.add({ horizontalTranslation: targetCorner[0] - c[0],
                                             verticalTranslation:   targetCorner[1] - c[1] }));
    }

    app.select(NothingEnum.NOTHING);

    if (confirm(targets.length + " frames filled.\n\nDelete the original frame?")) {
        src.remove();
    }
}

// Empty the frames; optionally merge the content back into one frame spanning all of them.
// The mode can be preset via app.scriptArgs "FillFramesRemoveMode" ("empty" or "merge") to skip the dialog.
function removeContent(frames) {
    var mode = app.scriptArgs.isDefined("FillFramesRemoveMode") ? app.scriptArgs.getValue("FillFramesRemoveMode") : askRemoveMode(frames.length);
    if (!mode) return;

    if (mode === "merge") {
        var b = frames[0].geometricBounds.slice();
        for (var i = 1; i < frames.length; i++) {
            var g = frames[i].geometricBounds;
            b = [Math.min(b[0], g[0]), Math.min(b[1], g[1]), Math.max(b[2], g[2]), Math.max(b[3], g[3])];
        }
        var merged = frames[0].duplicate();
        try { merged.frameFittingOptions.autoFit = false; } catch (e) {}
        merged.geometricBounds = b; // resizing the frame does not move or scale its content
    }

    for (var j = 0; j < frames.length; j++) {
        while (frames[j].pageItems.length) frames[j].pageItems[0].remove();
    }
    app.select(mode === "merge" ? merged : NothingEnum.NOTHING);
}

function askRemoveMode(count) {
    var w = new Window("dialog", "Fill Frames");
    w.alignChildren = "left";
    w.add("statictext", undefined, "Remove the content from " + count + " frames:");
    var rEmpty = w.add("radiobutton", undefined, "Empty the frames");
    var rMerge = w.add("radiobutton", undefined, "Empty the frames and merge the content into one frame");
    rMerge.value = true;
    var btns = w.add("group");
    btns.alignment = "right";
    btns.add("button", undefined, "Cancel", { name: "cancel" });
    btns.add("button", undefined, "OK", { name: "ok" });
    if (w.show() !== 1) return null;
    return rMerge.value ? "merge" : "empty";
}

// Scale/rotation/shear part of a matrix, without translation
function linearPart(m) {
    var v = m.matrixValues;
    return app.transformationMatrices.add({ matrixValues: [v[0], v[1], v[2], v[3], 0, 0] });
}

// Combined outer bounds of several frames on the pasteboard: [left, top, right, bottom]
function boundsOf(items) {
    var b = null;
    for (var i = 0; i < items.length; i++) {
        var tl = corner(items[i], AnchorPoint.TOP_LEFT_ANCHOR), br = corner(items[i], AnchorPoint.BOTTOM_RIGHT_ANCHOR);
        var x1 = Math.min(tl[0], br[0]), y1 = Math.min(tl[1], br[1]), x2 = Math.max(tl[0], br[0]), y2 = Math.max(tl[1], br[1]);
        b = b ? [Math.min(b[0], x1), Math.min(b[1], y1), Math.max(b[2], x2), Math.max(b[3], y2)] : [x1, y1, x2, y2];
    }
    return b;
}

function corner(item, anchor) {
    return item.resolve([anchor, BoundingBoxLimits.GEOMETRIC_PATH_BOUNDS, CoordinateSpaces.PASTEBOARD_COORDINATES],
        CoordinateSpaces.PASTEBOARD_COORDINATES)[0];
}

// Top-left corner of the content (in its own, unrotated space) as a point on the pasteboard
function innerTopLeft(item) {
    return item.resolve(
        [AnchorPoint.TOP_LEFT_ANCHOR, BoundingBoxLimits.GEOMETRIC_PATH_BOUNDS, CoordinateSpaces.INNER_COORDINATES],
        CoordinateSpaces.PASTEBOARD_COORDINATES
    )[0];
}

// Collect frames from the selection; groups are resolved
function collectFrames(items, out) {
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it instanceof Group) {
            collectFrames(it.pageItems.everyItem().getElements(), out);
        } else if (it instanceof Rectangle || it instanceof Oval || it instanceof Polygon) {
            out.push(it);
        }
    }
}
