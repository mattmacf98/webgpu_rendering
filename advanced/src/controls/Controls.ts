import { Arcball } from "./ArcBall";
enum DragType {
    NONE,
    YAW_PITCH,
    ROLL
}

export class Controls {
    private _canvas: HTMLCanvasElement;
    private _prevX: number;
    private _prevY: number;
    private _draggingType: DragType;
    private _arcball: Arcball;
    private _render: () => void;

    constructor(canvas: HTMLCanvasElement, arcBall: Arcball, render: any) {
        this._arcball = arcBall;
        this._canvas = canvas;
        this._prevX = 0;
        this._prevY = 0;
        this._draggingType = DragType.NONE;

        this._render = render;

        this._canvas.onmousedown = (event: MouseEvent) => {
            const rect = this._canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;
            let radius = width;

            if (height < radius) {
                radius = height;
            }

            radius *= 0.5;
            const originX = width * 0.5;
            const originY = height * 0.5;

            this._prevX = (x - originX) / radius;
            this._prevY = (originY - y) / radius;
            if ((this._prevX * this._prevX + this._prevY * this._prevY) <= 0.64) {
                this._draggingType = DragType.YAW_PITCH;
            } else {
                this._draggingType = DragType.ROLL;
            }
        }

        this._canvas.onmousemove = (event: MouseEvent) => {
            const rect = this._canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;
            let radius = width;

            if (height < radius) {
                radius = height;
            }

            radius *= 0.5;
            const originX = width * 0.5;
            const originY = height * 0.5;

            const currentX = (x - originX) / radius;
            const currentY = (originY - y) / radius;

            if (this._draggingType == DragType.YAW_PITCH) {
                this._arcball.yawPith(this._prevX, this._prevY, currentX, currentY);
            } else if (this._draggingType == DragType.ROLL) {
                this._arcball.roll(this._prevX, this._prevY, currentX, currentY);
            }

            this._prevX = currentX;
            this._prevY = currentY;
            
            requestAnimationFrame(this._render);
        }

        canvas.onmouseup = (event: MouseEvent) => {
            this._draggingType = DragType.NONE;
        }
    }
}