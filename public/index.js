const fileTypes = [
    "image/apng",
    "image/bmp",
    "image/gif",
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/svg+xml",
    "image/tiff",
    "image/webp",
    "image/x-icon",
];

function validFileType(file) {
    return fileTypes.includes(file.type);
}

class Pixel {
    constructor(r, g, b, a = 255) {
        this.r = Math.floor(r);
        this.g = Math.floor(g);
        this.b = Math.floor(b);
        this.a = Math.floor(a);
    }

    grayscale() {
        return 0.299 * this.r + 0.587 * this.g + 0.114 * this.b;
    }

    get hash() {
        return `${this.r},${this.g},${this.b},${this.a}`;
    }
}

class PixelArray {
    constructor(...pixels) {
        this.pixels = pixels;
    }

    addPixel(pixel) {
        this.pixels.push(pixel);
    }

    *getPixels() {
        for (const pixel of this.pixels) {
            yield pixel;
        }
    }

    *getPixelsGrouped(dx) {
        for (let i = 0; i < this.pixels.length; i += dx) {
            yield this.pixels.slice(i, i + dx);
        }
    }

    get length() {
        return this.pixels.length;
    }

    slice(start, end) {
        return new PixelArray(...this.pixels.slice(start, end));
    }
}

class PixelArray2D {
    constructor(pixels, width, height) {
        if (width * height != pixels.length) {
            throw new Error("Image dimensions do not match!");
        }
        this.rows = [];
        for (let x = 0; x < pixels.length; x += width) {
            let row = new PixelArray(...pixels.slice(x, x + width));
            this.rows.push(row);
        }
    }

    get width() {
        return this.rows[0].length;
    }

    get height() {
        return this.rows.length;
    }

    get meanPixel() {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let numPixels = this.width * this.height;

        for (const row of this.rows) {
            for (const pixel of row.getPixels()) {
                r += pixel.r;
                g += pixel.g;
                b += pixel.b;
                a += pixel.a;
            }
        }

        r /= numPixels;
        g /= numPixels;
        b /= numPixels;
        a /= numPixels;

        return new Pixel(r, g, b, a);
    }

    *getFlattened() {
        for (const row of this.rows) {
            for (const pixel of row.getPixels()) {
                yield pixel;
            }
        }
    }

    clone() {
        return new PixelArray2D(
            [...this.getFlattened()],
            this.width,
            this.height
        );
    }

    makeDivisible({ x = 0, y = 0, crop = true } = {}) {
        let copy = this.clone();

        if (x != 0) {
            let rowLength = copy.width;
            let excessX = rowLength % x;
            if (crop) {
                copy.rows = copy.rows.map((row) =>
                    row.slice(0, rowLength - excessX)
                );
            }
        }

        if (y != 0) {
            let columnLength = copy.height;
            let excessY = columnLength % y;
            if (crop) {
                copy.rows = copy.rows.slice(0, columnLength - excessY);
            }
        }

        return copy;
    }

    groupPixels(dx, dy) {
        let copy = this.makeDivisible({ x: dx, y: dy });

        let groups = [];
        for (let y = 0; y < copy.height; y += dy) {
            let currentRow = [];
            let rowGroup = copy.rows.slice(y, y + dy);
            let groupedRows = rowGroup.map((row) => row.getPixelsGrouped(dx));

            for (let x = 0; x < copy.width; x += dx) {
                let currentGroup = [];
                for (const groupedRow of groupedRows) {
                    currentGroup.push(groupedRow.next().value);
                }
                currentRow.push(new PixelArray2D(currentGroup.flat(), dx, dy));
            }
            groups.push(currentRow);
        }

        return groups;
    }

