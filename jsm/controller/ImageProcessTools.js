
import { Growing, SizeBased, Logic, Scissor, Kernel } from "./Algorithm.js"
import { Segment } from '../model/Segment.js'
import { SegTools } from "./template.js"
import { BinaryArray, BinaryArray3DContainer, TypedArray3DContainer } from "../model/ExtendedArray.js"

class ImageProcess {
    constructor() {
        this.postprocess = async (imageData, stored, type, inverted, onload) => {

            let dataBuffer = imageData.data

            if (stored == -1) {
                console.log('Format not support.')
                return
            }

            let max = 2 ** stored

            if (type == 0) {
                mapHE(imageData, max)
            } else if (type == 1) {
                mapLog(imageData, max)
            } else if (type == 2) {
                mapCLHE(imageData, max)
            } else if (type == 3) {
                mapCLAHE(imageData, max)
            } else if (type == 4) {
                mapResize(imageData, max)
            } else if (type == 5) {
                mapCLAHE2D(imageData, max)
            } else if (type == 6) {
                mapiCLAHE(imageData, max)
            } else if (type == 7) {
                mapGradient(imageData, max)
            } else if (type == 8) {
                mapSharpen(imageData, max)
            }

            if (inverted) {

                let scalar = max - 1;
                for (let i = 0; i < dataBuffer.length; i++) {
                    dataBuffer[i] = scalar - dataBuffer[i];
                }
            }

            onload()
        }

        // 待修正
        let mapSharpen = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            let kernelSize = paddingSize * 2 + 1
            let kernel = new Array(kernelSize * kernelSize * kernelSize).fill(-1)

            let kLen = Math.pow(kernelSize, 3)
            kernel[parseInt(kLen / 2) + 1] = kLen

            let kDims = [kernelSize, kernelSize, kernelSize]

            convolution_blur2(segment, kernel, kDims, paddingSize)
            //-----------
            let binData = segment.data
            let backData = segment.backData
            //let dims = segment.dims

            let kOrder = kernelOrder(kDims)
            let template = new BinaryArray3DContainer(backData, dims[0], dims[1], dims[2], 0)

            backData.copyfrom(binData)

            let kDimsHalf = [parseInt(kDims[0] / 2), parseInt(kDims[1] / 2), parseInt(kDims[2] / 2)]

            let calculate = (x, y, z) => {

                let p = 0

                x -= kDimsHalf[0]
                y -= kDimsHalf[1]
                z -= kDimsHalf[2]

                for (let i = 0; i < kOrder.length; i++) {

                    let order = kOrder[i]

                    let kPos_x = Math.abs(x + order[0])
                    let kPos_y = Math.abs(y + order[1])
                    let kPos_z = Math.abs(z + order[2])

                    p += kernel[i] * template.getValueWithPadding3D(kPos_x, y + kPos_y, kPos_z)

                }

                return p
            }

            let pos = 0
            let i, j, k, p

            for (i = 0; i < dims[2]; i++) {
                for (j = 0; j < dims[1]; j++) {
                    for (k = 0; k < dims[0]; k++) {
                        p = binData.getBit(pos) * 0.9 + calculate(k, j, i) * 0.1
                        p = Math.min(Math.max(p, 0), 65535)

                        pos++
                    }
                }
            }
        }

