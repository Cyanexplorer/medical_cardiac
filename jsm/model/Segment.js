
import { BinaryArray } from "./ExtendedArray.js"


// CT影像資料類別
class ImageData {
    /**
     * 
     * @param {any} name used for segment identity
     * @param {any} dims 3 dimentions: x, y, z
     * @param {any} color used for segment identity
     */
    constructor(name = 'default', dims = [0, 0, 0],stored = 8, data = null) {
        this.dims = [...dims];
        this.name = name;
        this.stored = stored
        this.data = data == null ? new Uint16Array(new SharedArrayBuffer(dims[0] * dims[1] * dims[2] * 2)).fill(0) : data;
        this.backData = new Uint16Array(new SharedArrayBuffer(dims[0] * dims[1] * dims[2] * 2)).fill(0)
        this.sizeEnable = false;
        this.compressionRate = 1
        

        if (Math.min(...dims) >= 512) {
            this.compressionRate = 8
        }
        else if (Math.min(...dims) >= 256) {
            this.compressionRate = 4
        }
        else if (Math.min(...dims) >= 128) {
            this.compressionRate = 2
        }
        
        this.thumbnail = new Uint8ClampedArray(new SharedArrayBuffer(this.thumbnailLength))

        this.clear = () => {
            if (this.data !== null)
                this.data.fill(0)
        }

        this.imgWriter = function (axis, index, result) {
            let uvdDims = this.dims
            let i, j, k, step, count = 0

            let scalar = 2 ** (this.stored - 8)

            //load top 2 bottom
            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                for (i = index * step; i < index * step + step; i++) {
                    this.data[i] = result[4 * count + 3] * scalar
                    count++
                }
            }

            //load left 2 right
            else if (axis == axisUD) {
                step = uvdDims[1] * uvdDims[0]
                for (j = index * uvdDims[0], i = 0; j < this.data.length; j += step, i += uvdDims[0]) {
                    for (k = j; k < j + uvdDims[0]; k++) {
                        this.data[k] = result[4 * count + 3] * scalar
                        count++
                    }
                    //dataBuffer.set(result.subarray(i, i + uvdDims[0]), j, uvdDims[0])
                }
            }

            //load front 2 back
            else {
                for (j = uvdDims[0] - index - 1, i = 0; j < this.data.length; j += uvdDims[0], i++) {
                    this.data[j] = result[4 * count + 3] * scalar
                    count++
                }
            }
        }

        this.imgLoader = function (axis, index, result) {
            let uvdDims = this.dims

            //pixelEnhense(dataBuffer)
            let i, j, k, step, startPos
            let scalar = 2 ** (8 - this.stored)

            result.fill(255)

            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                startPos = index * step

                let count = 3
                for (i = startPos; i < startPos + step; i++) {
                    result[count] = this.data[i] * scalar
                    count += 4
                }
            }

            else if (axis == axisUD) {
                let jstep = uvdDims[1] * uvdDims[0]
                let count = 3
                for (j = index * uvdDims[0]; j < this.data.length; j += jstep) {

                    for (k = j; k < j + uvdDims[0]; k++) {
                        result[count] = this.data[k] * scalar
                        count += 4
                    }
                }
            }

            else {
                let count = 3
                for (j = uvdDims[0] - index - 1; j < this.data.length; j += uvdDims[0]) {
                    result[count] = this.data[j] * scalar
                    count += 4
                }
            }

