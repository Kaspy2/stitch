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

function validFileType(file: File) {
    return fileTypes.includes(file.type);
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
    const numColors = document.getElementById("numColors") as HTMLInputElement;
    const submit = document.getElementById("submitButton") as HTMLButtonElement;
    const progress = document.getElementById(
        "processingProgress"
    ) as HTMLProgressElement;

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

    numColors.addEventListener("wheel", scrollNumColors);

    function scrollNumColors(ev: WheelEvent) {
        if (ev.deltaY < 0) {
            numColors.value = Math.min(
                100,
                parseInt(numColors.value) + 1
            ).toString();
        } else {
            numColors.value = Math.max(
                2,
                parseInt(numColors.value) - 1
            ).toString();
        }
    }

    function updateSource() {
        // get uploaded file
        const files = selector.files || [];
        if (files.length === 0 || !validFileType(files[0])) {
            preview.classList.add("hidden");
            submit.disabled = true;
        } else {
            preview.classList.remove("hidden");
            source.src = URL.createObjectURL(files[0]);
            preview.src = URL.createObjectURL(files[0]);
            fileName.innerText = files[0].name;
            submit.disabled = false;
        }
    }

    async function processImage() {
        console.log("Processing image");
        progress.classList.remove("hidden");

        let imgWidth = source.width;
        let imgHeight = source.height;

        canvas.width = imgWidth;
        canvas.height = imgHeight;

        context.drawImage(source, 0, 0);

        let imgData = context.getImageData(0, 0, imgWidth, imgHeight);
        // console.log(imgData);
        // let flatData = Array.from(imgData.data);
        // console.log(flatData);

        // console.log("flattening");

        // let flatPixels = new Array<Pixel>();

        // [...Array(Math.ceil(flatData.length / 4)).keys()]
        //     .map((x) => flatData.slice(x * 4, (x + 1) * 4))
        //     .forEach((v) => {
        //         flatPixels.push(new Pixel(...(v as RGBA)));
        //     });

        const myWorker = new Worker("js/worker.js", { type: "module" });

        myWorker.onmessage = (e) => {
            // show in canvas
            previewContext.clearRect(
                0,
                0,
                previewCanvas.width,
                previewCanvas.height
            );
            previewContext.putImageData(e.data as ImageData, 0, 0);
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
    }
});

// TODO: hide preview image and submit button until an image is selected
// TODO: validate image on select
// TODO: maybe handle multiple images