        this.mapGradient = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            //this.normalize(result, 0.8);
        };

        let mapiCLAHE = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            let d1 = dataBuffer
            let d2 = dataBuffer.slice()

            mapCLAHE(d1, max, dims)
            mapHE(d2, max)

            for (let i = 0; i < dataBuffer.length; i++) {
                dataBuffer[i] = d1[i] * 0.5 + d2[i] * 0.5
            }

            //mapHE(dataBuffer, dims)

        }

        let mapCLAHE2D = (imageData) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            let src = new cv.Mat()

            switch (dataBuffer.BYTES_PER_ELEMENT) {
                case 1:
                    src = new cv.Mat(dims[0], dims[1], cv.CV_8UC1)
                    break
                case 2:
                    src = new cv.Mat(dims[0], dims[1], cv.CV_16UC1)
                    break
                default:
                    return
            }

            console.log(src)

            let step = dims[0] * dims[1]
            let claheDst = new cv.Mat()
            let tiltGridSize = new cv.Size(8, 8)
            let clahe = new cv.CLAHE(40, tiltGridSize)

            for (let i = 0; i < dims[2]; i++) {

                for (let j = 0; j < step; j++) {
                    src.data[j] = dataBuffer[j + i * step]
                }

                clahe.apply(src, claheDst)

                dataBuffer.set(claheDst.data, i * step)
            }
        }

        let mapResize = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            let mm = getMinMax(dataBuffer)
            let ratio = (max - 1) / (mm.max - mm.min)
            for (let i = 0; i < dataBuffer.length; i++) {
                dataBuffer[i] = (dataBuffer[i] - mm.min) * ratio
            }
        }

        let mapLog = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            for (let i = 0; i < dataBuffer.length; i++) {
                dataBuffer[i] = Math.log10(dataBuffer[i])
            }

            let mm = getMinMax(dataBuffer)
            let ratio = (max - 1) / (mm.max - mm.min)
            for (let i = 0; i < dataBuffer.length; i++) {
                dataBuffer[i] = (dataBuffer[i] - mm.min) * ratio
            }
        }

        let equalization = (histogram, max) => {
            let minIndex, maxIndex

            for (minIndex = 0; minIndex < histogram.length; minIndex++) {
                if (histogram[minIndex] > 0)
                    break
            }

            for (maxIndex = histogram.length - 1; maxIndex > minIndex; maxIndex--) {
                if (histogram[maxIndex] > 0)
                    break
            }

            for (let i = minIndex + 1; i < histogram.length; i++) {
                histogram[i] += histogram[i - 1]
            }



            let maxCDF = histogram[maxIndex]
            let minCDF = histogram[minIndex]
            let ratio = (max - 1) / (maxCDF - minCDF)

            for (let i = minIndex; i < histogram.length; i++) {
                histogram[i] = Math.round((histogram[i] - minCDF) * ratio)
            }

        }

        let contrastLimit = (histogram, limit) => {

            let counter = 0
            let total = 0
            let remain = histogram.length
            for (let i = 0; i < histogram.length; i++) {
                total += histogram[i]
                if (histogram[i] > limit) {
                    counter += (histogram[i] - limit)
                    histogram[i] = limit
                    remain--
                }
            }

            if (counter / 2 >= total) {
                let value = total / histogram.length
                histogram.fill(value)
                return
            }

            //console.log(counter, upper, limit)
            while (counter > 0) {
                let offset = counter / remain
                let upper = limit - offset
                for (let i = 0; i < histogram.length; i++) {
                    if (histogram[i] > upper) {
                        counter -= limit - histogram[i]
                        histogram[i] = limit
                        remain--
                    } else {
                        counter -= offset
                        histogram[i] += offset
                    }
                }
                //console.log(counter)
            }


            //console.log(histogram)
        }



        let mapCLAHE = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            let blockSize = 64

            let tiles = [
                Math.ceil(dims[0] / blockSize),
                Math.ceil(dims[1] / blockSize),
                Math.ceil(dims[2] / blockSize)]

            let cdfs = new Uint32Array(tiles[2] * tiles[1] * tiles[0] * max).fill(0)

            let dims01 = dims[0] * dims[1]
            let dims0 = dims[0]

            let getPosition = (x, y, z) => {
                return dims01 * z + dims0 * y + x
            }

            let tiles01 = tiles[0] * tiles[1]
            let tiles0 = tiles[0]

            let getTilesPos = (x, y, z) => {
                return tiles01 * z + tiles0 * y + x
            }


            let buildcdf = (x, y, z, kDims) => {
                let histogram = new Uint32Array(max).fill(0)

                let i, j, k, index

                for (i = 0; i < kDims[2]; i++) {
                    for (j = 0; j < kDims[1]; j++) {
                        for (k = 0; k < kDims[0]; k++) {
                            index = getPosition(x + k, y + j, z + i)
                            histogram[dataBuffer[index]]++
                        }
                    }
                }

                let climit = kDims[0] * kDims[1] * kDims[2] * 0.2
                contrastLimit(histogram, climit)

                //equalization
                equalization(histogram, max)

                return histogram
            }

            let i, j, k, p = 0
            let kDims = new Array(3).fill(blockSize)
            let rDims = [dims[0] % blockSize, dims[1] % blockSize, dims[2] % blockSize]
            let limit = [dims[0] - blockSize, dims[1] - blockSize, dims[2] - blockSize]

            for (i = 0; i < dims[2]; i += blockSize) {

                kDims[2] = limit[2] >= i ? blockSize : rDims[2]

                for (j = 0; j < dims[1]; j += blockSize) {

                    kDims[1] = limit[1] >= j ? blockSize : rDims[1]

                    for (k = 0; k < dims[0]; k += blockSize) {

                        kDims[0] = limit[0] >= k ? blockSize : rDims[0]

                        cdfs.set(buildcdf(k, j, i, kDims), p)
                        p += max

                    }
                }
            }

            let pos = 0
            for (i = 0; i < dims[2]; i++) {
                let posz = i / blockSize - 0.5
                let zmin = Math.max(Math.floor(posz), 0)
                let zmax = Math.min(zmin + 1, tiles[2] - 1)
                let fz = posz - zmin
                let ifz = 1 - fz

                for (j = 0; j < dims[1]; j++) {
                    let posy = j / blockSize - 0.5
                    let ymin = Math.max(Math.floor(posy), 0)
                    let ymax = Math.min(ymin + 1, tiles[1] - 1)
                    let fy = posy - ymin
                    let ify = 1 - fy

                    for (k = 0; k < dims[0]; k++) {
                        let posx = k / blockSize - 0.5
                        let xmin = Math.max(Math.floor(posx), 0)
                        let xmax = Math.min(xmin + 1, tiles[0] - 1)
                        let fx = posx - xmin
                        let ifx = 1 - fx

                        let pixel = dataBuffer[pos]

                        let cdf0 = cdfs[getTilesPos(xmin, ymin, zmin) * max + pixel]
                        let cdf1 = cdfs[getTilesPos(xmax, ymin, zmin) * max + pixel]
                        let cdf2 = cdfs[getTilesPos(xmin, ymax, zmin) * max + pixel]
                        let cdf3 = cdfs[getTilesPos(xmax, ymax, zmin) * max + pixel]
                        let cdf4 = cdfs[getTilesPos(xmin, ymin, zmax) * max + pixel]
                        let cdf5 = cdfs[getTilesPos(xmax, ymin, zmax) * max + pixel]
                        let cdf6 = cdfs[getTilesPos(xmin, ymax, zmax) * max + pixel]
                        let cdf7 = cdfs[getTilesPos(xmax, ymax, zmax) * max + pixel]

                        /*let out = ifx * ify * ifz * cdf0
                         + fx * ify * ifz * cdf1
                         + ifx * fy * ifz * cdf2
                         + fx * fy * ifz * cdf3
                         + ifx * ify * fz * cdf4
                         + fx * ify * fz * cdf5
                         + ifx * fy * fz * cdf6
                         + fx * fy * fz * cdf7
                         */

                        let out = ((ifx * cdf0 + fx * cdf1) * ify + (ifx * cdf2 + fx * cdf3) * fy) * ifz
                            + ((ifx * cdf4 + fx * cdf5) * ify + (ifx * cdf6 + fx * cdf7) * fy) * fz


                        dataBuffer[pos++] = out >= max ? max - 1 : out//* 3 / 4
                    }
                }
            }


            //console.log(cdfs)
            //mapHE(dataBuffer, max)

        }

        let mapCLHE = (imageData, max) => {
            let dataBuffer = imageData.data
            let dims = imageData.dims

            let histogram = new Uint32Array(max).fill(0)


            for (let i = 0; i < dataBuffer.length; i++) {
                histogram[dataBuffer[i]]++
            }

            let limit = dataBuffer.length / max

            contrastLimit(histogram, limit)

            equalization(histogram, max)

            for (let i = 0; i < dataBuffer.length; i++) {
                dataBuffer[i] = chistogramdf[dataBuffer[i]]
            }
        }

        let mapHE = (imageData, max) => {
            let dataBuffer = imageData.data

            let histogram = new Uint32Array(max).fill(0)

            for (let i = 0; i < dataBuffer.length; i++) {
                histogram[dataBuffer[i]]++
            }

            equalization(histogram, max)

            for (let i = 0; i < dataBuffer.length; i++) {
                dataBuffer[i] = histogram[dataBuffer[i]]
            }
        }
    }
}

class BrushTools extends SegTools {
    constructor(state, maskImages) {
        super(state)

        this.mode = {
            NONE: -1,
            MARK: 0,
            ERASER: 1,
            '3DMARK': 2,
            '3DERASER': 3
        }

        this.selectedMode = this.mode.MARK
        this.maskImages = maskImages
        this._radius = 5
        this._radius3D = []

        this.updateRaius3D = () => {
            this._radius3D = new Array()

            for (let i = 0; i < this.radius; i++) {
                let r = Math.pow(this.radius, 2) - Math.pow(this.radius - i, 2)
                r = Math.sqrt(r)
                this._radius3D.push(r)
            }

            this._radius3D.push(this.radius)

            for (let i = this.radius - 1; i >= 0; i--) {
                this._radius3D.push(this._radius3D[i])
            }

            //console.log(this._radius3D)
        }

        this.updateRaius3D()

        let penPosition = []
        let fIndex = -1
        let color = '#000000'
        let mouseMoveEvent = new Event('mousemove')

        maskImages.forEach((mimg, axis) => {
            let selectedMode = 0

            let process = () => {

                if (this.selectedMode == this.mode.MARK) {
                    let segment = this.state.focusedSegment

                    mimg.setMaskTrack(fIndex, penPosition, this.radius, color, false)
                    let data = mimg.getLayerImage(fIndex)

                    segment.binaryWriter(axis, mimg.index, data)
                    segment.binaryLoader(axis, mimg.index, data)

                    mimg.setLayerImage(fIndex, data, color)
                }

                else if (this.selectedMode == this.mode['3DMARK']) {
                    for (let i = 0; i < this._radius3D.length; i++) {
                        let r = this._radius3D[i]
                        let index = Math.round(fIndex - this.radius + i)
                        mimg.setMaskTrack(index, penPosition, r, color, false)
                    }
                }

                else if (this.selectedMode == this.mode.ERASER) {
                    let segment = this.state.focusedSegment

                    mimg.setMaskTrack(fIndex, penPosition, this.radius, color, true)
                    let data = mimg.getLayerImage(fIndex)

                    segment.binaryWriter(axis, mimg.index, data)
                    mimg.setLayerImage(fIndex, data, color)
                }
            }

            mimg.controller.addEventListener('pointerdown', (evt) => {
                if (!this.enable) {
                    return
                }

                //檢查滑鼠按鍵狀態
                if (evt.buttons == 1 && evt.button == 0) {
                    this.onstart()
                    selectedMode = 1
                    process()
                }

            })

            mimg.controller.addEventListener('pointermove', (evt) => {
                if (!this.enable) {
                    return
                }

                penPosition = getMousePos(mimg.controller, evt)

                mimg.clearControllerTrack()
                mimg.setControllerTrack(penPosition, this.radius, 'rgba(255,255,255,0.6)')

                if (selectedMode != 1) {
                    return
                }

                //檢查滑鼠按鍵狀態
                if (evt.buttons == 1 && evt.button == -1) {
                    process()
                    mimg.update()
                }
            })

            mimg.controller.addEventListener('pointerenter', (evt) => {
                if (!this.enable) {
                    return
                }

                fIndex = this.state.focusedSegIndex
                color = this.state.segments[fIndex].color

                mimg.clearControllerTrack()
            })

            mimg.controller.addEventListener('pointerleave', (evt) => {
                if (!this.enable) {
                    return
                }

                mimg.clearControllerTrack()
            })


            window.addEventListener('pointerup', (evt) => {
                if (!this.enable) {
                    return
                }

                if (selectedMode == 0) {
                    return
                }

                this.onload()

                selectedMode = 0
            })
        })
    }

