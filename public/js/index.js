var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
document.addEventListener("DOMContentLoaded", function () {
    const dropper = document.getElementById("dropper");
    const selector = document.getElementById("imageSelector");
    const fileName = document.getElementById("fileName");
    const source = document.getElementById("imageSource");
    const preview = document.getElementById("imagePreview");
    const canvas = document.getElementById("imageCanvas");
    const previewCanvas = document.getElementById("previewCanvas");
    const numColors = document.getElementById("numColors");
    const submit = document.getElementById("submitButton");
    const progress = document.getElementById("processingProgress");
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
    numColors.addEventListener("wheel", scrollNumColors);
    function scrollNumColors(ev) {
        if (ev.deltaY < 0) {
            numColors.value = Math.min(100, parseInt(numColors.value) + 1).toString();
        }
        else {
            numColors.value = Math.max(2, parseInt(numColors.value) - 1).toString();
        }
    }
    function updateSource() {
        const files = selector.files || [];
        if (files.length === 0 || !validFileType(files[0])) {
            preview.classList.add("hidden");
            submit.disabled = true;
        }
        else {
            preview.classList.remove("hidden");
            source.src = URL.createObjectURL(files[0]);
            preview.src = URL.createObjectURL(files[0]);
            fileName.innerText = files[0].name;
            submit.disabled = false;
        }
    }
    function processImage() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Processing image");
            progress.classList.remove("hidden");
            let imgWidth = source.width;
            let imgHeight = source.height;
            canvas.width = imgWidth;
            canvas.height = imgHeight;
            context.drawImage(source, 0, 0);
            let imgData = context.getImageData(0, 0, imgWidth, imgHeight);
            const myWorker = new Worker("js/worker.js", { type: "module" });
            myWorker.onmessage = (e) => {
                previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                previewContext.putImageData(e.data, 0, 0);
                progress.classList.add("hidden");
                submit.disabled = false;
            };
            submit.disabled = true;
            myWorker.postMessage([
                imgData.data,
                imgWidth,
                imgHeight,
                parseInt(numColors.value),
            ]);
        });
    }
});
//# sourceMappingURL=index.js.map