            //console.log(result)
        }

        this.bright = (v) => {
            let iv = 1 - v
            for (let i = 0; i < this.data.length; i++) {
                this.data[i] = this.data[i] * v + iv
            }
        }

        this.addBuffer = (axis, index, result) => {
            //pixelEnhense(dataBuffer)
            let i, j, k, step, startPos, p, q
            //load top 2 bottom
            let uvdDims = this.dims
            let dataBuffer = this.data
            let ratio = 0.2

            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                startPos = index * step

                let count = 3//alpha通道位於陣列的index為3的倍數
                for (i = startPos; i < startPos + step; i++) {
                    p = result[count]
                    q = dataBuffer[i] * 255
                    result[count] = p + Math.abs(q - p) * ratio
                    count += 4
                }
                //buffer.set(dataBuffer.subarray(startPos, (startPos + step)))
            }

            //load left 2 right
            else if (axis == axisUD) {
                let jstep = uvdDims[1] * uvdDims[0]
                let count = 3

                for (j = index * uvdDims[0]; j < dataBuffer.length; j += jstep) {

                    for (k = j; k < j + uvdDims[0]; k++) {
                        p = result[count]
                        q = dataBuffer[k] * 255
                        result[count] = p + Math.abs(q - p) * ratio
                        count += 4
                    }
                    //buffer.set(dataBuffer.subarray(j, j + uvdDims[0]), startPos)
                }
            }

            //load front 2 back
            else {

                let count = 3
                for (j = uvdDims[0] - index - 1; j < dataBuffer.length; j += uvdDims[0]) {
                    p = result[count]
                    q = dataBuffer[j] * 255
                    result[count] = p + Math.abs(q - p) * ratio
                    count += 4
                }
            }
        }

        this.clone = (deep) => {
            let newImageData = new ImageData(this.name, this.dims, this.stored);
            pushData(this.data, newImageData.data)
            return newImageData
        };

        this.copyfrom = (imageData) => {
            this.dims = [...imageData.dims];

            this.name = imageData.name;
            this.stored = imageData.stored;

            if (this.data.length === imageData.data.length) {
                pushData(imageData.data, this.data)
            }

            else {
                alert('size mismatch')
            }

        };

        // 交換前景/背景資料
        this.switchData = () => {
            let tmp = this.backData
            this.backData = this.data
            this.data = tmp
        }

        this.applyMask = (mask) => {
            if (this.data.length != mask.length)
                return

            for (let i = 0; i < this.data.length; i++) {
                if (mask[i] != 1) {
                    this.data[i] = 0
                }
            }
        }


        this.generateThumbnail = () => {
            let size = this.thumbnailSize

            this.thumbnail.fill(0)

            let tmp = document.createElement('canvas')
            tmp.width = dims[0]
            tmp.height = dims[1]
            let ctx = tmp.getContext('2d')

            let cvt = document.createElement('canvas')
            cvt.width = size[0]
            cvt.height = size[1]
            let cvtctx = cvt.getContext('2d')

            let img = ctx.getImageData(0, 0, this.dims[0], this.dims[1])

            let size2 = size[0] * size[1]

            for (let di = 0, ti = 0; di < this.dims[2]; di += this.compressionRate, ti++) {

                this.imgLoader(axisUV, di, img.data)
                
                ctx.putImageData(img, 0, 0)
                cvtctx.clearRect(0, 0, size[0], size[1])
                cvtctx.drawImage(ctx.canvas, 0, 0, size[0], size[1])
                let result = cvtctx.getImageData(0, 0, size[0], size[1])

                for (let i = 0; i < size2; i++) {
                    this.thumbnail[ti * size2 + i] = result.data[4 * i + 3]
                }
            }

            //console.log(this.thumbnail, size2)
        }
    }

    get thumbnailLength() {
        let size = this.thumbnailSize
        return size[0] * size[1] * size[2]
    }

    get thumbnailSize() {
        return [
            Math.round(this.dims[0] / this.compressionRate),
            Math.round(this.dims[1] / this.compressionRate),
            Math.round(this.dims[2] / this.compressionRate),
        ]
    }

    get layer() {
        return this.dims[2]
    }

    get maxVal() {
        return 2 ** this.stored
    }

}

