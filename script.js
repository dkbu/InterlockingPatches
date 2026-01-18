/*
NOTES:
    Controls: left click to start a stitch, left click again to finish it (or ctrl-left-click to continue the stitch). right click places an ff
    Current implementation relies on the vertical padding and grid size being the same as the horizontal padding and grid size
    TODO is things I knew I'd forget otherwise; DONE is things from that I've finished

TODO:
    prevent clicking on things which dont have a possible stitch
        allow lines which make up multiple stitches - a la 2 down, 2 left
    fix bug when user changes viewport size without moving their mouse... if need be
    dynamic pattern name
    dynamic colors
    make coordinates a class instead of relying external functions
    remove "lines" array entirely - replace with stitches where needed
    better stitch culling - delete stitches if they're completely on the border, but not if theyre diagonally halfway on the border
    verify Pattern integrity in weird(/all) circumstances - or add pattern checking of some kind.
        potentially, build a reconstruction of what it'll look like with the displayed pattern
        otherwise, maybe highlight lines which will not be in the final pattern
    fix ff out-of-bounds (and potential Pattern implications)
        find the condition of - and fix - bug where ff's sometimes stay despite being over their bounds
    fix "stitches directly after a removed stitch kept no matter what when reducing board size" (caused by splicing out index while in a for loop)

DONE:
    ctrl-click to continue a line
    make deleting lines functional
    prevent out-of-bounds clicks
    dynamic pattern size!
    right-click to reduce pattern size
    background functionality with right-click
    (mostly) fix ff out-of-bounds (and potential Pattern implications)
*/  

// Import modules
// Imports getStitches, getDimensions from canvas.js
// Imports createPattern from pattern.js
// Imports onExportClick, saveCanvas, readLoaded, clearCanvas, initializeAllFunctionality from export.js

function resetColors() {
    foregroundColorPicker.value = "#000000";
    backgroundColorPicker.value = "#c1a485";
    frame();
}

// Initialize all functionality when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllFunctionality);
} else {
    initializeAllFunctionality();
}