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
const foregroundColor = "rgb(0, 0, 0)";
const backgroundColor = "rgba(193, 164, 133, 1)";
const highlightColor = "rgba(110, 68, 224, 1)";

// Dynamic variables that change with user input
let width = 10; // how many *foreground* stitches there are horizontally
let height = 10; // how many *foreground* stitches there are vertically
let heldPoint = { x: 0, y: 0, active: false }; // tracks the start point of a stitch, if there is one
let pixelX, pixelY, foregroundX, foregroundY, backgroundX, backgroundY = 0;

// Arrays for stitches and ff points
let stitches = [];
let ff = [];

// Calculated variables
let backgroundWidth = width - 1;
let backgroundHeight = height - 1;
let gridMultiplier, lineWidth, circleRadius, thinWidth, thinRadius, xLimit, yLimit, backgroundXLimit, backgroundYLimit;

// Initialize the canvas
resizeScreen();

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
    circleRadius = lineWidth / 2;
    thinWidth = lineWidth / 3;
    thinRadius = thinWidth / 2;
    
    // verify that each stitch has enough space to clearly show every stitch
    if (thinRadius < 1) {
        alert("Something went wrong: stitches are too small!\nTry using a smaller pattern or a larger screen.");
    }
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
    ctx.strokeStyle = foregroundColor;
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
    ctx.strokeStyle = backgroundColor;
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
    // draw placed ff's
    ctx.strokeStyle = backgroundColor;
    ctx.beginPath();
    for (const f of ff) { // for each ff,
        // move to above the covered grid point
        ctx.moveTo(gridToPixel(f.x), gridToPixel(f.y) - gridMultiplier / 2);
        // and stroke to below it
        ctx.lineTo(gridToPixel(f.x), gridToPixel(f.y) + gridMultiplier / 2);
    }
    ctx.stroke();
    
    // draw placed stitches
    ctx.globalAlpha = 1;
    ctx.strokeStyle = foregroundColor;
    ctx.beginPath();
    for (const stitch of stitches) {
        ctx.moveTo(gridToPixel(stitch.x1), gridToPixel(stitch.y1));
        ctx.lineTo(gridToPixel(stitch.x2), gridToPixel(stitch.y2));
    }
    ctx.stroke();

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

// remove a stitch when it is outside the workable area
function removeStitch(removedId) {
    const removedIndex = stitches.findIndex(function (stitch) { return stitch.id === removedId; });
    if (removedIndex === -1) {
        console.log("Something went wrong! Search for a stitch to remove came up blank.");
    } else {
        stitches.splice(removedIndex, 1);
    }
}

// Mouse event handlers
canvas.addEventListener('mousemove', function (evt) {
    const canvasPos = canvas.getBoundingClientRect();
    pixelX = evt.clientX - canvasPos.left;
    pixelY = evt.clientY - canvasPos.top;
    // set which grid coordinate is being clicked
    getGridPositions();
    frame();
});

