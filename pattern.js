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
        if (this.x1 < 0 || this.x1 >= width - 1 || this.x2 < 0 || this.x2 >= width - 1) {
            this.shouldRemove = true;
        }
    }

    cullY(height) {
        if (this.y1 < 0 || this.y1 >= height - 1 || this.y2 < 0 || this.y2 >= height - 1) {
            this.shouldRemove = true;
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

    parse() {
        // fill rowsA, rowsB, columnsA, columnsB based on this.stitches
        var currStitchIndex = 0;

        if (this.stitches.length == 0) {
            // fill with default stitches
            for (let i = 0; i < this.rowsNumA; i++) {
                this.rowsA.push(new Array(this.columnsNumA).fill(Stitch.get_default_A_stitch()));
            }
            for (let i = 0; i < this.rowsNumB; i++) {
                this.rowsB.push(new Array(this.columnsNumB).fill(Stitch.get_default_B_stitch()));
            }
            return;
        }

        var currStitch = this.stitches[currStitchIndex];
        for (let i = 0; i < this.rowsNumA; i++) {
            if (i < currStitch.y1) {
                this.rowsA.push(new Array(this.columnsNumA).fill(Stitch.get_default_A_stitch()));
            } else {
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

        for (let i = 0; i < this.rowsNumB; i++) {
            if (i < currStitch.y1) {
                this.rowsB.push(new Array(this.columnsNumB).fill(Stitch.get_default_B_stitch()));
            } else {
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
        for (let i = 0; i < this.columnsNumB; i++) {
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

// Pattern creation function
function createPattern(stitches, height, width) {
    const sortedStitches = [...stitches].sort(Stitch.compare);
    const pattern = new Pattern(height, width, sortedStitches);
    pattern.parse();
    pattern.compress();
    return pattern;
}

// Export classes and functions
export {
    Stitch,
    Pattern,
    createPattern
};
