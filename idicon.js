/*
idicon.js
based on identicon v0.2 by Don Park (https://github.com/donpark/identicon)
*/

const patchTypes = [
	[ 0, 4, 24, 20 ],
	[ 0, 4, 20 ],
	[ 2, 24, 20 ],
	[ 0, 2,  20, 22 ],
	[ 2, 14, 22, 10 ],
	[ 0, 14, 24, 22 ],
	[ 2, 24, 22, 13, 11, 22, 20 ],
	[ 0, 14, 22 ],
	[ 6, 8, 18, 16 ],
	[ 4, 20, 10, 12, 2 ],
	[ 0, 2, 12, 10 ],
	[ 10, 14, 22 ],
	[ 20, 12, 24 ],
	[ 10, 2, 12 ],
	[ 0, 2, 10 ],
	[ 0, 4, 24, 20 ],
];
const centerPatchTypes = [0, 4, 8, 15];

const PTpLf		= 1 << 0;
const PTop		= 1 << 1;
const PTpRt		= 1 << 2;
const PFTop =  PTpLf | PTop | PTpRt;

const PLeft		= 1 << 3;
const PMiddle	= 1 << 4;
const PRight	= 1 << 5;
const PFMid =  PLeft | PMiddle | PRight;

const PBtLf		= 1 << 6;
const PBot		= 1 << 7;
const PBtRt		= 1 << 8;
const PFBot =  PBtLf | PBot | PBtRt;

const PAll  =  PFTop | PFMid | PFBot;

const backColor = "rgba(255,255,255,1)";

