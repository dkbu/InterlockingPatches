// Pattern generation functionality for the Interlocking Patch Maker

class Stitch {
    static nextId = 1;

    // x1 and y1 are the ones that decide the stitch's position in the pattern
    constructor(x1, y1, domain) {
        this.id = Stitch.nextId++;
        this.x1 = x1;
        this.y1 = y1;
        this.domain = domain
    }

    static other_domain() {
        if (this.domain = "F") {
            return "B";
        } else if (this.domain = "B") {
            return "F";
        }
    }

    is_identical(compared) {
        if (
            this.type == compared.type &&
            this.domain == compared.domain &&
            this.x1 == compared.x1 &&
            this.y1 == compared.y1) {
            return true;
        } else {
            return false;
        }
    }
    /*
    static compare(a, b) {
        // sort by y1 ascending, then x1 ascending
        var ret = b.y2 - a.y2;
        if (ret == 0) {
            ret = a.x1 - b.x1;
        }
        return ret;
    }

    static start_string() {
        return "Ch3";
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
        if (this.is_vertical()) {
            return "F";
        } else {
            return "B";
        }
    }

    static get_default_A_stitch() {
        return "B";
    }

    get_B_stitch() {
        if (this.is_horizontal()) {
            return "B";
        } else {
            return "F";
        }
    }

    static get_default_B_stitch() {
        return "F";
    }
    */

    pushX() {
        this.x1++;
    }

    pushY() {
        this.y1++;
    }

    pullX() {
        this.x1--;
    }

    pullY() {
        this.y1--;
    }

    cullX(width) {
        if (this.x1 < 0 || this.x1 >= width) {
            this.shouldRemove = true;
            return true;
        } else {
            return false;
        }
    }

    cullY(height) {
        if (this.y1 < 0 || this.y1 >= height) {
            this.shouldRemove = true;
            return true;
        } else {
            return false;
        }
    }
}

class LongStitch extends Stitch {
    constructor(x1, y1, x2, y2, domain){
        super(x1, y1, domain);
        this.x2 = x2;
        this.y2 = y2;
        this.type = "LongStitch"
    }

    static possibleStitches = [
        {"deltaX": 2, "deltaY": 1, "isEven": true, "name": "pp←"},
        {"deltaX": 1, "deltaY": 1, "isEven": true, "name": "p"},
        {"deltaX": 1, "deltaY": 2, "isEven": true, "name": "pp↓"},
        {"deltaX": 0, "deltaY": 1, "isEven": true, "name": "F"},
        {"deltaX": -1, "deltaY": 2, "isEven": true, "name": "nn↓"},
        {"deltaX": -1, "deltaY": 1, "isEven": true, "name": "n"},
        {"deltaX": -2, "deltaY": 1, "isEven": true, "name": "nn→"},
        {"deltaX": 2, "deltaY": 1, "isEven": false, "name": "nn→"},
        {"deltaX": 1, "deltaY": 1, "isEven": false, "name": "n"},
        {"deltaX": 1, "deltaY": 2, "isEven": false, "name": "nn↓"},
        {"deltaX": 0, "deltaY": 1, "isEven": false, "name": "F"},
        {"deltaX": -1, "deltaY": 2, "isEven": false, "name": "pp↓"},
        {"deltaX": -1, "deltaY": 1, "isEven": false, "name": "p"},
        {"deltaX": -2, "deltaY": 1, "isEven": false, "name": "pp←"},
    ]

    is_identical(compared) {
        // if comparing to a long stitch,
        if (compared.x2 && compared.y2) {
            // if the stitch is exactly the same or with the points flipped, its identical
            if (
                this.type == compared.type && this.domain == compared.domain &&
                ((this.x1 == compared.x1 && 
                this.y1 == compared.y1 && 
                this.x2 == compared.x2 && 
                this.y2 == compared.y2) ||
                (this.x2 == compared.x1 && 
                this.y2 == compared.y1 && 
                this.x1 == compared.x2 && 
                this.y1 == compared.y2))
            ) {
                return true;
            }
        }
        // if not comparing to a long stitch, its not identical
        else {
            return false;
        }
    }

