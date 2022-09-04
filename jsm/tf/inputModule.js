import { LittleTriangle } from './hsv.js'
import { RGBType, HSVType } from './colorSpaceConvertor.js'

let instance = null

class InputModule {

	static getInstance(arg, domElement) {
		if (instance == null)
			instance = new InputModule(arg, domElement)

		return instance
	}

	static saveType = {
		ASCII: 0,
		BINARY: 1
	}

	constructor(arg, domElement) {
		let x_old, y_old;

		this.interpolation = function (x_old, y_old, x, y) {
			//console.log("old(%d, %d), new(%d, %d)\n", x_old, y_old, x, y);
			if (x_old == x) {
				arg.path[x_old] = y_old;
				if (arg.path[x_old] > 179)
					arg.path[x_old] = 179;
				else if (arg.path[x_old] < 0)
					arg.path[x_old] = 0;
			}
			else {
				let tmp;
				let x1 = x_old;
				let y1 = y_old;
				let x2 = x;
				let y2 = y;

				if (x1 > x2) {
					tmp = x1;
					x1 = x2;
					x2 = tmp;

					tmp = y1;
					y1 = y2;
					y2 = tmp;
				}

				let preload = (y2 - y1) / (x2 - x1)
				for (let i = x1 < 0 ? 0 : x1; i <= x2 && i < 256; i++) {
					arg.path[i] = y1 + (i - x1) * preload;

					if (arg.path[i] < 0)
						arg.path[i] = 0;
					if (arg.path[i] > 179)
						arg.path[i] = 179;

					arg.rgba[3][i] = arg.path[i] / 180.0;
				}
			}
		}

		this.mouseMoveHandler2 = function (x, y) {
			let yy = 180 - y;

			if (x >= 0 && x < (0 + 256) && yy >= 0 && yy < (180)) {
				this.interpolation(x_old - 0, y_old, x - 0, yy);

				x_old = x;
				y_old = yy;
			}
		}

	}
}

export { InputModule }