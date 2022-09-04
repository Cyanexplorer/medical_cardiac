//constant
const axisXY = 1
const axisXZ = 0
const axisYZ = 2
const axisUD = 1
const axisUV = 0
const axisVD = 2
const NONE = -1;
const WAIT = 0;
const GEN = 1;
const clpPlaneXY = 'CLPPLAINXY'
const clpPlaneXZ = 'CLPPLAINXZ'
const clpPlaneYZ = 'CLPPLAINYZ'

//model id
const CARDIAC_MESH = "cardiac_mesh"
const CARDIAC_VOLUME = "cardiac_volume"

// custom event
// 用於觸發segment manager的notify事件
// 預先分類任務以減少不必要的資源開銷
const COLORMAP_UPDATE = 'colomap'
const IMGDATA_UPDATE = 'imgdata'
const MODEL_UPDATE = 'model'
const VOLUME_UPDATE = 'volume'
const UPDATE = 'update'

const resizeEvent = new Event('resize')

//general function
var checkPassiveSupported = (option) => {
    var supported = option
    try {
        var options = Object.defineProperty({}, "passive", {
            get: function () {
                supported = {passive: option}
            }
        })
        window.addEventListener('test', null, options)
    } catch (e) {
    }

    return supported
}

var copyArray = function (dims, buffer) {
    var dataBuffer = []
    var volDims = [dims[0], dims[1], dims[2]]
    for (var i = 0; i < buffer.length; i++) {
        dataBuffer.push(buffer[i])
    }

    return [volDims, dataBuffer]
}

let getMousePosNonScale = (canvas, evt) => {
    let rect = canvas.getBoundingClientRect()
    let scaleX = (evt.clientX - rect.left)
    let scaleY = (evt.clientY - rect.top)
    let intX = Math.round(scaleX)
    let intY = Math.round(scaleY)

    if (intX < 0) {
        intX = 0
    }

    if (intY < 0) {
        intY = 0
    }

    if (intX > canvas.clientWidth) {
        intX = canvas.clientWidth
    }

    if (intY > canvas.clientHeight) {
        intY = canvas.clientHeight
    }

    return [intX, intY]
}

let getMousePos = (canvas, evt) => {
    let rect = canvas.getBoundingClientRect()
    let scaleX = (evt.clientX - rect.left) * (canvas.width / rect.width)
    let scaleY = (evt.clientY - rect.top) * (canvas.height / rect.height)
    let intX = Math.round(scaleX)
    let intY = Math.round(scaleY)

    if (intX < 0) {
        intX = 0
    }

    if (intY < 0) {
        intY = 0
    }

    if (intX > canvas.width) {
        intX = canvas.width
    }

    if (intY > canvas.height) {
        intY = canvas.height
    }

    return [intX, intY]
}

let getMinMax = function (dataBuffer) {
    let min = dataBuffer[0]
    let max = dataBuffer[0]
    for (let i = 0; i < dataBuffer.length; i++) {
        if (dataBuffer[i] > max) {
            max = dataBuffer[i]
        }
        if (dataBuffer[i] < min) {
            min = dataBuffer[i]
        }
    }

    return {min: min, max: max}
}

let sampling = function (volDims, dataBuffer, ratio) {
    let index = 0
    let i, j, k
    let buffer = []
    let dims = []

    for (i = 0; i < volDims[2]; i += ratio)
        for (j = 0; j < volDims[1]; j += ratio)
            for (k = 0; k < volDims[0]; k += ratio) {
                index = Math.ceil(i) * volDims[1] * volDims[0] + Math.ceil(j) * volDims[0] + Math.ceil(k)
                buffer.push(dataBuffer[index]);
            }

    dims.push(k / ratio, j / ratio, i / ratio)

    return {dims, buffer}
}

let hex2rgb = function (hex) {
    let r = ((hex >> 16) & 255)
    let g = ((hex >> 8) & 255)
    let b = ((hex) & 255)
    return [r, g, b]
}

//lower call back frequency
let throttle = function (func, threshhold) {
    let last, timer;
    if (threshhold == null)
        threshhold = 250;
    return function () {
        let context = this
        let args = arguments
        let now = +new Date()
        if (last && now < last + threshhold) {
            clearTimeout(timer)
            timer = setTimeout(function () {
                last = now
                func.apply(context, args)
            }, threshhold)
        } else {
            last = now
            func.apply(context, args)
        }
    }
}

let pushData = (source, destination, resize = false) => {

    if (resize && source.length !== destination.length) {
        destination = source.slice();
        return;
    }

    let step = source.length == destination.length ? 1 : source.length / destination.length;
    let si = 0;
    for (let i = 0; i < destination.length; i++) {
        destination[i] = source[Math.round(si)];
        si += step;
    }
    //console.log(destination, source);

};

// 將資料從canvas寫入原始陣列
// ex: arr_Origin[i] = arr_uint8[i] * scalar
let writerScalar = (data) => {
    if (data instanceof Uint16Array) {
        return 255;
    } else if (data instanceof Uint8Array) {
        return 1;
    } else {
        return -1;
    }
};

// 將資料從原始陣列寫入canvas
// ex: arr_uint8[i] = arr_Origin[i] * scalar
let loaderScalar = (data) => {
    if (data instanceof Uint16Array) {
        return 1 / 255
    } else if (data instanceof Uint8Array|| data instanceof Uint8ClampedArray) {
        return 1
    } else {
        return -1
    }
}

let getDataRange = (data) => {
    if (data instanceof Uint16Array) {
        return 65536
    } else if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
        return 256
    }
    else{
        let max = 0
        for(let i = 0;i<data.length;i++){
            if(data[i] < max)
                continue

            max = data[i]
        }

        return max
    }

    return -1
}

