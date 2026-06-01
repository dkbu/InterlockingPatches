// Canvas-related functionality for the Interlocking Patch Maker
// Imports createPattern, Stitch from pattern.js

// Canvas and drawing context
const canvas = document.getElementById("designerCanvas");
const ctx = canvas.getContext("2d");

// Drawing constants
const translucent = 0.5; // alpha channel, variable so it can be changed everywhere at once
const pi2 = Math.PI * 2;
const background = true; // to indicate when a function needs the background grid

// Style constants
const padding = 20; // width, in pixels, of the unused space on each side of the canvas
const foregroundColorPicker = document.getElementById("foregroundColor");
const backgroundColorPicker = document.getElementById("backgroundColor");
const canvasWidthInput = document.getElementById("canvasXStitches");
const canvasHeightInput = document.getElementById("canvasYStitches");
const highlightColor = "#6e44e0";
const stitchCounterWindow = document.getElementById("stitchCounterWindow");
const stitchCounterText = document.getElementById("stitchCounterText");

// Dynamic variables that change with user input
let width = 10; // how many *foreground* stitches there are horizontally
let height = 10; // how many *foreground* stitches there are vertically
// reset the input fields on refresh
canvasWidthInput.value = 10;
canvasHeightInput.value = 10;
let heldPoint = { x: 0, y: 0, active: false }; // tracks the start point of a stitch, if there is one
let pixelX, pixelY, foregroundX, foregroundY, backgroundX, backgroundY = 0;
let currentDomain = "F";
let inactiveDomain = "B";
let verbose = false;
let stitchViewerEnabled = false;

// Arrays for stitches
let stitches = [];
// track undone stitches so they can be re-done
let undone = [];

// Calculated variables
let backgroundWidth = width - 1;
let backgroundHeight = height - 1;
let gridMultiplier, lineWidth, circleRadius, thinWidth, thinRadius, xLimit, yLimit, backgroundXLimit, backgroundYLimit;

// Initialize the canvas
resizeScreen();

function resizeCanvas() {
    const oldWidth = width;
    const oldHeight = height;
    width = canvasWidthInput.value;
    height = canvasHeightInput.value;
    backgroundWidth = width - 1;
    backgroundHeight = height - 1;
    let canvasShrank = false;


    // if the canvas is any smaller than it was, remove stitches outside
    if (width < oldWidth) {
        canvasShrank = true;
        for (let i = stitches.length-1; i >= 0; i--) {
            if (stitches[i].cullX(width)) {
                stitches.splice(i, 1);
            }
        }
    }
    if (height < oldHeight) {
        canvasShrank = true;
        for (let i = stitches.length-1; i >= 0; i--) {
            if (stitches[i].cullY(height)) {
                stitches.splice(i, 1);
            }
        }
    }

    resizeScreen();
}

// Variable Calculation Functions
function resizeScreen() {
    
    // determine which dimension will decide the screen width
    // Math.floor may not be strictly necessary, but it mitigates anti-aliasing
    const verticalMaxGridMultiplier = Math.floor((window.screen.height * 0.8 - 2 * padding) / height);
    const horizontalMaxGridMultiplier = Math.floor((window.screen.width * 0.8 - 2 * padding) / width);
    
    // if vertical space limits the grid size, use that for dimensions
    if (verticalMaxGridMultiplier <= horizontalMaxGridMultiplier) {
        gridMultiplier = verticalMaxGridMultiplier;
        canvas.height = window.screen.height * 0.8;
        canvas.width = width * gridMultiplier + 2 * padding;
    } else {
        gridMultiplier = horizontalMaxGridMultiplier;
        canvas.width = window.screen.width * 0.8;
        canvas.height = height * gridMultiplier + 2 * padding;
    }
    
    xLimit = gridToPixel(width - 1);
    yLimit = gridToPixel(height - 1);
    backgroundXLimit = gridToPixel(backgroundWidth - 1, background);
    backgroundYLimit = gridToPixel(backgroundHeight - 1, background);
    lineWidth = gridMultiplier / 2.5;
    picotRadius = lineWidth * 0.9;
    circleRadius = lineWidth / 2;
    thinWidth = lineWidth / 3;
    thinRadius = thinWidth / 2;
    frame();
}

