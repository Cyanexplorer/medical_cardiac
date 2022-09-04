
class HSVType {
    constructor() {
        this.H = 0
        this.S = 0
        this.V = 0
    }

    set(h, s, v) {
        this.H = h
        this.S = s
        this.V = v

        return this
    }

    setFromRGB(r, g, b) {
        r /= 255
        g /= 255
        b /= 255

        let max = Math.max(r, g, b)
        let min = Math.min(r, g, b)
        let diff = max - min

        this.V = max

        if (diff == 0) {
            this.H = this.S = 0
        }
        else {
            this.S = diff / max

            if (max == r) {
                this.H = (g - b) / diff + (g < b ? 6 : 0)
            }
            else if (max == g) {
                this.H = (b - r) / diff + 2
            }
            else if (max == b) {
                this.H = (r - g) / diff + 4
            }
        }

    }

    to_RGB = function () {

        let h = this.H, s = this.S, v = this.V;
        let rgb = new RGBType()

        if (h == -1) {
            rgb.set(v, v, v)
            return rgb
        }

        let i = Math.floor(h);
        let f = h - i;

        if (!(i & 1))
            f = 1 - f; // if i is even

        let m = v * (1 - s);
        let n = v * (1 - s * f);

        switch (i) {
            case 0:
                rgb.set(v, n, m)
                break
            case 1:
                rgb.set(n, v, m)
                break
            case 2:
                rgb.set(m, v, n)
                break
            case 3:
                rgb.set(m, n, v)
                break
            case 4:
                rgb.set(n, m, v)
                break
            case 5:
                rgb.set(v, m, n)
                break
        }

        return rgb
    }

    to_string = () => {
        let rgb = this.to_RGB()
        let str = '#'

        let r = Math.round(rgb.R * 255)
        let g = Math.round(rgb.G * 255)
        let b = Math.round(rgb.B * 255)

        if (r < 16)
            str += '0'
        str += r.toString(16)

        if (g < 16)
            str += '0'
        str += g.toString(16)

        if (b < 16)
            str += '0'
        str += b.toString(16)

        return str
    }
}

class RGBType {
    constructor() {
        this.R = 0
        this.G = 0
        this.B = 0

        this.set = (r, g, b) => {
            this.R = r
            this.G = g
            this.B = b

            return this
        }

        this.setFromHSV = (h, s, v) => {

        }

        this.to_HSV = () => {

            let hsv = new HSVType()
            //console.log(hex, r, g, b)

            this.R /= 255
            this.G /= 255
            this.B /= 255

            let max = Math.max(this.this.R, this.G, this.B)
            let min = Math.min(this.this.R, this.G, this.B)
            let diff = max - min

            let h, s, v

            v = max

            if (diff == 0) {
                h = s = 0
            }
            else {
                s = diff / max

                if (max == this.this.R) {
                    h = (this.G - this.B) / diff + (this.G < this.B ? 6 : 0)
                }
                else if (max == this.G) {
                    h = (this.B - this.this.R) / diff + 2
                }
                else if (max == this.B) {
                    h = (this.R - this.G) / diff + 4
                }
            }

            hsv.set(h, s, v)

            return hsv
        }
    }
}


export {
    RGBType, HSVType
}