    get radius() {
        return this._radius
    }

    set radius(r) {
        this._radius = r
        this.updateRaius3D()
    }
}

class LogicTools extends SegTools {
    constructor(state) {
        super(state)
        this.mode = {
            NONE: -1,
            INTERSECTION: 0,
            EXCLUSIVE: 1,
            UNION: 2,
            BOOLEAN: 3,
            COPY: 4,
            OVERLAY_TRUE: 5,
            OVERLAY_FALSE: 6
        }
        this.selectedMode = this.mode.INTERSECTION
    }

    process = (sIndex) => {
        if (!this.enable) {
            return
        }

        let segment = this.state.focusedSegment
        let index = this.state.focusedSegIndex

        if (index == null || sIndex == -1 || index == sIndex) {
            //console.log(index, sIndex)
            return
        }

        if (sIndex >= this.state.segments.length || sIndex < 0) {
            //console.log(1)
            return
        }

        this.onstart()

        let sData = this.state.segments[sIndex].data
        let dData = segment.data
        //console.log(this.selectedMode)
        switch (this.selectedMode) {
            case this.mode.INTERSECTION:
                Logic.intersection(sData, dData)
                break
            case this.mode.EXCLUSIVE:
                Logic.exclusive(sData, dData)
                break
            case this.mode.UNION:
                Logic.union(sData, dData)
                break
            case this.mode.BOOLEAN:
                Logic.boolean(sData, dData)
                break
            case this.mode.COPY:
                Logic.copy(sData, dData)
                break
            case this.mode.OVERLAY_TRUE:
                Logic.overlay(sData, dData, true)
                break
            case this.mode.OVERLAY_FALSE:
                Logic.overlay(sData, dData, false)
                break
            default:
                break
        }

        this.onload()
    }
}

class FilterTools extends SegTools {
    constructor(state) {
        super(state)
        this.mode = {
            ERODE: 0,
            DILATE: 1,
            MEDIUM: 2,
            GAUSSIAN: 3,
            CLOSE: 4,
            OPEN: 5,
            EDGEDETECTION: 6
        }
        this.selectedMode = this.mode.ERODE
        this.psize = 1
    }

    process = async () => {

        return new Promise(async (resolve, reject) => {
            if (!this.enable) {
                reject()
                return
            }

            let operation = new Kernel()

            let index = this.state.focusedSegIndex
            let segment = this.state.focusedSegment

            if (index == -1 || segment == null) {
                return
            }

            this.onstart()

            switch (this.selectedMode) {
                case this.mode.ERODE:
                    await operation.erode(segment)
                    break
                case this.mode.DILATE:
                    await operation.dilate(segment)
                    break
                case this.mode.MEDIUM:
                    await operation.medium(segment, this.psize)
                    break
                case this.mode.GAUSSIAN:
                    await operation.gaussian(segment, this.psize)
                    break
                case this.mode.OPEN:
                    await operation.open(segment, this.psize)
                    break
                case this.mode.CLOSE:
                    await operation.close(segment, this.psize)
                    break
            }

            this.onload()
            resolve()
        })

    }
}

class GrowingTools extends SegTools {
    constructor(state, maskImages) {
        super(state)
        this.mode = {
            NORMAL: -1,
            PRESERVE: 0,
            REMOVE: 1,
            GROW: 2,
            SHRINK: 3,
            BALLOON: 4,
            EXCLUDE: 5,
            REGION: 6,
            BORDER: 7
        }

        this.selectedMode = this.mode.NORMAL
        this.bias = 0
        this.margin = 0

        maskImages.forEach((mimg, index) => {
            mimg.controller.addEventListener('click', (evt) => {
                if (!this.enable) {
                    return
                }

                let pos = getMousePos(mimg.controller, evt)
                switch (index) {
                    case axisUV:
                        this.process(pos[0], pos[1], mimg.index)
                        break
                    case axisUD:
                        this.process(pos[0], mimg.index, pos[1])
                        break
                    case axisVD:
                        this.process(this.state.baseSegment.dims[0] - mimg.index - 1, pos[0], pos[1])
                        break
                    default:
                        break
                }
            })
        })

        let algorithm, dims, result

        this.process = (x, y, layerIndex) => {
            //console.log(this.selectedMode)
            if (!this.enable) {
                return
            }

            let index = this.state.focusedSegIndex
            let segment = this.state.focusedSegment

            if (index == -1 || segment == null) {
                return
            }

            let segData = segment;
            let baseData = this.state.baseSegment.data;
            let maxVal = 2 ** this.state.info.bitsStored
            let diff = this.bias * maxVal

            if (algorithm == null) {
                dims = this.state.baseSegment.dims;
                algorithm = new Growing(dims);
                result = new BinaryArray(segData.length);
            }

            result.clear();

            this.onstart();

            let checkExist = () => {
                let index = layerIndex * dims[1] * dims[0] + y * dims[0] + x;
                if (segData.getBit(index) == 0) {
                    console.log('No target');
                    return false;
                }
                return true;
            };

            let algo_type = algorithm.regionGrowing;
            if (this.type === this.mode.BORDER)
                algo_type = algorithm.edgeDetector;

            switch (this.selectedMode) {
                case this.mode.NORMAL:
                    algo_type(x, y, layerIndex, baseData, diff, this.margin, null, segData);

                    break
                case this.mode.PRESERVE:
                    if (!checkExist) {
                        return;
                    }

                    algorithm.regionPreserve(x, y, layerIndex, segData, this.margin, null, result);

                    //segData.copyfrom(result);
                    break;
                case this.mode.REMOVE:
                    if (!checkExist) {
                        return;
                    }

                    algorithm.regionRemove(x, y, layerIndex, segData, this.margin, null, result)
                    //Logic.boolean(result, segData.data)
                    break
                case this.mode.GROW:
                    break
                case this.mode.SHRINK:
                    break
                case this.mode.EXCLUDE:
                    algorithm.holeFilling(x, y, layerIndex, baseData, segData, diff, this.margin, null, segData)
                    break
                default:
                    console.error('Function not supporet.')
                    break
            }
            //Logic.boolean(maskData, segData)
            this.onload()
        }

    }


}