// when mouse moves or grid size changes this recalculates what the mouse is clicking
function getGridPositions() {
    foregroundX = pixelToGrid(pixelX);
    foregroundY = pixelToGrid(pixelY);
    backgroundX = pixelToGrid(pixelX, background);
    backgroundY = pixelToGrid(pixelY, background);
}

// Drawing function
function frame() {
    // in case a drawing variable wasn't reset correctly, set them
    ctx.globalAlpha = 1;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    // clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw the static parts under everything else
    // draw the padding
    ctx.lineWidth = padding * 2;
    ctx.strokeStyle = "gray";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();

    ctx.lineWidth = lineWidth;
    // draw the foreground base
    ctx.strokeStyle = foregroundColorPicker.value;
    ctx.beginPath();
    for (let x = gridToPixel(0); x <= xLimit; x += gridMultiplier) {
        // for each vertical column, draw a line top to bottom
        ctx.moveTo(x, gridToPixel(0));
        ctx.lineTo(x, yLimit);
    }
    for (let y = gridToPixel(0); y <= yLimit; y += gridMultiplier) {
        // for each horizontal row, draw a line top to bottom
        ctx.moveTo(gridToPixel(0), y);
        ctx.lineTo(xLimit, y);
    }
    ctx.stroke();

    // draw the background base
    ctx.strokeStyle = backgroundColorPicker.value;
    ctx.beginPath();
    for (let x = gridToPixel(0, background); x <= backgroundXLimit; x += gridMultiplier) {
        // for each vertical column, draw a line top to bottom
        ctx.moveTo(x, gridToPixel(0, background));
        ctx.lineTo(x, backgroundYLimit);
    }
    for (let y = gridToPixel(0, background); y <= backgroundYLimit; y += gridMultiplier) {
        // for each horizontal row, draw a line top to bottom
        ctx.moveTo(gridToPixel(0, background), y);
        ctx.lineTo(backgroundXLimit, y);
    }
    ctx.stroke();

    // draw dynamic pieces on top
    // draw Background FillStitch
    ctx.strokeStyle = backgroundColorPicker.value;
    ctx.beginPath();
    for (const stitch of stitches.filter((item) => item.type == "FillStitch" && item.domain == "B")) { // for each background fill,
        // move to above the covered grid point
        ctx.moveTo(gridToPixel(stitch.x1), gridToPixel(stitch.y1) - gridMultiplier / 2);

        // stroke to below the covered grid point
        ctx.lineTo(gridToPixel(stitch.x1), gridToPixel(stitch.y1) + gridMultiplier / 2);
    }
    ctx.stroke();
    
    // draw placed stitches
    ctx.globalAlpha = 1;
    // draw Foreground LongStitch
    ctx.strokeStyle = foregroundColorPicker.value;
    ctx.beginPath();
    for (const stitch of stitches.filter((item) => item.type == "LongStitch" && item.domain == "F")) {
        ctx.moveTo(gridToPixel(stitch.x1), gridToPixel(stitch.y1));
        ctx.lineTo(gridToPixel(stitch.x2), gridToPixel(stitch.y2));
    }
    ctx.stroke();
    // draw Foreground PicotStitch
    ctx.fillStyle = foregroundColorPicker.value;
    ctx.beginPath();
    for (const stitch of stitches.filter((item)  => item.type == "PicotStitch" && item.domain == "F")) {
        ctx.moveTo(gridToPixel(stitch.x1), gridToPixel(stitch.y1));
        ctx.arc(gridToPixel(stitch.x1), gridToPixel(stitch.y1), picotRadius, 0, pi2);
    }
    ctx.fill();

    // draw translucent pieces
    ctx.globalAlpha = translucent;
    ctx.fillStyle = highlightColor;
    ctx.strokeStyle = highlightColor;
    ctx.beginPath();

    // draw the angle that would be snapped to, if theres currently a start point for a stitch
    if (heldPoint.active) {
        // start at the start point, draw the rounding-off circle, line to the snapped-to point,
        ctx.moveTo(gridToPixel(heldPoint.x), gridToPixel(heldPoint.y));
        ctx.lineTo(gridToPixel(clamp(foregroundX, 0, width - 1)), gridToPixel(clamp(foregroundY, 0, height - 1)));
        ctx.stroke();
    } else {
        // if there's no start point, draw the snapped-to circle
        ctx.moveTo(gridToPixel(foregroundX), gridToPixel(foregroundY));
        ctx.arc(gridToPixel(foregroundX), gridToPixel(foregroundY), circleRadius, 0, pi2);
        ctx.fill();
    }
}

