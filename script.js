/*
NOTES:
    grid coordinates start at 1, not 0. 0 is in the padding area.
    Controls: left click to start a line, left click again to finish it (or ctrl-left-click to continue the line). right click places an ff
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


DONE:
    ctrl-click to continue a line
    make deleting lines functional
    prevent out-of-bounds clicks
    dynamic pattern size!
    right-click to reduce pattern size
    background functionality with right-click
    (mostly) fix ff out-of-bounds (and potential Pattern implications)
*/  


// export button functionality
const btnExport = document.getElementById("exportBtn");
btnExport.addEventListener('click', onExportClick);

class Stitch {
    static nextId = 1;

    // x1 is the leftmost x, y1 is the uppermost y
    constructor(x1, y1, x2, y2) {
        this.id = Stitch.nextId++;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    static compare(a, b) {
        var ret = a.y1 - b.y1;
        if (ret == 0) {
            ret = a.x1 - b.x1;
        }
        return ret;
    }

    is_horizontal() {
        return this.y1 == this.y2;
    }

    is_vertical() {
        return this.x1 == this.x2;
    }

    is_diagonal() {
        return !this.is_horizontal() && !this.is_vertical();
    }

    get_A_stitch() {
        if (this.is_horizontal()) {
            return "F";
        } else {
            return "B";
        }
    }

    static get_default_A_stitch() {
        return "B";
    }

    get_B_stitch() {
        if (this.is_vertical()) {
            return "B";
        }
        else {
            return "F";
        }
    }

    static get_default_B_stitch() {
        return "F";
    }

    pushX() {
        this.x1++;
        this.x2++;
    }

    pushY() {
        this.y1++;
        this.y2++;
    }

    pullX() {
        this.x1--;
        this.x2--;
        this.cullX();
    }

    pullY() {
        this.y1--;
        this.y2--;
        this.cullY();
    }

    cullX() {
        if (this.x1<0 || this.x1>width || this.x2<0 || this.x2>width) { removeStitch(this.id); }
    }

    cullY() {
        if (this.y1<0 || this.y1>height || this.y2<0 || this.y2>height) { removeStitch(this.id); }
    }

}

class Pattern {
    constructor(height, width, stitches) {
        this.rowsNumA = height;
        this.rowsNumB = height - 1;
        this.rowsA = [];
        this.rowsB = [];
        this.columnsNumA = width;
        this.columnsNumB = width - 1;

        this.stitches = stitches; // array of Stitch objects
    }

    parse() {
        // fill rowsA, rowsB, columnsA, columnsB based on this.stitches
        var currStitchIndex = 0;

        if (this.stitches.length == 0) {
            // fill with default stitches
            for (let i=0; i<this.rowsNumA; i++) {
                this.rowsA.push(new Array(this.columnsNumA).fill(Stitch.get_default_A_stitch()));
            }
            for (let i=0; i<this.rowsNumB; i++) {
                this.rowsB.push(new Array(this.columnsNumB).fill(Stitch.get_default_B_stitch()));
            }
            return;
        }

        var currStitch = this.stitches[currStitchIndex];
        for (let i = 0; i < this.rowsNumA; i++) {
            if (i < currStitch.y1) {
                this.rowsA.push(new Array(this.columnsNumA).fill(Stitch.get_default_A_stitch()));
            }
            else 
            {
                let row = new Array(currStitch.x1 - 1).fill(Stitch.get_default_A_stitch());
                    
                while (i == currStitch.y1) {

                    row.push(currStitch.get_A_stitch());
                    var lastX = currStitch.x1;
                    currStitchIndex++;
                    if (currStitchIndex >= this.stitches.length) {
                        break;
                    }
                    currStitch = this.stitches[currStitchIndex];
                    // fill in any gaps with default stitches
                    var gapSize = currStitch.x1 - lastX - 1;

                    for (let j=0; j<gapSize; j++) {
                        row.push(Stitch.get_default_A_stitch());
                    }

                }

                // fill in any remaining spaces in the row with default stitches
                for (let j=row.length; j<this.columnsNumA; j++) {
                    row.push(Stitch.get_default_A_stitch());
                }

                this.rowsA.push(row);
            }
        }

        currStitchIndex = 0;
        currStitch = this.stitches[currStitchIndex];

        for (let i = 0; i < this.rowsNumB; i++) {
            if (i < currStitch.y1) {
                this.rowsB.push(new Array(this.columnsNumB).fill(Stitch.get_default_B_stitch()));
            }
            else 
            {
                let row = new Array(currStitch.x1 - 1).fill(Stitch.get_default_B_stitch());
                while (i == currStitch.y1) {
                    row.push(currStitch.get_B_stitch());
                    var lastX = currStitch.x1;

                    currStitchIndex++;
                    if (currStitchIndex >= this.stitches.length) {
                        break;
                    }
                    currStitch = this.stitches[currStitchIndex];
                    // fill in any gaps with default stitches
                    var gapSize = currStitch.x1 - lastX - 1;
                    for (let j=0; j<gapSize; j++) {
                        row.push(Stitch.get_default_B_stitch());
                    }
                }

                // fill in any remaining spaces in the row with default stitches
                for (let j=row.length; j<this.columnsNumB; j++) {
                    row.push(Stitch.get_default_B_stitch());
                }
                this.rowsB.push(row);
            }

        }
    }

