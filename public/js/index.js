var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PixelArt } from "./pixelart.js";
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
const defaultRes = 1080;
function validFileType(file) {
    return fileTypes.includes(file.type);
}
function show(el) {
    el.classList.remove("hidden");
}
function hide(el) {
    el.classList.add("hidden");
}
document.addEventListener("DOMContentLoaded", function () {
    const dropper = document.getElementById("dropper");
    const selector = document.getElementById("imageSelector");
    const fileName = document.getElementById("fileName");
    const source = document.getElementById("imageSource");
    const preview = document.getElementById("imagePreview");
    const canvas = document.getElementById("imageCanvas");
    const previewCanvas = document.getElementById("previewCanvas");
    const outputImagePreview = document.getElementById("outputImagePreview");
    const numColors = document.getElementById("numColors");
    const outWidth = document.getElementById("outWidth");
    const outHeight = document.getElementById("outHeight");
    const submit = document.getElementById("submitButton");
    const progress = document.getElementById("processingProgress");
    const procParams = document.getElementById("procParams");
    let context = canvas.getContext("2d");
    let previewContext = previewCanvas.getContext("2d");
    function activateDropper(ev) {
        dropper.classList.add("is-warning");
        ev.preventDefault();
    }
    function deactivateDropper() {
        dropper.classList.remove("is-warning");
    }
    function dropHandler(ev) {
        var _a;
        ev.preventDefault();
        selector.files = ((_a = ev.dataTransfer) === null || _a === void 0 ? void 0 : _a.files) || new FileList();
        updateSource();
        deactivateDropper();
    }
    dropper.addEventListener("drop", dropHandler);
    dropper.addEventListener("dragover", activateDropper);
    dropper.addEventListener("dragleave", deactivateDropper);
    selector.addEventListener("change", updateSource);
    submit.addEventListener("click", processImage);
    numColors.addEventListener("wheel", scrollInput(numColors, 2, 100, 1));
    outWidth.addEventListener("wheel", scrollInput(outWidth, 10, 500, 20));
    outHeight.addEventListener("wheel", scrollInput(outHeight, 10, 500, 20));
    function scrollInput(el, min, max, step) {
        return (ev) => {
            ev.preventDefault();
            if (ev.deltaY < 0) {
                el.value = Math.min(max, parseInt(el.value) + step).toString();
            }
            else {
                el.value = Math.max(min, parseInt(el.value) - step).toString();
            }
        };
    }
    function updateSource() {
        const files = selector.files || [];
        if (files.length === 0 || !validFileType(files[0])) {
            hide(preview);
            hide(outputImagePreview);
            submit.disabled = true;
            procParams.disabled = true;
        }
        else {
            show(preview);
            source.src = URL.createObjectURL(files[0]);
            preview.src = URL.createObjectURL(files[0]);
            fileName.innerText = files[0].name;
            submit.disabled = false;
            procParams.disabled = false;
        }
    }
    function processImage() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Processing image");
            show(progress);
            hide(outputImagePreview);
            let imgWidth = source.width;
            let imgHeight = source.height;
            let outputWidth = parseInt(outWidth.value);
            let outputHeight = parseInt(outHeight.value);
            canvas.width = imgWidth;
            canvas.height = imgHeight;
            let scaleX = defaultRes / outputWidth;
            let scaleY = defaultRes / outputHeight;
            let avgScale = Math.ceil((scaleX + scaleY) / 2);
            previewCanvas.width = avgScale * outputWidth;
            previewCanvas.height = avgScale * outputHeight;
            outputImagePreview.width = imgWidth;
            outputImagePreview.height = imgHeight;
            context.drawImage(source, 0, 0);
            let imgData = context.getImageData(0, 0, imgWidth, imgHeight);
            const myWorker = new Worker("js/worker.js", { type: "module" });
            myWorker.onmessage = (e) => {
                previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                let pixelArt = new PixelArt(previewContext, avgScale);
                pixelArt.setPixels(e.data);
                const img = previewCanvas.toDataURL("image/png");
                outputImagePreview.src = img;
                show(outputImagePreview);
                hide(progress);
                submit.disabled = false;
            };
            submit.disabled = true;
            myWorker.postMessage([
                imgData.data,
                imgWidth,
                imgHeight,
                parseInt(numColors.value),
                outputWidth,
                outputHeight,
            ]);
        });
    }
});
//# sourceMappingURL=index.js.map