    quantize(width, height, numColors) {
        let dx = Math.floor(this.width / width);
        let dy = Math.floor(this.height / height);
        let groups = this.groupPixels(dx, dy);
        let means = groups.map((row) =>
            row.map((pixelGroup) => pixelGroup.meanPixel)
        );

        let flattennedColors = [];

        for (const row of means) {
            for (const pixel of row) {
                flattennedColors.push([pixel.r, pixel.g, pixel.b, pixel.a]);
            }
        }

        let colorClusters = kmeans(flattennedColors, numColors);
        let colorMap = {};

        for (const cluster of colorClusters.clusters) {
            let centroid = new Pixel(...cluster.centroid);
            for (const point of cluster.points) {
                colorMap[new Pixel(...point).hash] = centroid;
            }
        }

        let quantizedMeans = means.map((row) =>
            row.map((pixel) => colorMap[pixel.hash])
        );

        return new PixelArray2D(
            quantizedMeans.flat(),
            quantizedMeans[0].length,
            quantizedMeans.length
        );
    }

    get imageData() {
        // flatten into a Uint8ClampedArray
        let flatPixels = [...this.getFlattened()];
        let flatValues = flatPixels.map((p) => [p.r, p.g, p.b, p.a]).flat();
        let data = new Uint8ClampedArray(flatValues);

        return new ImageData(data, this.width, this.height);
    }
}

document.addEventListener("DOMContentLoaded", function (event) {
    const dropper = document.getElementById("dropper");
    const selector = document.getElementById("imageSelector");
    const fileName = document.getElementById("fileName");
    const source = document.getElementById("imageSource");
    const preview = document.getElementById("imagePreview");
    const canvas = document.getElementById("imageCanvas");
    const previewCanvas = document.getElementById("previewCanvas");
    const numColors = document.getElementById("numColors");
    const submit = document.getElementById("submitButton");

    let context = canvas.getContext("2d");
    let previewContext = previewCanvas.getContext("2d");

    let imageLoaded = false;

    source.onload = function () {
        imageLoaded = true;
    };

    function activateDropper(ev) {
        dropper.classList.add("is-warning");

        ev.preventDefault();
    }

    function deactivateDropper() {
        dropper.classList.remove("is-warning");
    }

    function dropHandler(ev) {
        ev.preventDefault();

        selector.files = ev.dataTransfer.files;

        updateSource();

        deactivateDropper();
    }

    dropper.addEventListener("drop", dropHandler);

    dropper.addEventListener("dragover", activateDropper);
    dropper.addEventListener("dragleave", deactivateDropper);

    selector.addEventListener("change", updateSource);
    submit.addEventListener("click", processImage);

    numColors.addEventListener("wheel", scrollNumColors);

    function scrollNumColors(ev) {
        if (ev.deltaY < 0) {
            numColors.value = Math.min(100, parseInt(numColors.value) + 1);
        } else {
            numColors.value = Math.max(2, parseInt(numColors.value) - 1);
        }
    }

    function updateSource() {
        // get uploaded file
        const files = selector.files;
        if (files.length === 0) {
            preview.classList.add("hidden");
            submit.disabled = true;
        } else {
            preview.classList.remove("hidden");
            imageLoaded = false;
            source.src = URL.createObjectURL(files[0]);
            preview.src = URL.createObjectURL(files[0]);
            fileName.innerText = files[0].name;
            submit.disabled = false;
        }
    }

    function processImage() {
        console.log("Processing image");
        // while (!imageLoaded) {} //wait for image to load

        let imgWidth = source.width;
        let imgHeight = source.height;

        canvas.width = imgWidth;
        canvas.height = imgHeight;

        context.drawImage(source, 0, 0);

        let imgData = context.getImageData(0, 0, imgWidth, imgHeight);
        console.log(imgData);
        let flatData = imgData.data;
        flatPixels = [];
        for (let i = 0; i < flatData.length; i += 4) {
            flatPixels.push(new Pixel(...flatData.slice(i, i + 4)));
        }

        pixels = new PixelArray2D(flatPixels, imgWidth, imgHeight);

        // quantize
        let quantized = pixels.quantize(100, 100, numColors.value).imageData;

        // show in canvas
        previewContext.clearRect(
            0,
            0,
            previewCanvas.width,
            previewCanvas.height
        );
        previewContext.putImageData(quantized, 0, 0);
        previewCanvas.classList.remove("hidden");
    }
});

// TODO: hide preview image and submit button until an image is selected
// TODO: validate image on select
// TODO: maybe handle multiple images
