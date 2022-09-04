class BinaryArray {
    constructor(length, data) {
        this.data = data == null ? new Uint8Array(new SharedArrayBuffer(Math.ceil(length / 8))) : data;
        this._length = length;
        this._index = 0;
    }

    getBit = (index) => {
        let ni = Math.floor(index / 8)
        return (this.data[ni] >> (index % 8)) & 1
    }

    invert = (index) => {
        let value = this.getBit(index) ^ 1;
        this.setValue(value, index);
    }

    setValue = (value, index) => {
        let ni = Math.floor(index / 8);
        let i = (index % 8)
        let mask = 1 << i;

        this.data[ni] = this.data[ni] & ~mask | value << i;
    }

    setBit = (index) => {
        let ni = Math.floor(index / 8);
        let mask = 1 << (index % 8);
        this.data[ni] |= mask;
    }

    clearBit = (index) => {
        let ni = Math.floor(index / 8);
        let mask = 1 << (index % 8);
        this.data[ni] &= ~mask;
    }

    clear = () => {
        this.data.fill(0);
    }

    get length() {
        return this._length
    }

    fill = (v) => {
        this.data.fill(0)
    }

    slice = (startPos = 0, endPos = this.length) => {
        let result = new BinaryArray(this.length);
        result.data = this.data.slice();
        return result;
    }

    set = (newData) => {
        this.data.set(newData.data);
    }

    copyfrom = (array) => {
        if (!(array instanceof BinaryArray)) {
            return;
        }

        for (let i = 0; i < this.length || i < array.length; i++) {
            this.data[i] = array.data[i];
        }
    }

    toArray = () => {
        let arr = new Uint8Array(this.length)

        for (let i = 0; i < arr.length; i++) {
            arr[i] = this.getBit(i)
        }

        return arr
    }

    toTensorArray = () => {
        let arr = new Int32Array(this.length)

        for (let i = 0; i < arr.length; i++) {
            arr[i] = this.getBit(i)
        }

        return arr
    }
}

class BinaryArray3DContainer {

    constructor(data, width = 0, height = 0, depth = 0, pSize = 0) {

        this.getValue3D = (wIndex, hIndex, dIndex) => {
            //dIndex * pwidth * pheight + hIndex * pwidth + wIndex
            //console.log(this.data, index)
            let index = dIndex * wh + hIndex * w + wIndex
            return this.getValue(index)
        }

        this.setValue3D = (value, wIndex, hIndex, dIndex) => {
            let index = dIndex * wh + hIndex * w + wIndex
            this.setValue(index, value)
        }

        this.getValue = (index) => {
            return this.data.getBit(index)
        }

        this.setValue = (index, value) => {
            this.data.setValue(value, index)
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
            return this.getValue(index)
        }

        this.setValueWithPadding3D = (value, wIndex, hIndex, dIndex) => {
            let index = dIndex * wh + hIndex * w + wIndex + this.pSize * full
            this.setValue(index, value)
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
            this.data.fill(v)
        }

        this.toJSON = () => {
            return {
                dimensions: this._dimensions,
                pSize: this._pSize,
                type: this._type,
                data: this.data.data,
                length: data.length
            }
        }

        let wh, w, full

        this._dimensions = [width, height, depth]
        this._pSize = pSize
        this.data = data

        this.needUpdate()
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
            onload(this.data.getBit(i), i)
        }
    }

}

self.addEventListener('message', (e) => {

    let data = e.data
    let dims = data.dims
    let size = dims[0] * dims[1] * dims[2]
    let binData = new BinaryArray(size, new Uint8Array(data.dataBuffer))
    let backData = new BinaryArray(size, new Uint8Array(data.backDataBuffer))
    let template = new BinaryArray3DContainer(backData, dims[0], dims[1], dims[2], 0)
    let kDims = data.kDims

    backData.copyfrom(binData)
    

    let kernel = data.kernel
    let kOrder = data.kOrder

    let kSum = 0
    // 預先計算kernel的size
    for (let i of kernel) {
        kSum += i
    }

    
    let calculate2 = (x, y, z) => {
        x -= Math.floor(kDims[0] / 2)
        y -= Math.floor(kDims[1] / 2)
        z -= Math.floor(kDims[2] / 2)

        let p = 0
        
        for (let i = 0; i < kOrder.length; i++) {
            let order = kOrder[i]

            let kBase_x = Math.abs(x + order[0] + dims[0]) % (dims[0] * 2)
            let kBase_y = Math.abs(y + order[1] + dims[1]) % (dims[1] * 2)
            let kBase_z = Math.abs(z + order[2] + dims[2]) % (dims[2] * 2)

            let kPos_x = Math.abs(kBase_x - dims[0])
            let kPos_y = Math.abs(kBase_y - dims[1])
            let kPos_z = Math.abs(kBase_z - dims[2])

            p += kernel[i] * template.getValue3D(kPos_x, kPos_y, kPos_z)

        }


        return Math.round(p / kSum)

    }

    let pos = 0

    for (let i = 0; i < dims[2]; i++) {
        for (let j = 0; j < dims[1]; j++) {
            for (let k = 0; k < dims[0]; k++) {
                binData.setValue(calculate2(k, j, i), pos)
                pos++
            }
        }
    }

    self.postMessage([]);
    self.close()

})