    // Returns (x, y, domain, stitch) for pattern generation
    get_instruction() {
        // start with the uppermost (aka lowest, since y goes top to bottom) stitch
        let primaryX, primaryY, deltaX, deltaY;
        // horizontal stitch means B on other domain
        if (this.y1 == this.y2) {
            // if showing the foreground color:
            // y stays the same (background is the "catchup color")
            if (this.domain = "F") {
                primaryY = this.y1
                // if on an even/(right to left)/backfacing row,
                if (primaryY % 2 == 0) {
                    primaryX = Math.min(this.x1, this.x2)
                }
                // if on an odd/(left to right)/frontfacing row, 
                else {
                    primaryX = Math.max(this.x1, this.x2)
                }
                return {"x": primaryX, "y": primaryY, "domain": "B", "stitch": "B"};
            }
            // if showing the background color:
            // y moves up 1 (foreground is the "starting color", up is negative)
            else {
                console.log("horizontal background stitch is the default")
                return {"x": -1, "y": -1, "domain": "E", "error": "horizontal background stitch is the default"};
            }
        }
        // y1 on top means first stitch matters
        else {
            if (this.y1 < this.y2) {
                primaryX = this.x1;
                primaryY = this.y1;
                deltaX = this.x2 - this.x1;
                deltaY = this.y2 - this.y1;
            }
            // y1 on bottom means second stitch matters
            else if (this.y1 > this.y2) {
                primaryX = this.x2;
                primaryY = this.y2;
                deltaX = this.x1 - this.x2;
                deltaY = this.y1 - this.y2;
            } else {
                console.log("Something went wrong: Impossible situation while generating pattern")
                return {"x": -1, "y": -1, "domain": "E", "error": "Something went wrong: Impossible situation while generating pattern"};
            }
            // find the stitch with the right deltaX, deltaY, and direction
            let foundIndex = LongStitch.possibleStitches.findIndex(function (i) { return (i.deltaX == deltaX && i.deltaY == deltaY && i.isEven == (primaryY % 2 == 0))})
            let foundStitch;
            if (foundIndex == -1) {
                return {"x": -1, "y": -1, "domain": "E", "error": `Something went wrong: cannot find a name for a stitch with the given properties (deltaX, deltaY, isEven): ${deltaX}, ${deltaY}, ${primaryY % 2 == 0}`};
            } else {
                foundStitch = LongStitch.possibleStitches[foundIndex].name
            }
            return {
                "x": primaryX,
                "y": primaryY,
                "domain": this.domain,
                "stitch": foundStitch
            }
        }
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
    }

    pullY() {
        this.y1--;
        this.y2--;
    }

    cullX(width) {
        if (this.x1 < 0 || this.x1 >= width || this.x2 < 0 || this.x2 >= width) {
            this.shouldRemove = true;
            return true;
        } else {
            return false;
        }
    }

    cullY(height) {
        if (this.y1 < 0 || this.y1 >= height || this.y2 < 0 || this.y2 >= height) {
            this.shouldRemove = true;
            return true;
        } else {
            return false;
        }
    }
}

class PicotStitch extends Stitch {
    constructor(x1, y1, domain) {
        super(x1, y1, domain);
        this.type = "PicotStitch"
    }

    // Returns (x, y, domain, stitch) for pattern generation
    get_instruction(){
        return {"x": this.x1, "y": this.y1, "domain": this.domain, "stitch": "(k)"};
    }
}

class FillStitch extends Stitch {
    constructor(x1, y1, domain) {
        super(x1, y1, domain);
        this.type = "FillStitch"
    }