    compress_row(row) {
        var new_row = "";
        var currentStitchVal = row[0];
        var currentStitchCount = 1;

        for (let i=1; i<row.length; i++) {
            if (row[i] == currentStitchVal) {
                currentStitchCount++;
            } else {
                // append to new_row
                if (currentStitchCount > 1) {
                    new_row += currentStitchVal + currentStitchCount.toString();
                } else {
                    new_row += currentStitchVal;
                }
                // reset counters
                currentStitchVal = row[i];
                currentStitchCount = 1;
            }
        }

        // append final stitch
        if (currentStitchCount > 1) {
            new_row += currentStitchVal + currentStitchCount.toString();
        } else {
            new_row += currentStitchVal;
        }

        return new_row;
    }

    compress() {
        // reduce multiple stitches in a row/column into a single representation
        for (let i=0; i<this.rowsA.length; i++) {
            this.rowsA[i] = this.compress_row(this.rowsA[i]);
        }
        for (let i=0; i<this.rowsB.length; i++) {
            this.rowsB[i] = this.compress_row(this.rowsB[i]);
        }
    }

    toString() {
        var output = "";
        for (let i=0; i<this.columnsNumB; i++) {
            output += (i + 1).toString() + "A: ";
            output += this.rowsA[i] + "\n";
            output += (i + 1).toString() + "B: ";
            output += this.rowsB[i] + "\n";
        }

        output += (this.columnsNumB + 1).toString() + "A: ";
        output += this.rowsA[this.columnsNumB] + "\n";

        return output;
    }
}

var stitches = [];




function createPattern() {
    stitches.sort(Stitch.compare);
    var pattern = new Pattern(height, width, stitches);
    pattern.parse();
    pattern.compress();
    return pattern;
}

function onExportClick(event) {
    filename = "pattern.txt";

    let pattern = createPattern();
    let output = pattern.toString();

    const blob = new Blob([output], {type: 'text'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
}


// fully static variables; never make these dynamic
const canvas = document.getElementById("designerCanvas");// set a reference to the canvas element in HTML
const ctx = canvas.getContext("2d");// the drawing context of the canvas
const translucent = 0.5; // alpha channel, variable so it can be changed everywhere at once

// some hard-to-calculate constants, so they arent re-calculated a lot
const pi2 = Math.PI*2;

const background = true; // to indicate when a function needs the background grid


// (currently) static variables; when made dynamic, change "const" to "let"
let width = 10; // how many *foreground* stitches there are horizontally
let height = 10; // how many *foreground* stitches there are vertically
const padding = 20; // width, in pixels, of the unused space on each side of the canvas
const foregroundColor = "rgb(0, 0, 0)";
const backgroundColor = "rgba(193, 164, 133, 1)";
const highlightColor = "rgba(110, 68, 224, 1)"

// fully dynamic variables; these change with user input
let heldPoint = {x: 0, y: 0, active: false}; // tracks the start point of a line, if there is one
let pixelX, pixelY, foregroundX, foregroundY, backgroundX, backgroundY = 0; // these will change as soon as the user interacts with the canvas

// calculated variables; will need to be recalculated when their constituent parts are changed
// an array of objects defining each connection. first is the top point, or leftmost if they're on the same Y
let lines = [];
// an array of objects, which are an x and y of points covered by an ff
let ff = [];
let backgroundWidth = width-1; // how many *background* stitches there are horizontally
let backgroundHeight = height-1; // how many *background* stitches there are vertically
let gridMultiplier, lineWidth, circleRadius, thinWidth, thinRadius, xLimit, yLimit, backgroundXLimit, backgroundYLimit;
resizeScreen();



// Variable Calculation Functions
// Adjust screen when dimensions change
function resizeScreen() {
    // determine which dimension will decide the screen width
    // Math.floor may not be strictly necessary, but it mitigates anti-aliasing
    const verticalMaxGridMultiplier = Math.floor((window.screen.height*0.8 - 2*padding)/height);
    const horizontalMaxGridMultiplier = Math.floor((window.screen.width*0.8 - 2*padding)/width);
    // if vertical space limits the grid size, use that for dimensions
    if (verticalMaxGridMultiplier<=horizontalMaxGridMultiplier) { 
        gridMultiplier = verticalMaxGridMultiplier;
        canvas.height = window.screen.height*0.8;
        canvas.width = width*gridMultiplier + 2*padding;
    // otherwise, use horizontal space (the limiting factor) for dimensions
    } else {
        gridMultiplier = horizontalMaxGridMultiplier;
        canvas.width = window.screen.width*0.8;
        canvas.height = height*gridMultiplier + 2*padding;
    }
    xLimit = gridToPixel(width);
    yLimit = gridToPixel(height);
    backgroundXLimit = gridToPixel(backgroundWidth, background);
    backgroundYLimit = gridToPixel(backgroundHeight, background);
    lineWidth = gridMultiplier/2.5;
    circleRadius = lineWidth/2; // to round off sharp lines
    thinWidth = lineWidth/3; // may need to be slightly wider or thinner, not sure yet
    thinRadius = thinWidth/2;
    // verify that each stitch has enough space to clearly show every stitch
    if (thinRadius<1) {
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
// remove a stitch when it is outside the workable area
function removeStitch(removedId) {
    const removedIndex = stitches.findIndex(function(stitch) { return stitch.id === removedId});
    if (removedIndex === -1) {
        console.log("Something went wrong! Search for a stitch to remove came up blank.");
    } else {
        stitches.splice(removedIndex, 1);
    }
}

// User Input Functions
canvas.addEventListener('mousemove', function(evt) {
    const canvasPos = canvas.getBoundingClientRect();
    pixelX = evt.clientX - canvasPos.left;
    pixelY = evt.clientY - canvasPos.top;
    // set which grid coordinate is being clicked
    getGridPositions();
    frame();
});
canvas.addEventListener('click', function(evt) { 
    // for testing - logs which grid points are associated with the current pixel
    // console.log("pixel:", pixelX, pixelY, "\nforeground:", foregroundX, foregroundY, "\nbackground:", backgroundX, backgroundY);
    // if clicking inside the pattern (not the padding), edit the pattern
    if (foregroundX == clamp(foregroundX, 1, width) && foregroundY == clamp(foregroundY, 1, height)) {
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
                    stitches.push(new Stitch(placing.x1 - 1, placing.y1 - 1, placing.x2 - 1, placing.y2 - 1));
                // if you did find it, remove it
                } else {
                    lines.splice(indexOfExisting, 1);
                    stitches = stitches.filter(item =>
                        !(item.x1 == placing.x1 - 1 && 
                        item.y1 == placing.y1 - 1 && 
                        item.x2 == placing.x2 - 1 && 
                        item.y2 == placing.y2 - 1));
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
        if (pixelX>=canvas.width-padding) {
            width++;
            backgroundWidth++;
        }
        if (pixelY>=canvas.height-padding) {
            height++;
            backgroundHeight++;
        }
        if (pixelX<=padding) {
            width++;
            backgroundWidth++;
            for (const stitch of stitches) {
                stitch.pushX();
            }
            // change lines array, while its still needed. Hopefully remove later
            for (const line of lines) {
                line.x1++;
                line.x2++;
            }
            for (fill of ff) {
                fill.x++;
            }
        }
        if (pixelY<=padding) {
            height++;
            backgroundHeight++;
            for (const stitch of stitches) {
                stitch.pushY();
            }
            // change lines array, while its still needed. Hopefully remove later
            for (const line of lines) {
                line.y1++;
                line.y2++;
            }
            for (fill of ff) {
                fill.y++;
            }
        }
        resizeScreen();
        // set which grid coordinate is being clicked
        getGridPositions();
    }
})
canvas.addEventListener('contextmenu', function(evt) {
    // if clicking inside the pattern (not the padding), edit the pattern
    if (foregroundX == clamp(foregroundX, 2, backgroundWidth) && foregroundY == clamp(foregroundY, 2,backgroundHeight)) {
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
    // if clicking in the padding, shrink the grid and remove stitches exiting the grid
    } else {
        if (pixelX>=canvas.width-padding) {
            width--;
            backgroundWidth--;
            for (const stitch of stitches) {
                stitch.cullX();
            }
            for (const line of lines) {
                if (line.x1>width || line.x2>width) {
                    lines.splice(lines.indexOf(line), 1);
                }
            }
            for (const fill of ff) {
                if (fill.x>backgroundWidth) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        if (pixelY>=canvas.height-padding) {
            height--;
            backgroundHeight--;
            for (const stitch of stitches) {
                stitch.cullY();
            }
            for (const line of lines) {
                if (line.y1>height || line.y2>height) {
                    lines.splice(lines.indexOf(line), 1);
                }
            }
            for (const fill of ff) {
                if (fill.y>backgroundHeight) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        if (pixelX<=padding) {
            width--;
            backgroundWidth--;
            for (const stitch of stitches) {
                stitch.pullX();
            }
            // change lines array, while its still needed. Hopefully remove later
            for (const line of lines) {
                line.x1--;
                line.x2--;
                if (line.x1<1 || line.x2<1) {
                    lines.splice(lines.indexOf(line), 1);
                }
            }
            for (const fill of ff) {
                fill.x--;
                if (fill.x<=1) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        if (pixelY<=padding) {
            height--;
            backgroundHeight--;
            for (const stitch of stitches) {
                stitch.pullY();
            }
            // change lines array, while its still needed. Hopefully remove later
            for (const line of lines) {
                line.y1--;
                line.y2--;
                if (line.y1<1 || line.y2<1) {
                    lines.splice(lines.indexOf(line), 1);
                }
            }
            for (const fill of ff) {
                fill.y--;
                if (fill.y<=1) {
                    ff.splice(ff.indexOf(fill), 1)
                }
            }
        }
        resizeScreen();
        // set which grid coordinate is being clicked
        getGridPositions();
    }
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
        // The +0.5 is to mitigate anti-aliasing (when possible)
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
        console.log("Something went wrong: tried to clamp with a higher minimum than maximum!\nClamping in reverse to accomodate.");
        return Math.max(maxClamp, Math.min(minClamp, toClamp));
    }
    return Math.max(minClamp, Math.min(maxClamp, toClamp));
}