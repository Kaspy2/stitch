import { Pixel, PixelArray2D } from "./pixels.js";
onmessage = (e) => {
    let flatData = e.data[0];
    let imgWidth = e.data[1];
    let imgHeight = e.data[2];
    let numColors = e.data[3];
    let outWidth = e.data[4];
    let outHeight = e.data[5];
    let flatPixels = [...Array(Math.ceil(flatData.length / 4)).keys()].map((x) => new Pixel(flatData[x * 4], flatData[x * 4 + 1], flatData[x * 4 + 2], flatData[x * 4 + 3]));
    let pixels = new PixelArray2D(flatPixels, imgWidth, imgHeight);
    let quantized = pixels.quantize(outWidth, outHeight, numColors).imageData;
    postMessage(quantized);
};
//# sourceMappingURL=worker.js.map