class ChanVeseTools extends SegTools {
    constructor(state) {
        super(state)

        let mask2phi = (option) => {
            //option == 0:background
            //option == 1:foreground
            return bwdist(option) - bwdist(1 - option) + option - 0.5
        }

        /** 
            this is an intermediary function, 'a' has only True, False vals, 
            so we convert them into 0, 1 values -- in reverse. True is 0, 
            False is 1, distance_transform_edt wants it that way.
        */

        let dis2Zero = () => {

        }

        let bwdist = (data, width, height) => {
            let tmp = new Array(a.length).fill(true)
            for (let i = 0; i < tmp.length; i++) {
                if (a[i] == 0) {
                    tmp[i] = false
                }
                else if (dis2Zero(a[i]) == 1) {
                    tmp[i] = false
                }
            }

            let distTrans = new cv.Mat();
            let img = cv.matFromArray(width, height, cv.CV_32FC1, data)
            // distance transform
            cv.distanceTransform(img, distTrans, cv.DIST_L2, 5);
            cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
            return nd.distance_transform_edt(a == 0)
        }


        this.process = (max_iter, alpha, thres) => {
            if (!this.enable) {
                return
            }

            let index = this.state.focusedSegIndex
            let segment = this.state.focusedSegment

            if (index == -1 || segment == null) {
                return
            }

            iter = 0
            stop = false
            while (iter < max_iter && !stop) {
                iter++
            }
        }
    }
}

