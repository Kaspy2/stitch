import { Pixel, PixelArray2D } from "./pixels.js";

onmessage = (e) => {
    let flatData = e.data[0] as Uint8ClampedArray;
    let imgWidth = e.data[1] as number;
    let imgHeight = e.data[2] as number;
    let numColors = e.data[3] as number;
    let outWidth = e.data[4] as number;
    let outHeight = e.data[5] as number;

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
    let quantized = pixels.quantize(outWidth, outHeight, numColors).imageData;
    // Uncaught Error: Image dimensions do not match! -> when using anything not jpg
    // at new PixelArray2D (pixels.ts:72:19)
    // at PixelArray2D.groupPixels (pixels.ts:190:33)
    // at PixelArray2D.quantize (pixels.ts:201:27)
    // at onmessage (worker.ts:23:28)

    postMessage(quantized);
};