canvas.addEventListener('click', function (evt) {
    // if clicking inside the pattern (not the padding), edit the pattern
    if (foregroundX == clamp(foregroundX, 0, width - 1) && foregroundY == clamp(foregroundY, 0, height - 1)) {
        if (heldPoint.active) { // place a stitch if there's already a held point
            // delete the held point if clicking in the same spot
            if (heldPoint.x == foregroundX && heldPoint.y == foregroundY) {
                heldPoint.active = false;
                // if not deleting, place/remove the stitch and remove/move the held point
            } else {
                let placing = {}; // will need x1, y1, x2, y2 in all cases
                // if placing a horizontal stitch,
                if (heldPoint.y == foregroundY) {
                    // put the leftmost point first
                    if (heldPoint.x < foregroundX) {
                        placing.x1 = heldPoint.x;
                        placing.y1 = heldPoint.y;
                        placing.x2 = foregroundX;
                        placing.y2 = foregroundY;
                    } else {
                        placing.x1 = foregroundX;
                        placing.y1 = foregroundY;
                        placing.x2 = heldPoint.x;
                        placing.y2 = heldPoint.y;
                    }
                    // if not placing a horizontal stitch,
                } else {
                    // put the uppermost point first
                    if (heldPoint.y < foregroundY) {
                        placing.x1 = heldPoint.x;
                        placing.y1 = heldPoint.y;
                        placing.x2 = foregroundX;
                        placing.y2 = foregroundY;
                    } else {
                        placing.x1 = foregroundX;
                        placing.y1 = foregroundY;
                        placing.x2 = heldPoint.x;
                        placing.y2 = heldPoint.y;
                    }
                }

                // toggle the stitch
                // if the stitch already exists, find it
                const indexOfExisting = stitches.findIndex(item =>
                    item.x1 == placing.x1 &&
                    item.y1 == placing.y1 &&
                    item.x2 == placing.x2 &&
                    item.y2 == placing.y2);
                // if you didn't find it, add it
                if (indexOfExisting == -1) {
                    stitches.push(new Stitch(placing.x1, placing.y1, placing.x2, placing.y2));
                    // if you did find it, remove it
                } else {
                    stitches = stitches.filter(item =>
                        !(item.x1 == placing.x1 &&
                            item.y1 == placing.y1 &&
                            item.x2 == placing.x2 &&
                            item.y2 == placing.y2));
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
        frame();
        // if clicking in the padding, expand the grid
    } else {
        if (pixelX >= canvas.width - padding) {
            width++;
            backgroundWidth++;
        }
        if (pixelY >= canvas.height - padding) {
            height++;
            backgroundHeight++;
        }
        if (pixelX <= padding) {
            width++;
            backgroundWidth++;
            for (const stitch of stitches) {
                stitch.pushX();
            }
            for (const fill of ff) {
                fill.x++;
            }
        }
        if (pixelY <= padding) {
            height++;
            backgroundHeight++;
            for (const stitch of stitches) {
                stitch.pushY();
            }
            for (const fill of ff) {
                fill.y++;
            }
        }
        resizeScreen();
        // set which grid coordinate is being clicked
        getGridPositions();
    }
});

canvas.addEventListener('contextmenu', function (evt) {
    // if clicking inside the pattern (not the padding), edit the pattern
    if (foregroundX == clamp(foregroundX, 1, width - 2) && foregroundY == clamp(foregroundY, 1, height - 2)) {
        const indexOfExisting = ff.findIndex(item =>
            item.x == foregroundX &&
            item.y == foregroundY);
        if (indexOfExisting == -1) {
            ff.push({ x: foregroundX, y: foregroundY });
            console.log("added", foregroundX, foregroundY)
        } else {
            ff.splice(indexOfExisting, 1);
        }
        frame();
        // if clicking in the padding, shrink the grid and remove stitches exiting the grid
    } else {
        if (pixelX >= canvas.width - padding) {
            width--;
            backgroundWidth--;
            for (const fill of ff) {
                if (fill.x >= backgroundWidth) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        if (pixelY >= canvas.height - padding) {
            height--;
            backgroundHeight--;
            for (const stitch of stitches) {
                stitch.cullY();
            }
            for (const fill of ff) {
                if (fill.y >= backgroundHeight) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        if (pixelX <= padding) {
            width--;
            backgroundWidth--;
            for (const stitch of stitches) {
                stitch.pullX();
            }
            for (const fill of ff) {
                fill.x--;
                if (fill.x <= 1) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        if (pixelY <= padding) {
            height--;
            backgroundHeight--;
            for (const stitch of stitches) {
                stitch.pullY();
            }
            for (const fill of ff) {
                fill.y--;
                if (fill.y <= 1) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        resizeScreen();
        // set which grid coordinate is being clicked
        getGridPositions();
    }
});

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

// Getter functions for accessing current state
function getStitches() {
    return stitches;
}

function getDimensions() {
    return { width, height };
}

// Export functions and variables that need to be accessed from other modules
// Exports stitches, ff, removeStitch, frame, getStitches, getDimensions