class CropTools extends SegTools {
    constructor(state, maskImages) {
        super(state)
        this.mode = {
            RESET: -1,
            SPHERE: 0,
            BOX: 1,
            CYLINDER: 2,
            CUSTOMIZE: 3,
            ACM: 4,
            BALLOON: 5
        }
        this.ratio = 1
        this.selectedMode = this.mode.SPHERE
        let backup = new Segment('backup', [1, 1, 1], null, false)

        let prebuildShape = null
        let pDims = new Array(3)

        let parameter = {
            box: {
                front: 0,
                back: 0,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            },
            sphere: {
                radius: 0,
                x: 0,
                y: 0,
                z: 0
            },
            cylinder: {
                radius: 0,
                x: 0,
                y: 0,
                top: 0,
                bottom: 0
            },
            balloon: {
                size: 0,
                x: 0,
                y: 0,
                z: 0
            },
            customize: new Uint8Array()
        }

        this.setBoxBorder = (front, back, left, right, top, bottom) => {
            parameter.box.front = front
            parameter.box.back = back
            parameter.box.left = left
            parameter.box.right = right
            parameter.box.top = top
            parameter.box.bottom = bottom
        }

        this.setSphereBorder = (radius, x, y, z) => {
            parameter.sphere.radius = radius
            parameter.sphere.x = x
            parameter.sphere.y = y
            parameter.sphere.z = z
        }

        this.setCylinderBorder = (radius, x, y, top, bottom) => {
            parameter.cylinder.radius = radius
            parameter.cylinder.x = x
            parameter.cylinder.y = y
            parameter.cylinder.top = top
            parameter.cylinder.bottom = bottom
        }

        this.setBalloonBorder = (size, x, y, z) => {
            parameter.balloon.size = size
            parameter.balloon.x = x
            parameter.balloon.y = y
            parameter.balloon.z = z
        }

        this.getBoxBorder = () => {
            return parameter.box
        }

        this.getSphereBorder = () => {
            return parameter.sphere
        }

        this.getCylinderBorder = () => {
            return parameter.cylinder
        }

        this.getBalloonBorder = () => {
            return parameter.balloon
        }

        //ACM border
        let points = []

        let squarePolar = (point, centre) => {
            return [
                Math.atan2(point.y - centre.y, point.x - centre.x),
                (point.x - centre.x) ** 2 + (point.y - centre.y) ** 2
            ]
        }

        maskImages.forEach((mimg, index) => {
            mimg.controller.addEventListener('click', (evt) => {

                if (!this.enable) {
                    return
                }

                if (this.selectedMode != this.mode.CUSTOMIZE && this.selectedMode != this.mode.ACM) {
                    return
                }

                if (evt.button == 0) {
                    let pos = getMousePos(mimg.controller, evt)

                    points.push({ x: pos[0], y: pos[1] })

                    let centre = {
                        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
                        y: points.reduce((sum, p) => sum + p.y, 0) / points.length
                    }


                    for (let point of points) {
                        point.tmp = squarePolar(point, centre)
                    }

                    points.sort((a, b) => a.tmp[0] - b.tmp[0] || a.tmp[1] - b.tmp[1])

                    mimg.clearControllerTrack()
                    mimg.updateBorder(points)
                }

            })

            mimg.controller.addEventListener('contextmenu', (evt) => {

                if (!this.enable) {
                    return
                }

                evt.preventDefault()
                points = []
                mimg.clearControllerTrack()
            })
        })

        let maskUpCylinder = function (volDims, spacing, mask) {

            let p = parameter.cylinder
            let r = Math.round(volDims[0] * p.radius / 2)
            let i, j, k, iStep, jStep, limit_j
            let UD = [p.top * volDims[2], p.bottom * volDims[2]]
            let centerx = Math.round(p.x * volDims[0])
            let centery = Math.round(p.y * volDims[1])

            UD[0] = Math.round(UD[0])
            UD[1] = Math.round(UD[1])
            UD.sort()

            for (i = UD[0]; i < UD[1]; i++) {
                for (j = centery - r, iStep = i * volDims[1] * volDims[0]; j < centery + r; j++) {
                    if (j < 0 || j >= volDims[1]) {
                        continue
                    }

                    limit_j = Math.pow(r, 2) - Math.pow(j - centery, 2)
                    limit_j = Math.sqrt(limit_j)
                    limit_j = Math.round(limit_j) * spacing[1] / spacing[0]

                    for (k = centerx - limit_j, jStep = j * volDims[0]; k < centerx + limit_j; k++) {
                        if (k < 0 || k >= volDims[0]) {
                            continue
                        }
                        //console.log(j)
                        mask[iStep + jStep + k] = 1
                    }
                }
            }

        }

        let maskUpBox = function (volDims, mask) {
            let i, j, k, iStep, jStep

            let p = parameter.box
            let UD = [Math.round(p.top * volDims[2]), Math.round(p.bottom * volDims[2])]
            let LR = [Math.round(p.left * volDims[0]), Math.round(p.right * volDims[0])]
            let FB = [Math.round(p.front * volDims[1]), Math.round(p.back * volDims[1])]

            let compare = (a, b) => {
                return a - b
            }

            UD.sort(compare)
            LR.sort(compare)
            FB.sort(compare)

            for (i = UD[0]; i < UD[1]; i += 1) {
                iStep = i * volDims[1] * volDims[0]
                for (j = FB[0]; j < FB[1]; j += 1) {
                    jStep = j * volDims[0]
                    for (k = LR[0]; k < LR[1]; k += 1) {
                        mask[iStep + jStep + k] = 1
                    }
                }
            }

        }

        let maskUpSphere = function (volDims, spacing, mask) {
            let p = parameter.sphere
            let centerx = p.x * volDims[0]
            let centery = p.y * volDims[1]
            let centerz = p.z * volDims[2]

            let max = Math.max(volDims[0] * spacing[0], volDims[1] * spacing[1], volDims[2] * spacing[2])
            let r = parseInt(max / 2 * p.radius) / spacing[2]
            let limit_i, limit_j
            let i, j, k, iStep, jStep

            for (i = centerz - r; i < centerz + r; i++) {
                if (i < 0 || i >= volDims[2]) {
                    continue
                }
                limit_i = Math.pow(r, 2) - Math.pow(i - centerz, 2)
                limit_i = Math.sqrt(limit_i)
                limit_i = parseInt(limit_i) * spacing[2] / spacing[1]

                for (j = centery - limit_i, iStep = parseInt(i) * volDims[1] * volDims[0]; j < centery + limit_i; j++) {
                    if (j < 0 || j >= volDims[1]) {
                        continue
                    }
                    limit_j = Math.pow(limit_i, 2) - Math.pow(j - centery, 2)
                    limit_j = Math.sqrt(limit_j)
                    limit_j = parseInt(limit_j) * spacing[1] / spacing[0]

                    for (k = centerx - limit_j, jStep = parseInt(j) * volDims[0]; k < centerx + limit_j; k++) {
                        if (k < 0 || k >= volDims[0]) {
                            continue
                        }
                        //console.log(j)
                        mask[iStep + jStep + parseInt(k)] = 1
                    }
                }
            }

        }

        let maskUpBalloon = (volDims, spacing, mask) => {
            let p = parameter.balloon
            let size = p.size

            let tmpSize = [
                Math.round(pDims[0] * size),
                Math.round(pDims[1] * size),
                Math.round(pDims[2] * size)
            ]

            /**
            let xDiff = (p.x - 0.5) * volDims[0]
            let yDiff = (p.y - 0.5) * volDims[1]
            let zDiff = (p.z - 0.5) * volDims[2]

            let xStart = volDims[0] * 0.5 - tmpSize[0] * 0.5 + xDiff
            let yStart = volDims[1] * 0.5 - tmpSize[1] * 0.5 + yDiff
            let zStart = volDims[2] * 0.5 - tmpSize[2] * 0.5 + zDiff

             */

            let xStart = p.x * volDims[0] - tmpSize[0] * 0.5
            let yStart = p.y * volDims[1] - tmpSize[1] * 0.5
            let zStart = p.z * volDims[2] - tmpSize[2] * 0.5

            let xEnd = p.x * volDims[0] + tmpSize[0] * 0.5
            let yEnd = p.y * volDims[1] + tmpSize[1] * 0.5
            let zEnd = p.z * volDims[2] + tmpSize[2] * 0.5

            xStart = xStart >= 0 ? Math.round(xStart) : 0
            yStart = yStart >= 0 ? Math.round(yStart) : 0
            zStart = zStart >= 0 ? Math.round(zStart) : 0

            xEnd = xEnd >= volDims[0] ? volDims[0] : Math.round(xEnd)
            yEnd = yEnd >= volDims[1] ? volDims[1] : Math.round(yEnd)
            zEnd = zEnd >= volDims[2] ? volDims[2] : Math.round(zEnd)

            let tiDiff = Math.round(tmpSize[2] - zEnd + zStart)
            let tjDiff = Math.round(tmpSize[1] - yEnd + yStart)
            let tkDiff = Math.round(tmpSize[0] - xEnd + xStart)

            let iStep, jStep, tiStep, tjStep
            let sample = 1 / size

            console.log(sample)

            for (let i = zStart, ti = tiDiff; i < zEnd; i++, ti++) {

                iStep = Math.round(i) * volDims[1] * volDims[0]
                tiStep = Math.round(ti * sample) * pDims[1] * pDims[0]

                for (let j = yStart, tj = tjDiff; j < yEnd; j++, tj++) {

                    jStep = Math.round(j) * volDims[0]
                    tjStep = Math.round(tj * sample) * pDims[0]

                    for (let k = xStart, tk = tkDiff; k < xEnd; k++, tk++) {
                        mask[iStep + jStep + Math.round(k)] = prebuildShape[tiStep + tjStep + Math.round(tk * sample)]
                    }
                }
            }

        }


        let mask = null
        //deprecated
        let buildMask = function (volDims) {
            let arraySize = volDims[0] * volDims[1] * volDims[2]

            //檢查遮罩大小，重複利用資源以減少開銷
            if (mask == null || mask.length != arraySize) {
                return new Float32Array(arraySize).fill(0)
            }
            else {
                return mask.fill(0)
            }
        }

        let initPrebuildShape = () => {

            let xhr = new XMLHttpRequest()
            xhr.responseType = 'arraybuffer'
            xhr.open('GET', './template/prebuild.ptn', true)
            xhr.onload = (e) => {
                if (xhr.readyselectedMode != 4 || xhr.status != 200) {
                    return
                }

                let result = xhr.response

                if (prebuildShape == null) {
                    prebuildShape = new Uint8Array();
                }

                prebuildShape.set(result);
            }
            xhr.send()
        }

        this.process = () => {
            if (!this.enable) {
                return
            }

            if (this.state.baseSegment == null) {
                return
            }

            if (this.selectedMode == this.mode.RESET && backup == null) {
                return
            }

            this.onstart()

            this.state.option = 0
            let segment = this.state.baseSegment
            let data = segment.data
            let dims = segment.dims
            let mask = segment.backData

            mask.fill(0)

            switch (this.selectedMode) {
                case this.mode.SPHERE:
                    maskUpSphere(dims, this.state.info.spacing, mask)
                    break
                case this.mode.BOX:
                    maskUpBox(dims, mask)
                    break
                case this.mode.CYLINDER:
                    maskUpCylinder(dims, this.state.info.spacing, mask)
                    break
                case this.mode.CUSTOMIZE:
                    //mask = maskUpSphere(dims, this.ratio, this.state.info.spacing)
                    break
                case this.mode.ACM:
                    break
                case this.mode.BALLOON:
                    maskUpBalloon(dims, this.state.info.spacing, mask)
                    break
                case this.mode.RESET:
                    //deprecated
                    break
            }

            console.log(mask)

            //剪裁影像範圍
            for (let i = 0; i < data.length; i++) {
                if (mask[i] == 0) {
                    data[i] = 0
                }
            }

            this.onload()
        }

        this.revert = () => {

        }

        this.reset = () => {
            this.state.baseDataReset()
            this.state.generate()
            this.onload()
        }

        initPrebuildShape()
    }
}

class SizeBasedTools extends SegTools {
    constructor(state, domElement) {
        super(state)

        let sb = null
        let sizeData = state.sizeData
        let rgba = state.colorSetting.rgba
        let imageData = state.baseSegment

        this.process = () => {
            this.onstart()

            let data = imageData.thumbnail
            let dims = imageData.thumbnailSize

            let onprogress = (_, p) => {
                console.log(p)
            }

            let onload = () => {
                console.log('finished')
                this.onload()
            }

            if (sb == null) {
                sb = new SizeBased(dims, data, sizeData, rgba)
            }

            sb.process(onprogress, onload)
        }

    }


}