class ImageData8 {
    /**
     * 
     * @param {any} name used for segment identity
     * @param {any} dims 3 dimentions: x, y, z
     * @param {any} color used for segment identity
     */
    constructor(name = 'default', dims = [0, 0, 0], data = null) {
        this.dims = [...dims];
        this.name = name;
        this.data = data == null ? new Uint8Array(new SharedArrayBuffer(dims[0] * dims[1] * dims[2])).fill(0) : data;
        this.backData = new Uint8Array(new SharedArrayBuffer(dims[0] * dims[1] * dims[2])).fill(0)
        this.compressionRate = 1

        if (Math.min(...dims) >= 512) {
            this.compressionRate = 8
        }
        else if (Math.min(...dims) >= 256) {
            this.compressionRate = 4
        }
        else if (Math.min(...dims) >= 128) {
            this.compressionRate = 2
        }

        this.thumbnail = new Uint8ClampedArray(new SharedArrayBuffer(this.thumbnailLength))

        this.clear = () => {
            if (this.data !== null)
                this.data.fill(0)
        }

        this.imgWriter = function (axis, index, result) {
            let uvdDims = this.dims
            let i, j, k, step, count = 0

            // 網頁Canvas通常以uint8格式儲存像素資料，當資料保存至CT時，需要根據CT陣列的位元組(uint8 or uint16)做轉換
            // scalar: 位元轉換參數，用法uint16 = uint8 * scalar

            //load top 2 bottom
            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                for (i = index * step; i < index * step + step; i++) {
                    this.data[i] = result[4 * count + 3]
                    count++
                }
            }

            //load left 2 right
            else if (axis == axisUD) {
                step = uvdDims[1] * uvdDims[0]
                for (j = index * uvdDims[0], i = 0; j < this.data.length; j += step, i += uvdDims[0]) {
                    for (k = j; k < j + uvdDims[0]; k++) {
                        this.data[k] = result[4 * count + 3]
                        count++
                    }
                    //dataBuffer.set(result.subarray(i, i + uvdDims[0]), j, uvdDims[0])
                }
            }

            //load front 2 back
            else {
                for (j = uvdDims[0] - index - 1, i = 0; j < this.data.length; j += uvdDims[0], i++) {
                    this.data[j] = result[4 * count + 3]
                    count++
                }
            }
        }

        this.imgLoader = function (axis, index, result) {
            let uvdDims = this.dims

            let i, j, k, step, startPos

            result.fill(255)

            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                startPos = index * step

                let count = 3
                for (i = startPos; i < startPos + step; i++) {
                    result[count] = this.data[i]
                    count += 4
                }
            }

            else if (axis == axisUD) {
                let jstep = uvdDims[1] * uvdDims[0]
                let count = 3
                for (j = index * uvdDims[0]; j < this.data.length; j += jstep) {

                    for (k = j; k < j + uvdDims[0]; k++) {
                        result[count] = this.data[k]
                        count += 4
                    }
                }
            }

            else {
                let count = 3
                for (j = uvdDims[0] - index - 1; j < this.data.length; j += uvdDims[0]) {
                    result[count] = this.data[j]
                    count += 4
                }
            }

