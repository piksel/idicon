/*
idicon.js
https://github.com/piksel/idicon
based on identicon v0.2 by Don Park (https://github.com/donpark/identicon)
*/

import {Patch, patchTypes, PatchConfiguration, PatchGroup} from "./patches";

const LayerCount = 5;

export class Idicon {

  private readonly hash: Promise<Uint32Array>;
  private patchConfigs: PatchConfiguration[] = [];
  private colors: string[] = [];
  private initialized = false;

  constructor(hash: Uint32Array  | string) {
    this.hash = (typeof hash === 'string')
      ? Idicon.hashInputString(hash)
      : Promise.resolve(hash);
  }

  async init() {
    if(this.initialized) return;

    const hash = await this.hash;

    let colorstring = '';
    for (let i = 0; i < hash.length; i++) {
      if(i < LayerCount) {
        this.patchConfigs[i] = new PatchConfiguration(hash[i])
      } else {
        colorstring += hash[i].toString(16).padStart(8, '0');
      }
    }

    for (let i = 0; i < 4; i++) {
      this.colors[i] = colorstring.substr(i * 6, 6);
    }

    this.initialized = true;
  }

  private static async hashInputString(input: string): Promise<Uint32Array> {
    const bytes =  new TextEncoder().encode(input);
    const hab = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint32Array(hab)
  }

  public getHashString = async () =>
    Array.from(await this.hash)
      .map(n =>
        n.toString(16)
          .padStart(2, '0'))
      .join(' ');

  public getColors = async () =>
      this.init().then(() => this.colors);

  public getPatchConfigs = async () =>
      this.init().then(() =>
          this.patchConfigs.map(pc => pc.toString()));

  public getDebugInfo = async (): Promise<{ hash: string, colors: string[], configs: string[] }> => ({
    hash: await this.getHashString(),
    colors: await this.getColors(),
    configs: await this.getPatchConfigs(),
  });


  render_patch = (patch: Patch, ctx: CanvasRenderingContext2D, size: number, opts: PatchConfiguration) => {

    const patchGroup: PatchGroup =
      (patch & Patch.Corner) ? opts.corner :
        (patch & Patch.Side) ? opts.side :
          opts.middle;

    let {type, invert, curve} = patchGroup;

    const x = size * ((patch & Patch.Right) ? 2 : (patch & Patch.Center) ? 1 : 0);
    const y = size * ((patch & Patch.Bot  ) ? 2 : (patch & Patch.Mid   ) ? 1 : 0);

    const foreColor = '#000000';
    const backColor = '#ffffff';

    type %= patchTypes.length;
    const turn = patchGroup.getTurn(patch);
    if (type == 15)
      invert = !invert;
    if (type == 6) // triforce
      type = 0xb;
    //curve = false;

    const vertices = patchTypes[type];
    const offset = size / 2;
    const off_scale = size / 4;

    ctx.save();

    // paint background
    ctx.fillStyle = invert ? foreColor : backColor;
    ctx.fillRect(x, y, size, size);

    // build patch path
    ctx.translate(x + offset, y + offset);
    ctx.rotate(turn * Math.PI / 2);
    ctx.beginPath();
    let cX = vertices[0] % 5 * off_scale - offset;
    let cY = Math.floor(vertices[0] / 5) * off_scale - offset;
    ctx.moveTo(cX, cY);
    for (let i = 1; i <= vertices.length; i++) {
      const vi = i % vertices.length;
      const x = vertices[vi] % 5 * off_scale - offset;
      const y = Math.floor(vertices[vi] / 5) * off_scale - offset;
      if (curve) {
        ctx.bezierCurveTo(0, 0, cX, cY, x, y);
      } else {
        ctx.lineTo(x, y);
      }
      cX = x;
      cY = y;
    }

    ctx.closePath();

    // offset and rotate coordinate space by patch position (x, y) and
    // 'turn' before rendering patch shape

    // render rotated patch using fore color (back color if inverted)
    ctx.fillStyle = invert ? backColor : foreColor;
    ctx.fill();

    // restore rotation
    ctx.restore();
  }

  static get_colors = (hash: Uint32Array) => {

  };

  render_layer = (node: HTMLCanvasElement, config: PatchConfiguration, size: number, patches: Patch) => {
    if (!node || !config || !size) return;

    const patchSize = size / 3;

    const ctx = node.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    for(let i=0; i < 9; i++) {
      const patch = 1 << i;
      if(patches & patch) {
        this.render_patch(patch, ctx, patchSize, config);
      }
    }
  };

  render = async (canvas: HTMLCanvasElement, size: number | null = null, patches: Patch = Patch.All) => {

    const {width, height} = canvas;
    const layer_size: number = size || Math.min(width, height);

    await this.init();

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0, width, height);

    await this.render_gradients(canvas, size);