class ScissorTools extends SegTools {
    constructor(state, domElement) {
        super(state)

        this.domElement = domElement
        this.canvas = document.createElement('canvas')
        this.canvas.width = domElement.clientWidth
        this.canvas.height = domElement.clientHeight
        this.canvas.classList.add('paintingViewer')
        this.context = this.canvas.getContext('2d')

        this.domElement.appendChild(this.canvas)
        this.__enable = false
        let selectedMode = 0
        let color = 'rgba(255,0,0,0.2)'
        let penPos = [0, 0]
        let radius = 5
        //console.log(this)
        this.canvas.addEventListener('mousedown', () => {
            if (!this.enable) {
                return
            }

            selectedMode = 1
        })

        this.canvas.addEventListener('mousemove', (evt) => {

            if (!this.enable) {
                return
            }

            if (selectedMode == 1) {
                penPos = getMousePos(this.canvas, evt)
                this.context.fillStyle = color
                this.context.beginPath()
                this.context.arc(penPos[0], penPos[1], radius, 0, Math.PI * 2, 1)
                this.context.fill()
            }
        })

        window.addEventListener('mouseup', () => {
            if (!this.enable) {
                return
            }

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
            selectedMode = 0
        })

        window.addEventListener('resize', () => {
            this.canvas.width = domElement.clientWidth
            this.canvas.height = domElement.clientHeight
        })
    }



    set enable(option) {
        if (this.canvas == null) {
            return
        }

        this.__enable = option
        if (option) {
            this.canvas.style.display = 'block'
        }
        else {
            this.canvas.style.display = 'none'
        }
    }

    get enable() {
        return this.__enable
    }

    process(camera, img) {
        if (!this.enable) {
            return
        }

        let dims = this.state.baseSegment.dims
        let ss = new Scissor(dims)
        let mask = ss.process(camera, img)

        let seg = this.getFocusedSegment()

        if (seg == null) {
            return
        }

        let segData = seg.data

        this.onstart()

        Logic.union(segData, mask)

        this.onload()
    }
}

class ThresholdTools extends SegTools {
    constructor(state) {
        super(state)
        this.mode = {
            MANUAL: 0,
            AUTO: 1
        }
        this.selectedMode = 0
        this.l_limit = 0
        this.r_limit = 0

        let scalar = 2 ** this.state.info.bitsStored
        let scalar_1 = 2 ** this.state.info.bitsStored - 1

        let otsu = (histogram, total) => {

            let sum = 0;
            for (let i = 1; i < histogram.length; ++i)
                sum += i * histogram[i];
            let sumB = 0;
            let wB = 0;
            let wF = 0;
            let mB;
            let mF;
            let max = 0;
            let between = 0;
            let threshold1 = 0;
            let threshold2 = 0;

            for (let i = 0; i < histogram.length; ++i) {
                wB += histogram[i];
                if (wB == 0)
                    continue;
                wF = total - wB;
                if (wF == 0)
                    break;
                sumB += i * histogram[i];
                mB = sumB / wB;
                mF = (sum - sumB) / wF;
                between = wB * wF * (mB - mF) * (mB - mF);
                if (between >= max) {
                    threshold1 = i;
                    if (between > max) {
                        threshold2 = i;
                    }
                    max = between;
                }

            }

            return (threshold1 + threshold2) / 2.0;
        }

        this.getAutoValue = () => {
            let baseData = this.state.baseSegment.data

            let histogram = new Array(scalar).fill(0)
            let cvtColor = 0
            let total = baseData.length

            for (let i = 0; i < baseData.length; i++) {
                cvtColor = Math.round(baseData[i])
                histogram[cvtColor]++
            }

            return otsu(histogram, total) / scalar_1
        }

        this.process = () => {
            if (!this.enable)
                return

            let index = this.state.focusedSegIndex
            let segment = this.state.focusedSegment

            if (index == -1 || segment == null)
                return

            let baseData = this.state.baseSegment.data
            let segData = segment.data

            this.onstart()

            switch (this.selectedMode) {
                case this.mode.MANUAL:
                    for (let i = 0; i < baseData.length; i++) {
                        segData.setValue(0, i);
                        if (baseData[i] >= (this.l_limit * scalar_1) && baseData[i] <= (this.r_limit * scalar_1)) {
                            segData.setValue(1, i);
                        }
                    }
                    break
                case this.mode.AUTO:

                    let thres = this.getAutoValue()

                    for (let i = 0; i < baseData.length; i++) {
                        segData.setValue(0, i);
                        if (baseData[i] >= thres) {
                            segData.setValue(1, i);

                        }
                    }
                    break
                default:
                    break
            }
            this.onload()
        }

       
    }

}

class ListControlTools extends SegTools {
    constructor(state, maskImages) {
        super(state, true)
        this.mode = {
            CREATE: 0,
            REMOVE: 1,
            MOVEUP: 2,
            MOVEDOWN: 3,
            MOVETOP: 4,
            MOVEBOTTOM: 5
        }
        this.colorList = ['#FF0000', '#00FF00', '#0000FF', '#F0F0F0', '#0F0F0F']

        let create = () => {
            console.log(state)
            if (this.state.baseSegment == null) {
                alert('image data not load!')
                return false
            }

            this.onstart(true)

            let color = this.colorList[this.state.segments.length % this.colorList.length]
            let dims = [...this.state.baseSegment.dims]
            let newSeg = new Segment('Segment', dims, color, true, true)
            this.state.segments.splice(this.state.focusedSegIndex + 1, 0, newSeg)
            this.state.focusedSegIndex++

            this.onload()

            maskImages.forEach((mimg) => {
                mimg.addLayer()
            })

            return true
        }

        let remove = () => {
            let index = this.state.focusedSegIndex

            if (index == -1) {
                return false
            }

            this.onstart(false)

            this.state.segments.splice(index, 1)
            this.state.focusedSegIndex--

            this.onload()

            maskImages.forEach((mimg) => {
                mimg.removeLayer(index)
            })

            return true
        }

        let moveUp = () => {
            let index = this.state.focusedSegIndex

            if (index < 1) {
                return false
            }

            this.onstart()

            let tmp = this.state.segments[index - 1]
            this.state.segments[index - 1] = this.state.segments[index]
            this.state.segments[index] = tmp

            this.onload()

            return true
        }

        let moveDown = () => {
            let index = this.state.focusedSegIndex

            if (index == -1 || index == this.state.segments.length - 1) {
                return false
            }

            this.onstart()

            let tmp = this.state.segments[index + 1]
            this.state.segments[index + 1] = this.state.segments[index]
            this.state.segments[index] = tmp

            this.onload()

            return true
        }

        let moveTop = () => {
            if (index < 1) {
                return false
            }

            this.onstart()

            let tmp = this.state.segments[index]
            this.state.segments.splice(index, 1)
            this.state.segments.splice(0, 0, tmp)

            this.onload()

            return true
        }

        let moveBottom = () => {
            let index = this.state.focusedSegIndex

            if (index == -1 || index == this.state.segments.length - 1) {
                return false
            }

            this.onstart()

            let tmp = this.state.segments[index]
            this.state.segments.splice(index, 1)
            this.state.segments.splice(this.state.segments.length, 0, tmp)

            this.onload()

            return true
        }

        this.process = () => {
            if (!this.enable) {
                return
            }

            switch (this.selectedMode) {
                case this.mode.CREATE:
                    create()
                    break
                case this.mode.REMOVE:
                    remove()
                    break
                case this.mode.MOVEUP:
                    moveUp()
                    break
                case this.mode.MOVEDOWN:
                    moveDown()
                    break
                case this.mode.MOVETOP:
                    moveTop()
                    break
                case this.mode.MOVEBOTTOM:
                    moveBottom()
                    break
            }

        }
    }
}

