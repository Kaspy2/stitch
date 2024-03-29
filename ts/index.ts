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

function validFileType(file: File) {
    return fileTypes.includes(file.type);
}

function show(el: HTMLElement) {
    el.classList.remove("hidden");
}

function hide(el: HTMLElement) {
    el.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", function () {
    const dropper = document.getElementById("dropper") as HTMLDivElement;
    const selector = document.getElementById(
        "imageSelector"
    ) as HTMLInputElement;
    const fileName = document.getElementById("fileName") as HTMLSpanElement;
    const source = document.getElementById("imageSource") as HTMLImageElement;
    const preview = document.getElementById("imagePreview") as HTMLImageElement;
    const canvas = document.getElementById("imageCanvas") as HTMLCanvasElement;
    const previewCanvas = document.getElementById(
        "previewCanvas"
    ) as HTMLCanvasElement;
    const outputImagePreview = document.getElementById(
        "outputImagePreview"
    ) as HTMLImageElement;
    const numColors = document.getElementById("numColors") as HTMLInputElement;
    const outWidth = document.getElementById("outWidth") as HTMLInputElement;
    const outHeight = document.getElementById("outHeight") as HTMLInputElement;
    const submit = document.getElementById("submitButton") as HTMLButtonElement;
    const progress = document.getElementById(
        "processingProgress"
    ) as HTMLProgressElement;

    const procParams = document.getElementById(
        "procParams"
    ) as HTMLFieldSetElement;

    let context = canvas.getContext("2d") as CanvasRenderingContext2D;
    let previewContext = previewCanvas.getContext(
        "2d"
    ) as CanvasRenderingContext2D;

    function activateDropper(ev: Event) {
        dropper.classList.add("is-warning");

        ev.preventDefault();
    }

    function deactivateDropper() {
        dropper.classList.remove("is-warning");
    }

    function dropHandler(ev: DragEvent) {
        ev.preventDefault();

        selector.files = ev.dataTransfer?.files || new FileList();

        updateSource();

        deactivateDropper();
    }

    dropper.addEventListener("drop", dropHandler);

    dropper.addEventListener("dragover", activateDropper);
    dropper.addEventListener("dragleave", deactivateDropper);

    selector.addEventListener("change", updateSource);
    submit.addEventListener("click", processImage);

    // numColors.addEventListener("wheel", scrollNumColors);
    numColors.addEventListener("wheel", scrollInput(numColors, 2, 100, 1));
    outWidth.addEventListener("wheel", scrollInput(outWidth, 10, 500, 20));
    outHeight.addEventListener("wheel", scrollInput(outHeight, 10, 500, 20));

    function scrollInput(
        el: HTMLInputElement,
        min: number,
        max: number,
        step: number
    ) {
        return (ev: WheelEvent) => {
            ev.preventDefault();
            if (ev.deltaY < 0) {
                el.value = Math.min(max, parseInt(el.value) + step).toString();
            } else {
                el.value = Math.max(min, parseInt(el.value) - step).toString();
            }
        };
    }

    function updateSource() {
        // get uploaded file
        const files = selector.files || [];
        if (files.length === 0 || !validFileType(files[0])) {
            hide(preview);
            hide(outputImagePreview);
            submit.disabled = true;
            procParams.disabled = true;
        } else {
            show(preview);
            source.src = URL.createObjectURL(files[0]);
            preview.src = URL.createObjectURL(files[0]);
            fileName.innerText = files[0].name;
            submit.disabled = false;
            procParams.disabled = false;
        }
    }

    async function processImage() {
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
            // show in canvas
            previewContext.clearRect(
                0,
                0,
                previewCanvas.width,
                previewCanvas.height
            );
            // previewContext.putImageData(e.data as ImageData, 0, 0);

            let pixelArt = new PixelArt(previewContext, avgScale);
            pixelArt.setPixels(e.data as ImageData);

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
    }
});

// TODO: add aspect ratio button functionality
// TODO: maybe handle multiple images
// TODO: update groupPixels to use makeDivisible (makeDivisible should insert data not remove)