// remove a stitch when outside the workable area or overlapped
function removeStitch(removedId) {
    const removedIndex = stitches.findIndex(function (stitch) { return stitch.id === removedId; });
    if (removedIndex === -1) {
        console.log("Something went wrong! Search for a stitch to remove came up blank.");
    } else {
        stitches.splice(removedIndex, 1);
    }
}

function setStitchCounterMessage(message) {
    if (stitchCounterText) {
        stitchCounterText.textContent = message;
    }
}

function setStitchViewerState(enabled) {
    stitchViewerEnabled = enabled;
    canvas.classList.toggle("stitch-viewer-mode", stitchViewerEnabled);

    if (stitchCounterWindow) {
        stitchCounterWindow.style.display = stitchViewerEnabled ? "block" : "none";
    }

    if (stitchViewerEnabled) {
        heldPoint.active = false;
        setStitchCounterMessage("Click a stitch to view row and column.");
    }
}

function toggleStitchViewer() {
    setStitchViewerState(!stitchViewerEnabled);
    frame();
}

// Event handlers
canvas.addEventListener("mousemove", function (evt) {
    const canvasPos = canvas.getBoundingClientRect();
    pixelX = evt.clientX - canvasPos.left;
    pixelY = evt.clientY - canvasPos.top;
    // set which grid coordinate is being clicked
    getGridPositions();
    frame();
});