const render_idicon_patch = (ctx, xm, ym, size, pat, turn) => {
	let {type, invert, curve, scale} = pat;
	let x = (xm * size)// - (((xm-1)*scale)*(size / 50));
	let y = (ym * size)// - (((ym-1)*scale)*(size / 50));

	const foreColor = '#000000';
	type %= patchTypes.length;
	turn %= 4;
	if (type == 15)
		invert = !invert;
	if (type == 6) // triforce
		type = 0xb;
		//curve = false;

	var vertices = patchTypes[type];
	var offset = size / 2;
	var off_scale = size / 4;

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
	for (var i = 1; i <= vertices.length; i++) {
		const vi = i % vertices.length;
		const x = vertices[vi] % 5 * off_scale - offset;
		const y = Math.floor(vertices[vi] / 5) * off_scale - offset;
		if(curve) {
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

const get_colors = (hash) => {
	const fU = i => hash[i].toString(16).padStart(8, '0');
	const colstring = fU(5) + fU(6) + fU(7);

	const colors = [];
	for(let i=0; i<4; i++) {
		colors[i] = colstring.substr(i*6, 6);

	}

	return colors;
}

const opts_to_string = (o) => {
	const turns = ['U','R','D','L'];
	const fmtT = p => `${(p.invert?'-':'+')}${p.type.toString(16).toUpperCase()}${turns[p.turn]}`;
	const fmtX = x => x.toString(16).padStart(2, '0');
	const extra = `${fmtX(o.extra.red)}${fmtX(o.extra.green)}${fmtX(o.extra.blue)}`;
	return `M:${fmtT(o.middle)} S:${fmtT(o.side)} C:${fmtT(o.corner)} X:${extra}`;
}

const opts_from_code = (code) => {
	return {
		middle: {
			type: centerPatchTypes[code & 0b11],
			invert: ((code >> 14) & 1) != 0, // Always use side invert bit for now // ((code >> 2) & 1) != 0,
			turn: 0,
			curve: ((code >> 27) & 3) == 3,
			scale: (code >> 25) & 7,
		},
		corner: {
			type: (code >> 3) & 0b1111,
			invert: ((code >> 7) & 1) != 0,
			turn: (code >> 8) & 3,
			curve: ((code >> 21) & 3) == 3,
			scale: (code >> 19) & 7,
		},
		side: {
			type: (code >> 10) & 0b1111,
			invert: ((code >> 14) & 1) != 0,
			turn: (code >> 15) & 3,
			curve: ((code >> 16) & 3) == 3,
			scale: (code >> 14) & 7,
		},
		extra: {
			red: (code >> 27) & 31,
			green: (code >> 21) & 31,
			blue: (code >> 16) & 31,
		}
	}
}

function render_idicon(node, opts, size, patches) {
	if (!node || !opts || !size) return;
	
	const patchSize = size / 3;

	let cornerTurn = opts.corner.turn;
	let sideTurn = opts.side.turn;

	var ctx = node.getContext("2d");
	ctx.clearRect(0, 0, size, size);

	// middle patch
	(patches & PMiddle) && render_idicon_patch(ctx, 1, 1, patchSize, opts.middle, 0, true);
	
	// side patchs, starting from top and moving clock-wise
	(patches & PTop  ) && render_idicon_patch(ctx, 1, 0, patchSize, opts.side, sideTurn++);
	(patches & PRight) && render_idicon_patch(ctx, 2, 1, patchSize, opts.side, sideTurn++);
	(patches & PBot  ) && render_idicon_patch(ctx, 1, 2, patchSize, opts.side, sideTurn++);
	(patches & PLeft ) && render_idicon_patch(ctx, 0, 1, patchSize, opts.side, sideTurn++);
	
	// corner patchs, starting from top left and moving clock-wise
	(patches & PTpLf  ) && render_idicon_patch(ctx, 0, 0, patchSize, opts.corner, cornerTurn++);
	(patches & PTpRt  ) && render_idicon_patch(ctx, 2, 0, patchSize, opts.corner, cornerTurn++);
	(patches & PBtRt  ) && render_idicon_patch(ctx, 2, 2, patchSize, opts.corner, cornerTurn++);
	(patches & PBtLf  ) && render_idicon_patch(ctx, 0, 2, patchSize, opts.corner, cornerTurn++);

}

const render_idicon_stack = (stackCanvas, hash, size, patches, callback) => {
    const canvases = [];
    for(let i=0; i < 5; i++) {
        const opts = opts_from_code(hash[i]);
        const node = document.createElement('canvas');
        node.width = size;
        node.height = size;

        render_idicon(node, opts, size, patches);

        callback && callback(opts, i);
        canvases.push(node);
    }
	const stackCtx = stackCanvas.getContext("2d");

	stackCtx.globalCompositeOperation = 'overlay';
	stackCtx.globalAlpha = .2;
	for(let i=0; i < canvases.length; i++) {
	 	stackCtx.drawImage(canvases[i], 0, 0);
	}
}

const render_idicon_canvases = (prefix) => {
	var canvases = document.getElementsByTagName("canvas");
	var n = canvases.length;
	for (var i = 0; i < n; i++) {
		var node = canvases[i];
		if (node.title && node.title.indexOf(prefix) == 0) {
			destCtx.globalCompositeOperation = 'lighter';
			if (node.style.display == 'none') node.style.display = "inline";
			var code = node.title.substring(prefix.length) * 1;
			var size = node.width;
			render_idicon(node, code, size);
		}
	}
}

const render_idicon_gradients = (canvas, size, colors) => {
	const destCtx = canvas.getContext("2d");
	destCtx.clearRect(0, 0, size, size);
	destCtx.globalAlpha = 1;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height =  size;
    const tmpCtx = tempCanvas.getContext('2d');

   const tempCanvas2 = document.createElement('canvas');
    tempCanvas2.width = size;
    tempCanvas2.height =  size;
    const tmpCtx2 = tempCanvas2.getContext('2d');

	const gradSize = size / 20;// / 1.5;
	let colorIndex = 0;
const hx = (c,s) => parseInt(c.substr(s*2, 2),16);
	for(let y=0; y < 2; y++) {
		for(let x=0; x < 2; x++) {
//            destCtx.globalAlpha = 1 / (1+ ((y*2)+x));
            console.log(destCtx.globalAlpha);
			tmpCtx.clearRect(0, 0, size, size);
//			const gradient = destCtx.createRadialGradient(
            const gradient = new DitheredRadialGradient(
				//size * (1 - x), 
				//size * (1 - y), 
				x * size, 
				y * size, 
				0 * size,  
				//x * size, 
				//y * size, 
                size * (1 - x), 
				size * (1 - y), 
                size * 1,
				gradSize * (1 - (Math.random()*0.01)) );
			const color = colors[colorIndex++];
            tmpCtx2.fillStyle = '#' + color;
            tmpCtx2.fillRect(0, 0, size, size);
            console.log('%cCOLOR #'+colorIndex, `color: #${color}`); //color, hx(color,0), hx(color,1), hx(color,2));
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
            gradient.fillRect(tmpCtx, 0, 0, size, size);
			tmpCtx.globalCompositeOperation = 'source-atop';
            tmpCtx.drawImage(tempCanvas2, 0, 0);


			destCtx.drawImage(tempCanvas, 0, 0);
            //return;
		}
	}
			destCtx.globalCompositeOperation = 'multiply';
    
	destCtx.globalAlpha = 1;

}
