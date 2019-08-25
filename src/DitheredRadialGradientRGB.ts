/*
Dan Gries
rectangleworld.com
Nov 19 2012

Uses Floyd-Steinberg dither algorithm.
*/

import {Rect} from "./rect";

interface IColor {
    r: number;
    g: number;
    b: number;
}

interface IColorStop extends IColor {
    ratio: number;
}

export class DitheredRadialGradient {

    private colorStops: IColorStop[] = [];

    constructor(
        private x0: number,
        private y0: number,
        private x1: number,
        private y1: number,
        private rad0: number,
        private rad1: number,
    ){
    }

    addColorStop(ratio: number, r: number, g: number, b: number) {
        if ((ratio < 0) || (ratio > 1)) {
            return;
        }
        let n;
        const newStop: IColorStop = {ratio:ratio, r:r, g:g, b:b};
        if ((ratio >= 0) && (ratio <= 1)) {
            if (this.colorStops.length == 0) {
                this.colorStops.push(newStop);
            }
            else {
                let i = 0;
                let found = false;
                const len = this.colorStops.length;
                //search for proper place to put stop in order.
                while ((!found) && (i<len)) {
                    found = (ratio <= this.colorStops[i].ratio);
                    if (!found) {
                        i++;
                    }
                }
                //add stop - remove next one if duplicate ratio
                if (!found) {
                    //place at end
                    this.colorStops.push(newStop);
                }
                else {
                    if (ratio == this.colorStops[i].ratio) {
                        //replace
                        this.colorStops.splice(i, 1, newStop);
                    }
                    else {
                        this.colorStops.splice(i, 0, newStop);
                    }
                }
            }
        }
    }

    fillRect(ctx: CanvasRenderingContext2D, rect: Rect) {

        if (this.colorStops.length == 0) {
            return;
        }

        const image = ctx.getImageData(rect.X, rect.Y, rect.W, rect.H);
        const pixelData = image.data;
        const len = pixelData.length;

        const vx = this.x1 - this.x0;
        const vy = this.y1 - this.y0;
        const vMagSquareRecip = 1/(vx*vx+vy*vy);

        let color: IColor;

        let stopNumber;
        let found;

        const rBuffer = [];
        const gBuffer = [];
        const bBuffer = [];
        const aBuffer = [];

        const xDiff = this.x1 - this.x0;
        const yDiff = this.y1 - this.y0;
        const rDiff = this.rad1 - this.rad0;
        const a = rDiff*rDiff - xDiff*xDiff - yDiff*yDiff;
        const rConst1 = 2*this.rad0*(this.rad1-this.rad0);
        const r0Square = this.rad0*this.rad0;

        //first complete color stops with 0 and 1 ratios if not already present
        if (this.colorStops[0].ratio != 0) {
            this.colorStops.splice(0,0,{
                ...this.colorStops[0],
                ratio:0,
            });
        }
        if (this.colorStops[this.colorStops.length-1].ratio != 1) {
            this.colorStops.push({
                ...this.colorStops[this.colorStops.length-1],
                ratio:1,
            });
        }

        let cs0: IColorStop;

        //create float valued gradient
        for (let i = 0; i<len/4; i++) {

            const x = rect.X + (i % rect.W);
            const y = rect.Y + Math.floor(i/rect.W);

            const dx = x - this.x0;
            const dy = y - this.y0;
            const b = rConst1 + 2*(dx*xDiff + dy*yDiff);
            const c = r0Square - dx*dx - dy*dy;
            const discrim = b*b-4*a*c;

            if (discrim >= 0) {
                let ratio = (-b + Math.sqrt(discrim))/(2*a);

                if (ratio < 0) {
                    ratio = 0;
                }
                else if (ratio > 1) {
                    ratio = 1;
                }

                //find out what two stops this is between
                let stopNumber = 0;
                if (ratio == 1) {
                    stopNumber = this.colorStops.length-1;
                }
                else {
                    found = false;
                    while (!found) {
                        found = (ratio < this.colorStops[stopNumber].ratio);
                        if (!found) {
                            stopNumber++;
                        }
                    }
                }

                //calculate color.
                cs0 = this.colorStops[stopNumber-1];
                const cs1 = this.colorStops[stopNumber];

                const f = (ratio-cs0.ratio)/(cs1.ratio-cs0.ratio);
                color = {
                    r: cs0.r +(cs1.r - cs0.r) * f,
                    g: cs0.g +(cs1.g - cs0.g) * f,
                    b: cs0.b +(cs1.b - cs0.b) * f,
                };
            }

            else {
                color = {...cs0};
            }

            //set color as float values in buffer arrays
            rBuffer.push(color.r);
            gBuffer.push(color.g);
            bBuffer.push(color.b);
        }

        //While converting floats to integer valued color values, apply Floyd-Steinberg dither.
        for (let i = 0; i<len/4; i++) {
            let nearestValue = ~~(rBuffer[i]);
            let quantError =rBuffer[i] - nearestValue;
            rBuffer[i+1] += 7/16*quantError;
            rBuffer[i-1+rect.W] += 3/16*quantError;
            rBuffer[i + rect.W] += 5/16*quantError;
            rBuffer[i+1 + rect.W] += 1/16*quantError;

            nearestValue = ~~(gBuffer[i]);
            quantError =gBuffer[i] - nearestValue;
            gBuffer[i+1] += 7/16*quantError;
            gBuffer[i-1+rect.W] += 3/16*quantError;
            gBuffer[i + rect.W] += 5/16*quantError;
            gBuffer[i+1 + rect.W] += 1/16*quantError;

            nearestValue = ~~(bBuffer[i]);
            quantError =bBuffer[i] - nearestValue;
            bBuffer[i+1] += 7/16*quantError;
            bBuffer[i-1+rect.W] += 3/16*quantError;
            bBuffer[i + rect.W] += 5/16*quantError;
            bBuffer[i+1 + rect.W] += 1/16*quantError;
        }

        //copy to pixel data
        for (let i=0; i<len; i += 4) {
            const q = i/4;
            pixelData[i] = 0;
            pixelData[i+1] = 0;//~~gBuffer[q];
            pixelData[i+2] = 0;//~~bBuffer[q];
            pixelData[i+3] = ~~rBuffer[q];
        }

        ctx.putImageData(image,rect.X,rect.Y);
    }
}