canvas.addEventListener("click", function (evt) {
    const canvasPos = canvas.getBoundingClientRect();
    pixelX = evt.clientX - canvasPos.left;
    pixelY = evt.clientY - canvasPos.top;
    getGridPositions();

    // while stitch viewer is active, click only inspects stitches
    if (stitchViewerEnabled) {
        if (foregroundX == clamp(foregroundX, 0, width - 1) && foregroundY == clamp(foregroundY, 0, height - 1)) {
            setStitchCounterMessage(`Row ${foregroundY + 1}, Column ${foregroundX + 1}`);
        } else {
            setStitchCounterMessage("Click a stitch inside the foreground grid.");
        }
        frame();
        return;
    }

    // if clicking inside the pattern (not the padding), edit the pattern
    if (foregroundX == clamp(foregroundX, 0, width - 1) && foregroundY == clamp(foregroundY, 0, height - 1)) {
        // if holding Shift, toggle a Picot
        if (evt.altKey) {
            toggleStitch({"x1": foregroundX, "y1": foregroundY, "domain": currentDomain, "type": "PicotStitch"});
        }
        // if not holding Shift, toggle a long stitch
        else {
            if (heldPoint.active) { // place a stitch if there's already a held point

                // delete the held point if clicking in the same spot
                if (heldPoint.x == foregroundX && heldPoint.y == foregroundY) {
                    heldPoint.active = false;

                    // if not deleting, place/remove the stitch and remove/move the held point
                } else { 

                    // consolidate code for which point is x1/y1 and which is x2/y2
                    // the top point is first, or leftmost if both are equally high
                    function definePlacing(i, heldPointFirst) {
                        let ret = {};
                        if (heldPointFirst) {
                            ret.x1 = heldPoint.x+xIncrement*i;
                            ret.y1 = heldPoint.y+yIncrement*i;
                            ret.x2 = heldPoint.x+xIncrement*(i+1);
                            ret.y2 = heldPoint.y+yIncrement*(i+1);
                        } else {
                            ret.x1 = heldPoint.x+xIncrement*(i+1);
                            ret.y1 = heldPoint.y+yIncrement*(i+1);
                            ret.x2 = heldPoint.x+xIncrement*i;
                            ret.y2 = heldPoint.y+yIncrement*i;
                        }
                        return ret;
                    }
                    
                    // find out how many stitches make up the line drawn
                    // seperate the line into an x and y component and find the longer one
                    const xDelta = foregroundX - heldPoint.x;
                    const yDelta = foregroundY - heldPoint.y;
                    const greaterDistance = Math.max(Math.abs(xDelta), Math.abs(yDelta));

                    // find the greatest common factor between the x and y components. This will be the number of stitches drawn
                    let greatestFactor = 1;
                    let xIncrement = xDelta;
                    let yIncrement = yDelta;
                    for (let i = greaterDistance; i > greatestFactor; i--) {
                        if (xDelta % i == 0 && yDelta % i == 0) {
                            greatestFactor = i;
                            xIncrement = xDelta / greatestFactor;
                            yIncrement = yDelta / greatestFactor;
                        }
                    }

                    // for each stitch in the line drawn, place (or remove) it
                    let placing;
                    for (let i = 0; i < greatestFactor; i++) {
                        // toggle the stitch
                        let toToggle = {};
                        toToggle.x1 = heldPoint.x+xIncrement*i;
                        toToggle.y1 = heldPoint.y+yIncrement*i;
                        toToggle.x2 = heldPoint.x+xIncrement*(i+1);
                        toToggle.y2 = heldPoint.y+yIncrement*(i+1);
                        toToggle.domain = currentDomain;
                        toToggle.type = "LongStitch"
                        toggleStitch(toToggle)
                        
                    }

                    // if ctrl is being held, move the held point to the new spot
                    if (evt.ctrlKey) {
                        heldPoint.x = foregroundX;
                        heldPoint.y = foregroundY;

                        // if ctrl isn't being held, remove the held point instead
                    } else {
                        heldPoint.active = false;
                    }

                }
            } else { // if there's not a held point, hold this point
                heldPoint.x = foregroundX;
                heldPoint.y = foregroundY;
                heldPoint.active = true;
            }
        }
        frame();
    }
    // if clicking in the padding, expand the grid
    else {
        if (pixelX >= canvas.width - padding) {
            canvasWidthInput.value++
        }
        if (pixelY >= canvas.height - padding) {
            canvasHeightInput.value++
        }
        if (pixelX <= padding) {
            canvasWidthInput.value++
            for (const stitch of stitches) {
                stitch.pushX();
            }
        }
        if (pixelY <= padding) {
            canvasHeightInput.value++
            for (const stitch of stitches) {
                stitch.pushY();
            }
        }
        resizeCanvas();
        // set which grid coordinate is being clicked
        getGridPositions();
    }
});

canvas.addEventListener("auxclick", function(evt) {
    // not working as middle-mouse-button right now
})

canvas.addEventListener("contextmenu", function (evt) {
    const canvasPos = canvas.getBoundingClientRect();
    pixelX = evt.clientX - canvasPos.left;
    pixelY = evt.clientY - canvasPos.top;
    getGridPositions();

    if (stitchViewerEnabled) {
        evt.preventDefault();
        return;
    }

    // if clicking inside the pattern (not the padding), edit the pattern
    if (foregroundX == clamp(foregroundX, 1, width - 2) && foregroundY == clamp(foregroundY, 1, height - 2)) {
        toggleStitch({"x1": foregroundX, "y1": foregroundY, "domain": inactiveDomain, "type": "FillStitch"});
        // if clicking in the padding, shrink the grid and remove stitches exiting the grid
    } else {
        if (pixelX >= canvas.width - padding) {
            canvasWidthInput.value--;
        }
        if (pixelY >= canvas.height - padding) {
            canvasHeightInput.value--;

        }
        if (pixelX <= padding) {
            canvasWidthInput.value--
            for (const stitch of stitches) {
                stitch.pullX();
            }
        }
        if (pixelY <= padding) {
            canvasHeightInput.value--
            for (const stitch of stitches) {
                stitch.pullY();
            }
        }
        resizeCanvas();
        // set which grid coordinate is being clicked
        getGridPositions();
    }
});
// Keyboard keybinds
addEventListener("keydown", (evt) => {
    // ctrl+key keybinds
    if (evt.ctrlKey) {
        switch (evt.code) {
            case "KeyZ":
                if (stitches.length > 0) {
                    // take out the last-made stitch and log it, so it can be re-done later
                    const popped = stitches.pop()
                    // push to the redo-able array if stitches wasn't empty
                    if (popped) { undone.push(popped); }
                    
                }
                break;
            case "KeyY":
                if(undone.length > 0) {
                    const popped = undone.pop()
                    if (popped) { stitches.push(popped); }
                }
                break;
            case "KeyV":
                if(evt.altKey && evt.shiftKey) {
                    verbose = !verbose;
                    console.log("toggled Verbose mode to", String(verbose));
                }
                break;
            case "Space":
                if (verbose) {console.log("Stitches:", stitches)};
                break;
        }
    }
    frame();
})

