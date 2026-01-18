// Pattern generation functionality for the Interlocking Patch Maker

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
        // sort by y1 ascending, then x1 ascending
        var ret = b.y2 - a.y2;
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
        // Mark for removal if out of bounds - canvas will handle the actual removal
        if (this.x1 < 0 || this.x2 < 0) {
            this.shouldRemove = true;
        }
    }

    pullY() {
        this.y1--;
        this.y2--;
        // Mark for removal if out of bounds - canvas will handle the actual removal
        if (this.y1 < 0 || this.y2 < 0) {
            this.shouldRemove = true;
        }
    }

    cullX(width) {
        if (this.x1 < 0 || this.x1 >= width || this.x2 < 0 || this.x2 >= width) {
            this.shouldRemove = true;
            return true;
        }
    }

    cullY(height) {
        if (this.y1 < 0 || this.y1 >= height || this.y2 < 0 || this.y2 >= height) {
            this.shouldRemove = true;
            return true;
        }
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

    static getEmptyRow(row_num, is_a) {
        const st = is_a ? Stitch.get_default_A_stitch() : Stitch.get_default_B_stitch();
        return new Array(row_num).fill(st);
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

// Export classes and functions
// Exports Stitch, Pattern, createPattern