    let xPad = (width >= height) ? (width - height) / 2 : 0;
    let yPad = (width <= height) ? (height - width) / 2 : 0;

    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = .2;

    const node = document.createElement('canvas');
    node.width = layer_size;
    node.height = layer_size;

    for (let i = 0; i < LayerCount; i++) {
      const conf = this.patchConfigs[i];
      this.render_layer(node, conf, layer_size, patches);
      ctx.globalAlpha = .1 + ((0.2 / 31) * conf.extra.green);
      ctx.globalCompositeOperation = (['overlay', 'multiply', 'darker', 'lighter'])[(conf.extra.red & 3)];
      ctx.drawImage(node, xPad, yPad);
    }

    ctx.globalAlpha = 1;
  };

/*
  render_gradients_dithered = async (canvas: HTMLCanvasElement, size: number, colors: string[]) => {

    const {width, height} = canvas;
    const destCtx = canvas.getContext("2d");
    const bRect: Rect = { X: 0, Y: 0, W: width, H: height};

    destCtx.clearRect(bRect.X, bRect.Y, bRect.W, bRect.H);
    destCtx.globalAlpha = 1;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tmpCtx = tempCanvas.getContext('2d');

    const tempCanvas2 = document.createElement('canvas');
    tempCanvas2.width = width;
    tempCanvas2.height = height;
    const tmpCtx2 = tempCanvas2.getContext('2d');

    const gradSize = Math.max(width, height);
    let colorIndex = 0;
    //const hx = (c, s) => parseInt(c.substr(s * 2, 2), 16);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
//            destCtx.globalAlpha = 1 / (1+ ((y*2)+x));
        console.log(destCtx.globalAlpha);
        tmpCtx.clearRect(bRect.X, bRect.Y, bRect.W, bRect.H);
//			const gradient = destCtx.createRadialGradient(
        const gradient = new DitheredRadialGradient(
          //size * (1 - x),
          //size * (1 - y),
          x * width,
          y * height,
          0 * size,
          //x * size,
          //y * size,
          width * (1 - x),
          height * (1 - y),
          gradSize);
        const color = colors[colorIndex++];
        tmpCtx2.fillStyle = '#' + color;
        tmpCtx2.fillRect(bRect.X, bRect.Y, bRect.W, bRect.H);
        console.log('%cCOLOR #' + colorIndex, `color: #${color}`); //color, hx(color,0), hx(color,1), hx(color,2));
        //gradient.addColorStop(0, `#${color}ff`);
        //gradient.addColorStop(0, hx(color,0), hx(color,1), hx(color,2));
        //gradient.addColorStop(0, 255, 255, 255);
        gradient.addColorStop(0, 0, 0, 0);
        gradient.addColorStop(0.5, 255, 255, 255);
        //destCtx.globalCompositeOperation = 'lighter';
//			destCtx.globalCompositeOperation = 'source-over';
        //destCtx.globalCompositeOperation = 'overlay';
        //destCtx.globalCompositeOperation = 'multiply';
        destCtx.globalCompositeOperation = 'hard-light';
        //destCtx.globalCompositeOperation = 'color-dodge';
        //destCtx.globalCompositeOperation = 'soft-light';
        //destCtx.globalCompositeOperation = 'exclusion';

        //gradient.addColorStop(1, `#${color}00`);
        //gradient.addColorStop(1, 0, 0, 0);//`#${color}00`);
        gradient.addColorStop(1, 255, 255, 255);//`#${color}00`);
        //destCtx.fillStyle = gradient;
        //destCtx.fillRect(0, 0, size, size);
        gradient.fillRect(tmpCtx, bRect);
        tmpCtx.globalCompositeOperation = 'source-atop';
        tmpCtx.drawImage(tempCanvas2, 0, 0);


        destCtx.drawImage(tempCanvas, 0, 0);
        //return;
      }
    }
    destCtx.globalCompositeOperation = 'multiply';

    destCtx.globalAlpha = 1;

  }
 */

  render_gradients = (canvas: HTMLCanvasElement, size: number) => {

    const {width, height} = canvas;
    const destCtx = canvas.getContext("2d");

    destCtx.clearRect(0, 0, width, height);
    destCtx.globalAlpha = 1;

    const gradSize = Math.max(width, height);
    let colorIndex = 0;

    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {

        const color = this.colors[colorIndex++];
			  const gradient = destCtx.createRadialGradient(
          x * width,y * height, gradSize,
          width * (1 - x),height * (1 - y),0);

        gradient.addColorStop(0, `#${color}ff`);
        gradient.addColorStop(1, `#${color}00`);
        destCtx.fillStyle = gradient;
        destCtx.globalCompositeOperation = 'overlay';
        destCtx.fillRect(0, 0, width, height);
      }
    }
    // destCtx.globalCompositeOperation = 'multiply';

    destCtx.globalAlpha = 1;

  };
}