            //console.log(result)
        }

        this.addBuffer = (axis, index, result) => {
            //pixelEnhense(dataBuffer)
            let i, j, k, step, startPos, p, q
            //load top 2 bottom
            let uvdDims = this.dims
            let dataBuffer = this.data
            let ratio = 0.2

            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                startPos = index * step

                let count = 3//alpha通道位於陣列的index為3的倍數
                for (i = startPos; i < startPos + step; i++) {
                    p = result[count]
                    q = dataBuffer[i]
                    result[count] = p + Math.abs(q - p) * ratio
                    count += 4
                }
                //buffer.set(dataBuffer.subarray(startPos, (startPos + step)))
            }

            //load left 2 right
            else if (axis == axisUD) {
                let jstep = uvdDims[1] * uvdDims[0]
                let count = 3

                for (j = index * uvdDims[0]; j < dataBuffer.length; j += jstep) {

                    for (k = j; k < j + uvdDims[0]; k++) {
                        p = result[count]
                        q = dataBuffer[k]
                        result[count] = p + Math.abs(q - p) * ratio
                        count += 4
                    }
                    //buffer.set(dataBuffer.subarray(j, j + uvdDims[0]), startPos)
                }
            }

            //load front 2 back
            else {

                let count = 3
                for (j = uvdDims[0] - index - 1; j < dataBuffer.length; j += uvdDims[0]) {
                    p = result[count]
                    q = dataBuffer[j]
                    result[count] = p + Math.abs(q - p) * ratio
                    count += 4
                }
            }
        }

        this.clone = (deep) => {
            return new ImageData8(this.name, this.dims, this.data.slice(0, 0).set(this.data.buffer.slice()));
        };

        this.copyfrom = (imageData) => {
            this.dims = [...imageData.dims];

            this.name = imageData.name;

            if (this.data.length === imageData.data.length) {
                this.data.set(imageData.data);
            }

            this.data = imageData.data.slice();

        };

        // 交換前景/背景資料
        this.switchData = () => {
            let tmp = this.backData
            this.backData = this.data
            this.data = tmp
        }

        this.generateThumbnail = () => {
            let size = this.thumbnailSize

            this.thumbnail.fill(0)

            let tmp = document.createElement('canvas')
            tmp.width = dims[0]
            tmp.height = dims[1]
            let ctx = tmp.getContext('2d')

            let cvt = document.createElement('canvas')
            cvt.width = size[0]
            cvt.height = size[1]
            let cvtctx = cvt.getContext('2d')

            let img = ctx.getImageData(0, 0, this.dims[0], this.dims[1])

            let size2 = size[0] * size[1]

            for (let di = 0, ti = 0; di < this.dims[2]; di += this.compressionRate, ti++) {

                this.imgLoader(axisUV, di, img.data)
                
                ctx.putImageData(img, 0, 0)
                cvtctx.clearRect(0, 0, size[0], size[1])
                cvtctx.drawImage(ctx.canvas, 0, 0, size[0], size[1])
                let result = cvtctx.getImageData(0, 0, size[0], size[1])

                for (let i = 0; i < size2; i++) {
                    this.thumbnail[ti * size2 + i] = result.data[4 * i + 3]
                }
            }
        }
    }

    get layer() {
        return this.dims[2]
    }

    get thumbnailLength() {
        let size = this.thumbnailSize
        return size[0] * size[1] * size[2]
    }

    get thumbnailSize() {
        return [
            Math.round(this.dims[0] / this.compressionRate),
            Math.round(this.dims[1] / this.compressionRate),
            Math.round(this.dims[2] / this.compressionRate),
        ]
    }

    get maxVal() {
        return 256
    }

}

class Segment {
    /**
     * 
     * @param {any} name used for segment identity
     * @param {any} dims 3 dimentions: x, y, z
     * @param {any} color used for segment identity
     */
    constructor(name = 'default', dims = [0, 0, 0], color = '000000', visible = true) {
        this.dims = [...dims]
        this.name = name
        this.color = color
        this.compressionRate = 1

        if (Math.min(...dims) >= 512) {
            this.compressionRate = 8
        }
        else if (Math.min(...dims) >= 256) {
            this.compressionRate = 4
        }
        else if (Math.min(...dims) >= 128) {
            this.compressionRate = 2
        }

        this.thumbnail = new Uint8ClampedArray(new SharedArrayBuffer(this.thumbnailLength))

        //壓縮記憶體使用量
        this.data = new BinaryArray(dims[0] * dims[1] * dims[2])
        this.data.fill(0)

        this.backData = new BinaryArray(dims[0] * dims[1] * dims[2])
        this.backData.fill(0)

        this.visible = visible
        this.sizeEnable = false
        //this.sizeData = new Float32Array(dims[0] * dims[1] * dims[2]).fill(0)

        this.clear = () => {
            this.data.fill(0)
        }

        /**
         * 影像資料採用float保存(0~1)
         * 取出時需要映射至0~255才能給canvas使用
         */
        this.binaryWriter = function (axis, index, result) {
            let uvdDims = this.dims
            let data = this.data
            let i, j, k, step, count = 0

            //load top 2 bottom
            //console.log(dataBuffer)
            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                for (i = index * step; i < index * step + step; i++) {
                    result[4 * count + 3] > 0 ? data.setBit(i) : data.clearBit(i)
                    count++
                }
            }

            //load left 2 right
            else if (axis == axisUD) {
                step = uvdDims[1] * uvdDims[0]
                for (j = index * uvdDims[0], i = 0; j < this.length; j += step, i += uvdDims[0]) {
                    for (k = j; k < j + uvdDims[0]; k++) {
                        result[4 * count + 3] > 0 ? data.setBit(k) : data.clearBit(k)
                        count++
                    }
                    //dataBuffer.set(result.subarray(i, i + uvdDims[0]), j, uvdDims[0])
                }
            }

            //load front 2 back
            else {
                for (j = uvdDims[0] - index - 1; j < this.length; j += uvdDims[0]) {
                    result[4 * count + 3] > 0 ? data.setBit(j) : data.clearBit(j)
                    count++
                }
            }
        }

