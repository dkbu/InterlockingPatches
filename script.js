/*
NOTES:
    grid coordinates start at 1, not 0. 0 is in the padding area.
    Controls: left click to start a line, left click again to finish it (or ctrl-left-click to continue the line). right click places an ff
    Current implementation relies on the vertical padding and grid size being the same as the horizontal padding and grid size
    TODO is things I knew I'd forget otherwise; DONE is things from that I've finished

TODO:
    change how lines are deleted? it seems fine enough but could be faster
    the whole "convert to pattern" thing. yknow. the whole point
    background functionality with right-click
    prevent clicking on things which dont have a possible stitch
        allow lines which make up multiple stitches - a la 2 down, 2 left
    fix bug when user changes viewport size without moving their mouse... actually does that matter. like at all
    dynamic board size!



DONE:
    ctrl-click to continue a line
    make deleting lines functional
    prevent out-of-bounds clicks
*/  

// fully static variables; never make these dynamic
const canvas = document.getElementById("designerCanvas");// set a reference to the canvas element in HTML
const ctx = canvas.getContext("2d");// the drawing context of the canvas
const translucent = 0.5; // alpha channel, variable so it can be changed everywhere at once

// some hard-to-calculate constants, so they arent re-calculated a lot
const pi2 = Math.PI*2;

const background = true; // to indicate when a function needs the background grid


// (currently) static variables; when made dynamic, change "const" to "let"
canvas.width = 500; // width, in pixels, of the canvas. this sets it in HTML as well
const width = 15; // how many *foreground* stitches there are horizontally
const height = 19; // how many *foreground* stitches there are vertically
const padding = 10; // width, in pixels, of the unused space on each side of the canvas
const foregroundColor = "rgb(0, 0, 0)";
const backgroundColor = "rgba(193, 164, 133, 1)";
const highlightColor = "rgba(110, 68, 224, 1)"

// fully dynamic variables; these change with user input
let heldPoint = {x: 0, y: 0, active: false}; // tracks the start point of a line, if there is one
let pixelX, pixelY, foregroundX, foregroundY, backgroundX, backgroundY = 0; // these will change as soon as the user interacts with the canvas

// calculated variables; will need to be recalculated when their constituent parts are changed
const backgroundWidth = width-1; // how many *background* stitches there are horizontally
const backgroundHeight = height-1; // how many *background* stitches there are vertically
canvas.height = ((canvas.width-padding*2)*height/width)+padding*2; // height, in pixels, of the canvas. this sets it in HTML as well
const gridMultiplier = (canvas.height-padding*2)/height;
const lineWidth = gridMultiplier/2-5;
const circleRadius = lineWidth/2; // to round off sharp lines
const thinWidth = lineWidth/3; // may need to be slightly wider or thinner, not sure yet
const thinRadius = thinWidth/2;
// verify that the horizontal and vertical grid multiplier are the same. They should always be (implementation relies on that assumption)
if (gridMultiplier!=((canvas.width-padding*2)/width)) {
    alert("something went wrong: grid spacing is inconsistent!");
}
const xLimit = gridToPixel(width);
const yLimit = gridToPixel(height);
const backgroundXLimit = gridToPixel(backgroundWidth, background);
const backgroundYLimit = gridToPixel(backgroundHeight, background);
// an array of objects defining each connection. first is the top point, or leftmost if they're on the same Y
let lines = [];
// an array of objects, which are an x and y of points covered by an ff
let ff = [];

// Execution Functions
// Change what's displayed
function frame() {
    // in case a drawing variable wasn't reset correctly, set them
    ctx.globalAlpha = 1;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    // clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    // draw the static parts under everything else (it draws everything despite some being on a higher layer, but anything drawn that shouldnt be will be covered!)
    // draw the padding
    ctx.lineWidth = padding*2;
    ctx.strokeStyle = "gray";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();


    ctx.lineWidth = lineWidth;
    // draw the foreground lines
    ctx.strokeStyle = foregroundColor;
    ctx.beginPath();
    for (let x=gridToPixel(1); x<=xLimit; x+=gridMultiplier) {
        // for each vertical column, draw a line top to bottom
        ctx.moveTo(x, gridToPixel(1));
        ctx.lineTo(x, yLimit);
    }
    for (let y=gridToPixel(1); y<=yLimit; y+=gridMultiplier) {
        // for each horizontal row, draw a line top to bottom
        ctx.moveTo(gridToPixel(1), y);
        ctx.lineTo(xLimit, y);
    }
    ctx.stroke();

    // draw the background lines
    ctx.strokeStyle = backgroundColor;
    ctx.beginPath();
    for (let x=gridToPixel(1, background); x<=backgroundXLimit; x+=gridMultiplier) {
        // for each vertical column, draw a line top to bottom
        ctx.moveTo(x, gridToPixel(1, background));
        ctx.lineTo(x, backgroundYLimit);
    }
    for (let y=gridToPixel(1, background); y<=backgroundYLimit; y+=gridMultiplier) {
        // for each horizontal row, draw a line top to bottom
        ctx.moveTo(gridToPixel(1, background), y);
        ctx.lineTo(backgroundXLimit, y);
    }
    ctx.stroke();

    
    // draw dynamic pieces on top
    // draw placed ff's
    ctx.strokeStyle = backgroundColor;
    ctx.beginPath();
    for (const f of ff) { // for each ff,
        // move to above the covered grid point
        ctx.moveTo(gridToPixel(f.x), gridToPixel(f.y)-gridMultiplier/2);
        // and stroke to below it
        ctx.lineTo(gridToPixel(f.x), gridToPixel(f.y)+gridMultiplier/2);
    }
    ctx.stroke();
    // draw placed lines
    ctx.globalAlpha = 1;
    ctx.strokeStyle = foregroundColor;
    ctx.beginPath();
    for (const line of lines) {
        ctx.moveTo(gridToPixel(line.x1), gridToPixel(line.y1));
        ctx.lineTo(gridToPixel(line.x2), gridToPixel(line.y2));
    }
    ctx.stroke();
    

    // draw translucent pieces
    ctx.globalAlpha = translucent;
    ctx.fillStyle = highlightColor;
    ctx.strokeStyle = highlightColor;
    ctx.beginPath();
    // draw the line that would be snapped to, if theres currently a start point for a line
    if (heldPoint.active) {
        // start at the start point, draw the rounding-off circle, line to the snapped-to point,
        ctx.moveTo(gridToPixel(heldPoint.x), gridToPixel(heldPoint.y));
        ctx.lineTo(gridToPixel(foregroundX), gridToPixel(foregroundY));
        ctx.stroke();
    } else {
        // if there's no line, draw the snapped-to circle
        ctx.moveTo(gridToPixel(foregroundX), gridToPixel(foregroundY));
        ctx.arc(gridToPixel(foregroundX), gridToPixel(foregroundY), circleRadius, 0, pi2);
        ctx.fill();
    }
}

