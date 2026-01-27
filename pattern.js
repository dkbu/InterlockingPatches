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
        // sort by y2 ascending, then x1 ascending
        var ret = b.y2 - a.y2;
        if (ret == 0) {
            if (b.is_even_row()) {
                // even rows go right to left
                ret = b.x1 - a.x1;
            } else {
                // odd rows go left to right
                ret = a.x2 - b.x2;
            }
        }
        return ret;
    }

    is_even_row() {
        return this.y2 % 2 == 0;
    }

    get_starting_x(columnNum) {
        if (this.is_even_row()) {
            return columnNum - this.x2 - 1;
        } else {
            return this.x1;
        }
    }

    get_ending_x(columnNum) {
        if (this.is_even_row()) {
            return columnNum - this.x1 - 1;
        } else {
            return this.x2;
        }
    }

    static get_gap(stitch1, stitch2, columnNum) {
        if (stitch1.y2 != stitch2.y2) {
            throw new Error("Stitches are not on the same row");
        }
        return Math.abs(stitch2.get_starting_x(columnNum) - stitch1.get_ending_x(columnNum));
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

    static get_final_A_stitch() {
        return "DC"
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

    static getEmptyRow(col_num, is_a, is_end = false) {
        const st = is_a ? Stitch.get_default_A_stitch() : Stitch.get_default_B_stitch();
        const empty_num = is_a ? col_num - 2 : col_num - 1;
        if (empty_num < 0) {
            return [];
        }

        let ret = new Array(1).fill(Stitch.start_string());
        ret = ret.concat(new Array(empty_num).fill(st));

        if (is_a) {
            if (is_end) {
                ret.push(Stitch.get_final_A_stitch());
            } else {
                ret.push(Stitch.get_default_A_stitch());
            }
        }


        return ret;
    }

    parse() {
        // fill rowsA, rowsB, columnsA, columnsB based on this.stitches
        var emptyRowA = Pattern.getEmptyRow(this.columnsNumA, true, true);
        var emptyRowB = Pattern.getEmptyRow(this.columnsNumB, false, true);

        if (this.stitches.length == 0) {
            // fill with default stitches
            for (let i = this.rowsNumB - 1; i > 0; i--) {
                this.rowsA.push(emptyRowA);
                this.rowsB.push(emptyRowB);
            }
            this.rowsA.push(emptyRowA);
            return;
        }

        let i = this.rowsNumA - 1;
        let currBindex = 0;
        let [row, currAindex] =
            this.populateStitchRow(i, 0, true);

        this.rowsA.push(row);

        for (i = this.rowsNumB - 1; i > 0; i--) {
            [row, currBindex] =
                this.populateStitchRow(i, currBindex, false);

            this.rowsB.push(row);

            [row, currAindex] =
                this.populateStitchRow(i, currAindex, true);

            this.rowsA.push(row);
        }


    }

    populateStitchRow(i, stitchIndex, is_a) {
        let row;
        let defaultStitch = is_a ? Stitch.get_default_A_stitch() : Stitch.get_default_B_stitch();
        let columnNum = is_a ? this.columnsNumA : this.columnsNumB;
        let emptyRow = Pattern.getEmptyRow(columnNum, is_a, true);
        let currStitchIndex = stitchIndex;
        if (currStitchIndex >= this.stitches.length) {
            row = emptyRow;
            return [row, currStitchIndex];
        }
        let currStitch = this.stitches[currStitchIndex];

        if (i > currStitch.y2) {
            row = emptyRow;
            ++currStitchIndex;
        } else {
            row = Pattern.getEmptyRow(currStitch.get_starting_x(columnNum), is_a);

            while (i == currStitch.y2) {
                let curr = is_a ? currStitch.get_A_stitch() : currStitch.get_B_stitch();
                row.push(curr);
                var lastStitch = currStitch;
                ++currStitchIndex;
                if (currStitchIndex >= this.stitches.length) {
                    break;
                }
                currStitch = this.stitches[currStitchIndex];
                if (currStitch.y2 != i) {
                    break;
                }
                // fill in any gaps with default stitches
                var gapSize = Stitch.get_gap(lastStitch, currStitch, columnNum);

                for (let j = 0; j < gapSize; j++) {
                    row.push(defaultStitch);
                }
            }

            // fill in any remaining spaces in the row with default stitches
            if (is_a) {
                for (let j = row.length; j < columnNum - 1; j++) {
                    row.push(defaultStitch);
                }
                row.push(Stitch.get_final_A_stitch());
            } else {
                for (let j = row.length; j < columnNum; j++) {
                    row.push(defaultStitch);
                }
            }
        }
        return [row, currStitchIndex];
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
            output += this.rowsA[i] + "\r\n";
            output += (i + 1).toString() + "B: ";
            output += this.rowsB[i] + "\r\n";
        }

        output += (len + 1).toString() + "A: ";
        output += this.rowsA[len] + "\r\n";
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