        this.binaryLoader = function (axis, index, result) {
            let uvdDims = this.dims
            let data = this.data
            //pixelEnhense(dataBuffer)
            let i, j, k, step, startPos
            let count = 0

            //result.fill(255)
            if (axis == axisUV) {
                step = uvdDims[1] * uvdDims[0]
                startPos = index * step

                for (i = startPos; i < startPos + step; i++) {
                    result[4 * count + 3] = data.getBit(i) * 255
                    count++
                }
            }

            else if (axis == axisUD) {
                let jstep = uvdDims[1] * uvdDims[0]
                for (j = index * uvdDims[0]; j < this.length; j += jstep) {

                    for (k = j; k < j + uvdDims[0]; k++) {
                        result[4 * count + 3] = data.getBit(k) * 255
                        count++
                    }
                }
            }

            else {

                for (j = uvdDims[0] - index - 1; j < this.length; j += uvdDims[0]) {
                    result[4 * count + 3] = data.getBit(j) * 255
                    count++
                }
            }
        }


        this.clone = (deep) => {
            let tmpSeg = new Segment(this.name, this.dims, this.color, this.visible);
            pushData(this.data.data, tmpSeg.data.data)

            console.log(tmpSeg)
            return tmpSeg;
        }

        this.copyfrom = (segment) => {
            this.dims = [...segment.dims];

            this.name = segment.name;
            this.color = segment.color;
            this.visible = segment.visible;

            if (this.data.length === segment.data.length) {
                pushData(segment.data.data, this.data.data)
            }
            else {
                alert('size mismatch')
            }


        };

        this.generateThumbnail = () => {

            let size = this.thumbnailSize

            size.push(size[0] * size[1] * size[2])

            this.thumbnail.fill(0)

            let tmp = document.createElement('canvas')
            tmp.width = dims[0]
            tmp.height = dims[1]
            let ctx = tmp.getContext('2d')

            let cvt = document.createElement('canvas')
            cvt.width = size[0]
            cvt.height = size[1]
            let cvtctx = cvt.getContext('2d')

            let img = ctx.getImageData(0, 0, this.dims[0], this.dims[1])

            let size2 = size[0] * size[1]

            for (let di = 0, ti = 0; di < this.dims[2]; di += this.compressionRate, ti++) {

                this.binaryLoader(axisUV, di, img.data)
                
                ctx.putImageData(img, 0, 0)
                cvtctx.clearRect(0, 0, size[0], size[1])
                cvtctx.drawImage(ctx.canvas, 0, 0, size[0], size[1])
                let result = cvtctx.getImageData(0, 0, size[0], size[1])

                for (let i = 0; i < size2; i++) {
                    this.thumbnail[ti * size2 + i] = result.data[4 * i + 3]
                }
            }

        }

        // 交換前景/背景資料
        this.switchData = () => {
            let tmp = this.backData
            this.backData = this.data
            this.data = tmp
        }

    }

    get layer() {
        return this.dims[2];
    }

    get length() {
        return this.dims[0] * this.dims[1] * this.dims[2];
    }

    get thumbnailLength() {
        let size = this.thumbnailSize
        return size[0] * size[1] * size[2]
    }

    get thumbnailSize() {
        return [
            Math.round(this.dims[0] / this.compressionRate),
            Math.round(this.dims[1] / this.compressionRate),
            Math.round(this.dims[2] / this.compressionRate),
        ]
    }

    get maxVal() {
        return 1
    }

}

export { Segment, ImageData, ImageData8 }