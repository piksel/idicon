import {Idicon} from "./src/idicon";

export * from './src/idicon';
export * from './src/patches';

export function renderAll() {
    const canvases = document.querySelectorAll("canvas[data-idicon]");
    canvases.forEach((canvas: HTMLCanvasElement) => {
        const input = canvas.dataset.idicon;
        const idicon = new Idicon(input);
        const size = Math.min(canvas.height, canvas.width);
        idicon.render(canvas, size).then(_ => {
            if (canvas.style.display == 'none') {
                canvas.style.display = "inline-block";
            }
        });
    });
}