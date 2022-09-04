const maxSize = Math.pow(800, 3)
const bSize = Math.floor(maxSize / 8)

class BinaryPattern {
    constructor() {
        this._length = length
        this.data = new Uint8Array(bSize)
    }

    getBit = (index) => {
        let mask = 1 << index;
        return this.data & mask;
    }

    setBit = (index) => {
        let mask = 1 << index;
        this.data |= mask;
    }

    clearBit = (index) => {
        let mask = 1 << index;
        this.data &= ~mask;
    }

    changeBit = (index, value) => {
        let mask = 1 << index;
        this.data = this.data & ~mask | ((value << index) & mask);
    }

    clear = () => {
        this.data = 0;
    }

}

class BinaryArray {
    constructor(length, data) {
        this.data = data==null?new Uint8Array(new SharedArrayBuffer(Math.ceil(length / 8))):data;
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

// 用於封裝一般的typedarray，以利於快速訪問三維索引的實際位置
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

class TypedArray3D {

    constructor(type = 'uint8', width = 0, height = 0, depth = 0, pSize = 0, json = null) {
        //console.log(json)
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
                data: this.data,
                wh: wh,
                w: w,
                full: full
            }
        }

        let wh, w, full

        if (json != null) {
            this._dimensions = json.dimensions
            this._pSize = json.pSize
            this._type = json.type
            this.data = json.data
            wh = json.wh
            w = json.w
            full = json.full

            return
        }

        this._dimensions = [width, height, depth]
        this._pSize = pSize
        this._type = type

        switch (type) {
            case 'uint8':
                this.data = new Uint8Array(maxSize)
                break
            case 'uint8clamped':
                this.data = new Uint8ClampedArray(maxSize)
                break
            case 'uint16':
                this.data = new Uint16Array(maxSize)
                break
            case 'float32':
                this.data = new Float32Array(maxSize)
                break
            case 'float64':
                this.data = new Float64Array(maxSize)
                break
            default:
                this.data = new Uint8Array(maxSize)
                break
        }

        this.data.fill(0)

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

export { TypedArray3D, BinaryArray, BinaryPattern, TypedArray3DContainer, BinaryArray3DContainer }
