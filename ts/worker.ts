import { kmeans } from "./kmeans.js";

type RGBA = [number, number, number, number];

class Pixel {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number, g: number, b: number, a: number = 255) {
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

    static fromUint8ClampedArray(arr: Uint8ClampedArray) {
        return new Pixel(...(arr as unknown as RGBA));
    }
}

class PixelArray {
    pixels: Pixel[];

    constructor(...pixels: Pixel[]) {
        this.pixels = pixels;
    }

    addPixel(pixel: Pixel) {
        this.pixels.push(pixel);
    }

    *getPixels() {
        for (const pixel of this.pixels) {
            yield pixel;
        }
    }

    *getPixelsGrouped(dx: number) {
        for (let i = 0; i < this.pixels.length; i += dx) {
            yield this.pixels.slice(i, i + dx);
        }
    }

    get length() {
        return this.pixels.length;
    }

    slice(start: number, end: number) {
        return new PixelArray(...this.pixels.slice(start, end));
    }

    splice(start: number, deleteCount?: number) {
        return this.pixels.splice(start, deleteCount);
    }
}

class PixelArray2D {
    rows: PixelArray[];

    constructor(pixels: Pixel[], width: number, height: number) {
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

    // makeDivisible({ x = 0, y = 0, crop = true } = {}) {
    //     let copy = this.clone();

    //     if (x != 0) {
    //         let rowLength = copy.width;
    //         let excessX = rowLength % x;
    //         if (crop) {
    //             copy.rows = copy.rows.map((row) =>
    //                 row.slice(0, rowLength - excessX)
    //             );
    //         }
    //     }

    //     if (y != 0) {
    //         let columnLength = copy.height;
    //         let excessY = columnLength % y;
    //         if (crop) {
    //             copy.rows = copy.rows.slice(0, columnLength - excessY);
    //         }
    //     }

    //     return copy;
    // }

    makeDivisible({ x = 0, y = 0, crop = true } = {}) {
        if (x != 0) {
            let rowLength = this.width;
            let excessX = rowLength % x;
            if (crop) {
                for (const row of this.rows) {
                    row.splice(rowLength - excessX);
                }
            }
        }

        if (y != 0) {
            let columnLength = this.height;
            let excessY = columnLength % y;
            if (crop) {
                this.rows.splice(columnLength - excessY);
            }
        }
    }

    groupPixels(dx: number, dy: number) {
        this.makeDivisible({ x: dx, y: dy });

        let groups = Array<PixelArray2D[]>();
        for (let y = 0; y < this.height; y += dy) {
            let currentRow = Array<PixelArray2D>();
            let rowGroup = this.rows.slice(y, y + dy);
            let groupedRows = rowGroup.map((row) => row.getPixelsGrouped(dx));

            for (let x = 0; x < this.width; x += dx) {
                let currentGroup = Array<Pixel[]>();
                for (const groupedRow of groupedRows) {
                    let gr = groupedRow.next();
                    if (!gr.done) {
                        currentGroup.push(gr.value as Pixel[]);
                    }
                }
                currentRow.push(new PixelArray2D(currentGroup.flat(), dx, dy));
            }
            groups.push(currentRow);
        }

        return groups;
    }

    quantize(width: number, height: number, numColors: number) {
        let dx = Math.floor(this.width / width);
        let dy = Math.floor(this.height / height);
        let groups = this.groupPixels(dx, dy);
        let means = groups.map((row) =>
            row.map((pixelGroup) => pixelGroup.meanPixel)
        );

        let flattennedColors = Array<number[]>();

        for (const row of means) {
            for (const pixel of row) {
                flattennedColors.push([pixel.r, pixel.g, pixel.b, pixel.a]);
            }
        }

        let colorClusters = kmeans(flattennedColors, numColors);
        let colorMap = {};

        for (const cluster of colorClusters.clusters) {
            let centroid = new Pixel(...(cluster.centroid as RGBA));
            for (const point of cluster.points) {
                colorMap[new Pixel(...(point as RGBA)).hash] = centroid;
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

onmessage = (e) => {
    let flatData = e.data[0] as Uint8ClampedArray;
    let imgWidth = e.data[1] as number;
    let imgHeight = e.data[2] as number;
    let numColors = e.data[3] as number;

    let flatPixels = [...Array(Math.ceil(flatData.length / 4)).keys()].map(
        (x) =>
            new Pixel(
                flatData[x * 4],
                flatData[x * 4 + 1],
                flatData[x * 4 + 2],
                flatData[x * 4 + 3]
            )
    );

    let pixels = new PixelArray2D(flatPixels, imgWidth, imgHeight);

    // quantize
    let quantized = pixels.quantize(100, 100, numColors).imageData;

    postMessage(quantized);
};
