import { Pixel } from "./pixels.js";
class PixelArt {
    constructor(ctx, pixelSize) {
        this.ctx = ctx;
        this.pixelSize = pixelSize;
    }
    setPixel(p, x, y) {
        this.ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a})`;
        this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
    }
    setPixels1(pixels) {
        for (const [y, row] of pixels.rows.entries()) {
            for (const [x, p] of row.pixels.entries()) {
                this.setPixel(p, x, y);
            }
        }
    }
    setPixels(pixels) {
        let h = pixels.height;
        let w = pixels.width;
        for (const y of [...Array(h).keys()]) {
            for (const x of [...Array(w).keys()]) {
                let base = y * w * 4 + x * 4;
                let p = new Pixel(pixels.data[base], pixels.data[base + 1], pixels.data[base + 2], pixels.data[base + 3]);
                this.setPixel(p, x, y);
            }
        }
    }
}
export { PixelArt };
//# sourceMappingURL=pixelart.js.map