class Plot {

    static getInstance = function () {
        return new Histogram()
    }

    constructor() {
        // set the dimensions and margins of the graph
        let margin = { top: 10, right: 10, bottom: 20, left: 60 }

        this.loadView = function (domElement, data, colormap) {

            domElement.innerHTML = ''

            let width = domElement.clientWidth - margin.left - margin.right
            let height = domElement.clientHeight - margin.top - margin.bottom

            // append the svg object to the specified element
            let svg = d3.select('#' + domElement.id)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform',
                    'translate(' + margin.left + ',' + margin.top + ')');

            // X axis: scale and draw:
            let x = d3.scaleLinear()
                .domain([1, 256])     // except 0 value pixels
                .range([0, width]);

            svg.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(d3.axisBottom(x));

            // Y axis: scale and draw:
            let y = d3.scaleLinear()
                .range([height, 0])
                .domain([0, d3.max(dataY, function (d) { return d.length; })]);

            svg.append('g')
                .call(d3.axisLeft(y).tickFormat(d3.format('d')));

            // append the bar rectangles to the svg element
            svg.selectAll('rect')
                .data(data)
                .enter()
                .append('circle')
                .attr('class', 'dot')
                .attr('r', '1')
                .attr('cx', function (d) {

                })
                .attr('cy', function (d) {

                })
                .style('fill', function (d, i) {
                    let hex = colormap[i].toString(16)
                    if (i < 16) {
                        hex = '0' + hex
                    }
                    return '#' + hex + hex + hex
                })
        }
    }
}

class Histogram {

    static instance = null

    static getInstance = function () {
        if (Histogram.instance == null) {
            Histogram.instance = new Histogram()
        }
        return Histogram.instance
    }

    constructor() {
        // set the dimensions and margins of the graph
        const markerRange = 10
        const totalMarkerCount = 25
        let margin = { top: 10, right: 10, bottom: 20, left: 30 }
        let marker = []
        let colormap = new Array(256).fill(0).map((value, index) => {
            return index
        })

        let convertHex = function (value) {
            if (value < 16) {
                return '0' + value.toString(16)
            }

            return value.toString()
        }

        this.loadView = function (domElement, data, logEnable = false) {

            domElement.innerHTML = ''

            let width = domElement.clientWidth - margin.left - margin.right
            let height = domElement.clientHeight - margin.top - margin.bottom

            // append the svg object to the specified element
            let svg = d3.select('#' + domElement.id)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform',
                    'translate(' + margin.left + ',' + margin.top + ')');

            // X axis: scale and draw:
            let x = d3.scaleLinear()
                .domain([1, 256])     // except 0 value pixels
                .range([0, width]);

            let repaint = function () {
                d3.selectAll()

            }

            let drag = d3.drag()
                .on('drag', function (evt) {
                    let pos = d3.pointer(evt, this)[0]
                    let step = markerRange * width / 255
                    if (pos > step && pos < width - step) {
                        d3.select(this).style('x', pos)
                    }
                })

            svg.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(d3.axisBottom(x));

            // set the parameters for the histogram
            let histogram = d3.bin()
                .domain(x.domain())
                .thresholds(x.ticks(256));

            // apply this function to data to get the bins
            console.log()
            let bins = histogram(data);

            // Y axis: scale and draw:
            let y = d3.scaleLinear()
                .range([height, 0])
                .domain([0, d3.max(bins, function (d) {
                    if (logEnable) {
                        return Math.log(d.length + 1);
                    }
                    return d.length;
                })]);

            svg.append('g')
                .call(d3.axisLeft(y).tickFormat(d3.format('d')));

            // append the bar rectangles to the svg element
            svg.selectAll('rect')
                .data(bins)
                .enter()
                .append('rect')
                .attr('transform', function (d) {
                    let trans_y = d.length

                    if (logEnable) {
                        trans_y = Math.log(trans_y + 1)
                    }

                    return 'translate(' + x(d.x0) + ',' + y(trans_y) + ')';
                })
                .attr('width', function (d) { return x(d.x1) - x(d.x0); })
                .attr('height', function (d) {

                    let trans_y = d.length

                    if (logEnable) {
                        trans_y = Math.log(trans_y + 1)
                    }

                    return height - y(trans_y)
                })
                .style('fill', function (d, i) {
                    //console.log(colormap)
                    let hex = colormap[i].toString(16)
                    if (i < 16) {
                        hex = '0' + hex
                    }
                    return '#' + hex + hex + hex
                })
        }
    }
}