// Utility functions
function pixelToGrid(pixelX, onBackground = false) {
    if (!onBackground) { // if placing in the foreground grid
        return Math.floor((pixelX - padding) / gridMultiplier);
    } else { // if placing in the background grid
        return Math.floor((pixelX - padding) / gridMultiplier + 0.5); // shift half a grid coordinate up/right
    }
}

function gridToPixel(gridX, onBackground = false) {
    if (!onBackground) { // if converting from the foreground grid,
        return (gridX + 0.5) * gridMultiplier + padding + 0.5;
    } else { // if converting from the background grid,
        return (gridX + 1) * gridMultiplier + padding + 0.5;
    }
}

function clamp(toClamp, minClamp, maxClamp) {
    if (minClamp > maxClamp) {
        console.log("Something went wrong: tried to clamp with a higher minimum than maximum!\nClamping in reverse to accomodate.");
        return Math.max(maxClamp, Math.min(minClamp, toClamp));
    }
    return Math.max(minClamp, Math.min(maxClamp, toClamp));
}

function toggleStitch(data = {"x1": -1, "y1": -1, "domain": "E", "type": "Attempted to place a stitch with no stitch information"}) {
    // toggle the stitch
    // if the stitch already exists, find it
    const indexOfExisting = stitches.findIndex(item => item.is_identical(data));

    // if you didn't find it, add it
    if (indexOfExisting == -1) {
        switch (data.type) {
            case "LongStitch":
                stitches.push(new LongStitch(data.x1, data.y1, data.x2, data.y2, data.domain));
                break;
            case "PicotStitch":
                stitches.push(new PicotStitch(data.x1, data.y1, data.domain));
                break;
            case "FillStitch":
                stitches.push(new FillStitch(data.x1, data.y1, data.domain));
                break;
            default:
                if (data.error) {
                    console.log("Something went wrong:", data.type);
                } else {
                    console.log("Something went wrong: Unknown stitch type", type, "in stitch generation.");
                }
        }
        
        // test for stitch type verification
        if (verbose) {console.log("Placed @ [" + String(stitches.length-1) + "]:", stitches[stitches.length-1].get_instruction())}

    } 

    // if you did find it, remove it
    else {
        if (verbose) {console.log("Removing @ [" + String(indexOfExisting) + "]:", stitches[indexOfExisting].get_instruction())}
        removeStitch(stitches[indexOfExisting].id);
    }

    // clear the re-do-able stitches to prevent branching with ctrl+y (redo)
    undone = [];
    frame();
}

function toggleDomain() {
    if (verbose) {console.log("Switching domain from", currentDomain, "to", inactiveDomain)};
    let heldDomain = inactiveDomain; // hold the value of inactive domain to switch over
    inactiveDomain = currentDomain;
    currentDomain = heldDomain;
}

// Getter functions for accessing current state
function getStitches() {
    return stitches;
}

function getDimensions() {
    return { width, height };
}

// Export functions and variables that need to be accessed from other modules
// Exports stitches, ff, removeStitch, frame, getStitches, getDimensions
