class TypedArray3DContainer {

    constructor(data, width = 0, height = 0, depth = 0, pSize = 0) {

        this.getValue3D = (wIndex, hIndex, dIndex) => {
            //dIndex * pwidth * pheight + hIndex * pwidth + wIndex
            //console.log(this.data, index)
            let index = dIndex * wh + hIndex * w + wIndex
            return this.data[index]
        }

        this.setValue3D = (value, wIndex, hIndex, dIndex) => {
            let index = dIndex * wh + hIndex * w + wIndex
            this.data[index] = value
        }

        this.getValue = (index) => {
            return this.data[index]
        }

        this.setValue = (index, value) => {
            this.data[index] = value
        }

        this.swap = (swapData) => {
            if (this._tmp == null) {
                this._tmp = this.data.subarray(0)
            } else {
                this._tmp.set(this.data)
            }

            this.data.set(swapData)
            swapData.set(this._tmp)
        }

        this.getValueWithPadding3D = (wIndex, hIndex, dIndex) => {
            //(dIndex + pSize) * pwidth * pheight + hIndex * pwidth + wIndex
            let index = dIndex * wh + hIndex * w + wIndex + this.pSize * full
            return this.data[index]
        }

        this.setValueWithPadding3D = (value, wIndex, hIndex, dIndex) => {
            let index = dIndex * wh + hIndex * w + wIndex + this.pSize * full
            this.data[index] = value
        }

        this.needUpdate = () => {
            let p2 = this.pSize * 2
            this._pDimension =
                [this._dimensions[0] + p2,
                this._dimensions[1] + p2,
                this._dimensions[2] + p2]

            wh = this._pDimension[0] * this._pDimension[1]
            w = this._pDimension[0]
            full = wh + w + 1
        }

        this.clear = () => {
            this.fill(0)
        }

        this.fill = (v = 0) => {
            this.data.fill(v, 0, this.length)
        }

        this.toArray = (result) => {
            if (result.length > this.data.length)
                result.set(this.data)
            else
                result.set(this.data, 0, result.length)
        }

        this.toJSON = () => {
            return {
                dimensions: this._dimensions,
                pSize: this._pSize,
                type: this._type,
                data: this.data
            }
        }

        let wh, w, full

        this._dimensions = [width, height, depth]
        this._pSize = pSize
        this.data = data

        this.needUpdate()
    }

    static fromJSON = (json) => {
        return new TypedArray3D(json.type,
            json.dimension[0], json.dimension[1],
            json.dimension[2], json.pSize, json.data)
    }

    set width(v) {
        this._dimensions[0] = v
    }

    set height(v) {
        this._dimensions[1] = v
    }

    set depth(v) {
        this._dimensions[2] = v
    }

    set pSize(v) {
        this._pSize = v
    }

    get width() {
        return this._dimensions[0]
    }

    get height() {
        return this._dimensions[1]
    }

    get depth() {
        return this._dimensions[2]
    }

    get pWidth() {
        return this._pDimensions[0]
    }

    get pHeight() {
        return this._pDimensions[1]
    }

    get pDepth() {
        return this._pDimensions[2]
    }

    get pSize() {
        return this._pSize
    }

    get length() {
        return this.pwidth * this.pheight * this.pdepth
    }

    transpose = () => {
        if (order.length < 3) {
            return
        }
    }

    foreach = (onload) => {
        if (!onload instanceof Function) {
            return
        }

        for (let i = 0; i < this.length; i++) {
            onload(this.data[i], i)
        }
    }

}
let kmultiply = (x, y, z, kOrder, kernel, template) => {

    let p = 0;

    for (let i = 0; i < kOrder.length; i++) {
        let order = kOrder[i]

        let kPos_x = Math.abs(x + order[0])
        let kPos_y = Math.abs(y + order[1])
        let kPos_z = Math.abs(z + order[2])

        let pValue = template.getValue3D(kPos_x, kPos_y, kPos_z)

        p += kernel[i] * pValue / 16 //為避免運算結果超出Uint8Array上限，此處需要除16降低精度
    }

    return p * p
}

self.addEventListener('message', (e) => {

    let data = e.data
    let udata = new Uint8Array(data.dataBuffer)
    let dims = data.dims
    let backData = new Uint8Array(data.backDataBuffer)
    
    let template = new TypedArray3DContainer(udata, dims[0], dims[1], dims[2], 0)
    let kernel = data.kernel
    let kOrder = data.kOrder

    let i, j, k
    let startPos = 0

    for (i = 0; i < dims[2]; i++) {
        for (j = 0; j < dims[1]; j++) {
            for (k = 0; k < dims[0]; k++) {
                backData[startPos++] += kmultiply(k, j, i, kOrder, kernel, template)
            }
        }
    }

    self.postMessage([]);
    self.close()

})