class TransferTools2 extends SegTools {
    constructor(state, domElement) {
        super(state)
        this.__enable = false
        this.mode = {
            GRADIENT: 0,
            SIZEDATA: 1,
            COLORMAP: 2,
            DEFAULT: 3,
            APPLY: 4
        }

        this.magData = null
        this.domElement = domElement
        this.domElement.style.position = 'relative'

        // 二維transfer function的視圖大小
        this.xLength = 256
        this.yLength = 256

        let histogram = new Float32Array(this.xLength * this.yLength)

        // 二維transfer function視圖
        let transferCanvas = document.createElement('canvas')
        transferCanvas.style = 'width:100%;height:100%;'
        transferCanvas.width = this.xLength
        transferCanvas.height = this.yLength
        domElement.appendChild(transferCanvas)

        // user交互標記視圖，用來呈現鼠標選取的範圍
        let markCanvas = document.createElement('canvas')
        markCanvas.style = 'width:100%;height:100%;position:absolute;top:0px;left:0px;'
        markCanvas.width = this.xLength
        markCanvas.height = this.yLength
        domElement.appendChild(markCanvas)

        // 選取範圍標記
        let markerDiv = document.createElement('div')
        markerDiv.style = 'width:100%;height:100%;position:absolute;top:0px;left:0px;'
        domElement.appendChild(markerDiv)

        let markers = []
        let selected = null

        // 設置畫板為'2d'屬性畫板
        this.markContext = markCanvas.getContext('2d')
        this.displayContext = transferCanvas.getContext('2d')

        // 取得畫布
        let ctxData = this.displayContext.getImageData(0, 0, this.xLength, this.yLength);

        let resetRect = (ctx) => {
            ctx.save()
            ctx.clearRect(0, 0, markCanvas.width, markCanvas.height)
            ctx.rect(0, 0, markCanvas.width, markCanvas.height)
            ctx.fillStyle = 'rgba(0,0,0,0.9)'
            ctx.fill()
            ctx.restore()
        }

        let updatePath = () => {
            if (markers.length <= 0) {
                return
            }

            resetRect(this.markContext)

            this.markContext.save()
            this.markContext.fillStyle = 'rgba(0,0,0,0)'
            this.markContext.strokeStyle = '#e59acb'
            this.markContext.lineWidth = 4

            this.markContext.beginPath()

            this.markContext.moveTo(markers[0].coordinate[0], markers[0].coordinate[1])

            for (let i = 1; i < markers.length; i++) {
                this.markContext.lineTo(markers[i].coordinate[0], markers[i].coordinate[1])
            }

            this.markContext.closePath()
            this.markContext.stroke()
            this.markContext.fill()

            this.markContext.restore()
        }

        let pushMarker = (posX, posY, cposX, cposY) => {
            let marker = {
                item: document.createElement('input'),
                coordinate: [0, 0]
            }

            marker.item.type = 'radio'
            marker.item.style.width = '24px'
            marker.item.style.height = '24px'
            marker.item.style.position = 'absolute'
            marker.item.style.filter = 'hue-rotate(313deg)'
            marker.item.checked = true

            marker.setPosition = (posX, posY, cposX, cposY) => {
                marker.item.style.left = (posX - 12) + 'px'
                marker.item.style.top = (posY - 12) + 'px'

                marker.coordinate[0] = cposX
                marker.coordinate[1] = cposY

                //console.log(posX, posY, cposX, cposY)
            }

            marker.setPosition(posX, posY, cposX, cposY)

            markerDiv.appendChild(marker.item)


            marker.item.addEventListener('mousedown', () => {
                selected = marker
            })

            markers.push(marker)

            updatePath()
        }

        pushMarker(0, 0, 0, 0)
        pushMarker(0, markerDiv.clientHeight, 0, this.yLength)
        pushMarker(markerDiv.clientWidth, markerDiv.clientHeight, this.xLength, this.yLength)
        pushMarker(markerDiv.clientWidth, 0, this.xLength, 0)

        markerDiv.addEventListener('mousemove', (evt) => {
            if (!this.enable) {
                return
            }

            if (selected == null) {
                return
            }

            let pos = getMousePosNonScale(markerDiv, evt)
            let cpos = getMousePos(markCanvas, evt)

            selected.setPosition(...pos, ...cpos)

            updatePath()
        })

        window.addEventListener('mouseup', () => {
            if (!this.enable) {
                return
            }

            selected = null
        })

        let calculateGradients = () => {

            return new Promise(async (resolve, reject) => {
                let imgData = this.state.baseSegment;
                let tfData = state.transferData

                let operation = new Kernel();
                await operation.gradientMagnitude(imgData, tfData);

                resolve()
            })
        };

        let calculateDefault = () => {

            return new Promise(async (resolve) => {
                let imgData = this.state.baseSegment;
                let sizeData = state.transferData

                let onload = () => {
                    console.log('finished')
                    resolve()
                }

                setTimeout(() => {
                    pushData(imgData.thumbnail, sizeData.data)
                    onload()
                }, 100)
            })

        };

        let sb = null
        let calculateSizeData = () => {

            return new Promise(async (resolve, reject) => {
                let imgData = this.state.baseSegment;
                let tfData = state.transferData
                let rgba = state.colorSetting.rgba

                let onprogress = (_, p) => {
                    console.log(p)
                }

                let onload = () => {
                    console.log('finished')
                    resolve()
                }

                if (sb == null) {
                    sb = new SizeBased(imgData, tfData, rgba)
                }

                await sb.process(onprogress, onload)

            })

        };

        // 生成二維的transfer function視圖
        let build2dHistogram = () => {

            // 取淂CT的三維影像資料
            let baseData = this.state.baseSegment.data;
            let dims = this.state.baseSegment.dims

            let tfData = state.transferData.data
            let maxVal = 2 ** state.info.bitsStored

            // 初始化畫布資料
            for (let i = 0; i < ctxData.data.length; i += 4) {
                ctxData.data[i] = ctxData.data[i + 1] = ctxData.data[i + 2] = 255;
                ctxData.data[i + 3] = 0;
            }

            let xIndex, yIndex, index;

            // 加速計算過程
            let scalarX = (this.xLength - 1) / (maxVal - 1)
            let scalarY = (this.yLength - 1) / (255)

            // 畫布的資料類別為Uint8Clamped，會將輸入的數值強轉成整數
            // 目前的二維視圖，其訊號的疊加採用浮點數計算，需另設參數保存計算結果
            histogram.fill(0)

            //將影像梯度的像素分布繪製成圖表
            for (let i = 0; i < baseData.length; i++) {

                xIndex = Math.round(baseData[i] * scalarX);
                yIndex = Math.round(this.yLength - 1 - tfData[i] * scalarY);

                // 訊號強度介於0~1，根據索引的單位內剩餘的空間，作為疊加訊號的強度
                index = this.xLength * yIndex + xIndex;
                histogram[index] += (1 - histogram[index]) / 255;
            }

            let max = 1
            for (let i = 0; i < histogram.length; i++) {
                if (max < histogram[index]) {
                    max = histogram[index]
                }
            }

            // 將計算結果回傳至畫布上
            for (let i = 0; i < histogram.length; i++) {
                ctxData.data[4 * i + 3] = histogram[i] / max * 255
            }

            this.displayContext.putImageData(ctxData, 0, 0);
        }

        // 根據視圖的狀態設置樣板的標記範圍
        let applyHistogramData = () => {

            return new Promise((resolve, reject) => {
                let segment = state.focusedSegment;

                let mapData = this.markContext.getImageData(0, 0, this.xLength, this.yLength).data

                let getMapDataByPosition = (posX, posY) => {
                    return mapData[(posY * this.xLength + posX) * 4 + 3]
                }

                // 防呆
                if (segment === null || !(segment instanceof Segment)) {
                    alert('No usable Segment found! Please create one first.')
                    return;
                }

                // 清除樣板上的內容
                segment.data.clear()

                let baseData = state.baseSegment.data;
                let tfData = state.transferData.data
                let maxVal = 2 ** state.info.bitsStored

                let xIndex, yIndex;

                // 加速計算過程
                let scalarX = (this.xLength - 1) / (maxVal - 1)
                let scalarY = (this.yLength - 1) / (255)

                for (let i = 0; i < baseData.length; i++) {

                    xIndex = Math.round(baseData[i] * scalarX);
                    yIndex = Math.round(this.yLength - 1 - tfData[i] * scalarY);

                    if (getMapDataByPosition(xIndex, yIndex) == 0) {
                        segment.data.setBit(i);
                    }
                }
                resolve()
            })

        };

        // 根據該類別當前的狀態(selectedMode)，決定執行的動作
        this.process = () => {
            return new Promise(async (resolve, reject) => {
                // 未啟動前，強制返回
                if (!this.enable) {
                    reject()
                    return
                }

                // 執行call
                this.onstart()

                switch (this.selectedMode) {
                    case this.mode.GRADIENT:
                        await calculateGradients();
                        build2dHistogram()
                        break
                    case this.mode.SIZEDATA:
                        await calculateSizeData();
                        build2dHistogram()
                        break
                    case this.mode.DEFAULT:
                        await calculateDefault();
                        build2dHistogram()
                        break
                    case this.mode.APPLY:
                        await applyHistogramData()
                        break
                    default:
                        break
                }

                // 完成call
                this.onload()

                resolve()
            })
        }
    }

    set enable(option) {
        this.__enable = option
    }

    get enable() {
        return this.__enable
    }

}

export { ImageProcess, ListControlTools, BrushTools, ThresholdTools, GrowingTools, FilterTools, LogicTools, CropTools, SizeBasedTools, ScissorTools, TransferTools2 }