// Export functionality for the Interlocking Patches application

// Global element references
let btnExport;
let loadCanvas;

// Export button click handler
function onExportClick(event) {
    const filename = "pattern.txt";

    const { width, height } = getDimensions();
    const stitches = getStitches();
    let pattern = createPattern(stitches, height, width);
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

// Save canvas to file
function saveCanvas() {
    const filename = "saved.pattern";

    let output = JSON.stringify({
        foregroundColor: foregroundColorPicker.value, 
        backgroundColor: backgroundColorPicker.value, 
        width: canvasWidthInput.value, 
        height: canvasHeightInput.value, 
        stitches: stitches, 
        ff: ff
    });

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

// Load canvas from file
function readLoaded() {
    const reader = new FileReader();
    reader.onload = (evt) => {
        console.log("Loading from file...");
    };
    reader.readAsText(loadCanvas.files[0]);
    reader.onloadend = function() {
        try {
            const dataIn = JSON.parse(reader.result);
            foregroundColorPicker.value = dataIn.foregroundColor;
            backgroundColorPicker.value = dataIn.backgroundColor;
            canvasWidthInput.value = dataIn.width;
            canvasHeightInput.value = dataIn.height;
            
            // stitches needs the objects remade
            stitchNonObjects = dataIn.stitches;
            stitches = [];
            for (stitch of stitchNonObjects) {
                stitches.push(new Stitch(stitch.x1, stitch.y1, stitch.x2, stitch.y2));
            }
            ff = dataIn.ff;
            resizeCanvas();
        } catch (err) {
            console.log("Something went wrong loading a pattern:", err);
            alert("Pattern loading didn't go as planned.\nMake sure you're loading a .pattern file from the same site version!");
        }
    };
}

// Clear canvas functionality
function clearCanvas() {
    if(confirm("Are you sure you want to clear the canvas?")) {
        stitches= [];
        ff = [];
        frame();
    }
}

// Initialize all functionality
function initializeAllFunctionality() {
    loadCanvas = document.getElementById("load");
    loadCanvas.addEventListener("change", readLoaded);

    // Export button only in local dev, marked by the existence of 
    // localdev.js which sets isLocalDev to true
    try {
        if (isLocalDev) {
            btnExport = document.getElementById("exportBtn");
            btnExport.style.display = "inline";
            btnExport.addEventListener('click', onExportClick);
        }
    } catch (e) {
        console.log("Production environment detected, hiding export button.");
    }
}