// User Input Functions
canvas.addEventListener('mousemove', function(evt) {
    const canvasPos = canvas.getBoundingClientRect();
    pixelX = evt.clientX - canvasPos.left;
    pixelY = evt.clientY - canvasPos.top;
    // set the variables. if out of bounds, go to the closest in-bounds point
    foregroundX = clamp(pixelToGrid(pixelX), 1, width);
    foregroundY = clamp(pixelToGrid(pixelY), 1, height);
    backgroundX = clamp(pixelToGrid(pixelX, background), 1, width);
    backgroundY = clamp(pixelToGrid(pixelY, background), 1, height);
    frame();
});
canvas.addEventListener('click', function(evt) {
    // for testing - logs which grid points are associated with the current pixel
    console.log("pixel:", pixelX, pixelY, "\nforeground:", foregroundX, foregroundY, "\nbackground:", backgroundX, backgroundY);
    if (heldPoint.active) { // place a line if there's already a held point
        // delete the held point if clicking in the same spot
        if (heldPoint.x == foregroundX && heldPoint.y == foregroundY) {
            heldPoint.active = false;
        // if not deleting, place/remove the line and remove/move the held point
        } else {
            let placing = {}; // will need x1, y1, x2, y2 in all cases
            // if placing a horizontal line,
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
            // if not placing a horizontal line,
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


            // toggle the line
            // if the line already exists, find it
            const indexOfExisting = lines.findIndex(item => 
                item.x1 == placing.x1 && 
                item.y1 == placing.y1 && 
                item.x2 == placing.x2 && 
                item.y2 == placing.y2); // theres probably a better way to do this but structuredClone()ing each didnt work
            // if you didn't find it, add it
            if (indexOfExisting == -1) {
                lines.push(structuredClone(placing));
            // if you did find it, remove it
            } else {
                lines.splice(indexOfExisting, 1);
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
})
canvas.addEventListener('contextmenu', function(evt) {
    const indexOfExisting = ff.findIndex(item =>
        item.x == foregroundX &&
        item.y == foregroundY);
    if (indexOfExisting == -1) {
        ff.push({x: foregroundX, y: foregroundY});
        console.log("added", foregroundX, foregroundY)
    } else {
        ff.splice(indexOfExisting, 1);
    }
    frame();
})

// Number Manipulation Functions
// convert from a pixel location to its associated foreground or background grid location.
function pixelToGrid(pixelX, onBackground = false) {
    if (!onBackground) { // if placing in the foreground grid
        return Math.floor((pixelX-padding)/gridMultiplier+1); // the +1 is because grid coordinates start at 1
    } else { // if placing in the background grid
        return Math.floor((pixelX-padding)/gridMultiplier+0.5); // shift half a grid coordinate up/right
    }
}
// convert from a grid unit to the associated pixel location
function gridToPixel(gridX, onBackground = false) {
    if (!onBackground) { // if converting from the foreground grid,
        return (gridX-0.5)*gridMultiplier+padding+0.5;
        // The -0.5 is:
        // -1 for starting grid coordinates at 1 
        // +0.5 to center it rather than have it in the corner of the bounding box
    } else { // if converting from the background grid,
        return (gridX)*gridMultiplier+padding+0.5;
        // no constant because:
        // -1 for starting grid coordinates at 1
        // +0.5 to center it
        // -0.5 to shift to background coordinates
    }
}
// clamp a number between two other numbers
function clamp(toClamp, minClamp, maxClamp) {
    if (minClamp>maxClamp) {
        alert("Something went wrong: tried to clamp with a higher minimum than maximum!");
        return toClamp;
    }
    return Math.max(minClamp, Math.min(maxClamp, toClamp));
}

// EXECUTION:
// set up visuals at page start
frame();