    // Returns (x, y, domain, stitch) for pattern generation
    get_instruction(){
        return {"x": this.x1, "y": this.y1, "domain": this.domain, "stitch": "ff3"};
    }
}
/*
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

    static getEmptyRow(row_num, is_a) {
        const st = is_a ? Stitch.get_default_A_stitch() : Stitch.get_default_B_stitch();
    
        let ret = new Array(1).fill(Stitch.start_string());
        ret = ret.concat(new Array(row_num - 1).fill(st));
        
        return ret;
    }

    parse() {
        // fill rowsA, rowsB, columnsA, columnsB based on this.stitches
        var currStitchIndex = 0;
        
        var emptyRowLen = this.columnsNumA;
        var emptyRowA = Pattern.getEmptyRow(emptyRowLen, true);
        var emptyRowB = Pattern.getEmptyRow(emptyRowLen - 1, false);

        if (this.stitches.length == 0) {
            // fill with default stitches
            for (let i = this.rowsNumB - 1; i > 0; i--) {
                this.rowsA.push(emptyRowA);
                this.rowsB.push(emptyRowB);
            }
            this.rowsA.push(emptyRowA);
            return;
        }

        var currStitch = this.stitches[currStitchIndex];
        for (let i = this.rowsNumA - 1; i > 0; i--) {
            if (i > currStitch.y2) {
                this.rowsA.push(emptyRowA);
            } else {
                let row = Pattern.getEmptyRow(currStitch.x1, true);

                while (i == currStitch.y2) {
                    row.push(currStitch.get_A_stitch());
                    var lastX = currStitch.x1;
                    currStitchIndex++;
                    if (currStitchIndex >= this.stitches.length) {
                        break;
                    }
                    currStitch = this.stitches[currStitchIndex];
                    if (currStitch.y2 != i) {
                        break;
                    }
                    // fill in any gaps with default stitches
                    var gapSize = currStitch.x1 - lastX - 1;

                    for (let j = 0; j < gapSize; j++) {
                        row.push(Stitch.get_default_A_stitch());
                    }
                }

                // fill in any remaining spaces in the row with default stitches
                for (let j = row.length; j < this.columnsNumA; j++) {
                    row.push(Stitch.get_default_A_stitch());
                }

                this.rowsA.push(row);
            }
        }

        currStitchIndex = 0;
        currStitch = this.stitches[currStitchIndex];

        // todo: refactor to reduce code duplication with above loop
        for (let i = this.rowsNumB - 1; i > 0; i--) {
            if (i > currStitch.y2) {
                this.rowsB.push(emptyRowB);
            } else {
                let row = Pattern.getEmptyRow(currStitch.x1, false);
                while (i == currStitch.y2) {
                    row.push(currStitch.get_B_stitch());
                    var lastX = currStitch.x1;

                    currStitchIndex++;
                    if (currStitchIndex >= this.stitches.length) {
                        break;
                    }
                    currStitch = this.stitches[currStitchIndex];
                    if (currStitch.y2 != i) {
                        break;
                    }

                    // fill in any gaps with default stitches
                    var gapSize = currStitch.x1 - lastX - 1;
                    for (let j = 0; j < gapSize; j++) {
                        row.push(Stitch.get_default_B_stitch());
                    }
                }

                // fill in any remaining spaces in the row with default stitches
                for (let j = row.length; j < this.columnsNumB; j++) {
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

        for (let i = 1; i < row.length; i++) {
            if (row[i] == currentStitchVal) {
                currentStitchCount++;
            } else {
                // append to new_row
                if (currentStitchCount > 1) {
                    new_row += currentStitchVal + currentStitchCount.toString() + " ";
                } else {
                    new_row += currentStitchVal + " ";
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
        // TODO: will need some extra checks for ff stitches, which, 
        // when combined, follow the pattern (2*currentStitchCount+1)


        return new_row;
    }

    compress() {
        // reduce multiple stitches in a row into a single representation
        for (let i = 0; i < this.rowsA.length; i++) {
            this.rowsA[i] = this.compress_row(this.rowsA[i]);
        }
        for (let i = 0; i < this.rowsB.length; i++) {
            this.rowsB[i] = this.compress_row(this.rowsB[i]);
        }
    }

    toString() {
        var output = "";
        var len = this.rowsB.length;
        for (let i = 0; i < len; i++) {
            output += (i + 1).toString() + "A: ";
            output += this.rowsA[i] + "\n";
            output += (i + 1).toString() + "B: ";
            output += this.rowsB[i] + "\n";
        }

        output += (len + 1).toString() + "A: ";
        output += this.rowsA[len] + "\n";

        return output;
    }
} 

// Pattern creation function
function createPattern(stitches, height, width) {
    const sortedStitches = [...stitches].sort(Stitch.compare);
    const pattern = new Pattern(height, width, sortedStitches);
    pattern.parse();
    pattern.compress();
    return pattern;
}
    */

// Export classes and functions
// Exports Stitch, Pattern, createPattern
