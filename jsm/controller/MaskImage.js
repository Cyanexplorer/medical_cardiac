export class MaskImage {

    constructor(state, orientaion = 0) {
        this.exposure = 1
        this.contrast = 1
        this.index = -1
        this.orientation = orientaion

        //畫布圖層初始化
        this.layers = []
        this.state = state

        this.size = []
        this.compressedSize = []

        //中介層，用於影像(dicom)尺寸與UI(canvas)尺寸的轉換作業，防止畫筆工具於特定情形下變形
        let convertor = {
            context: document.createElement('canvas').getContext('2d'),
            palatte: null,
            process: () => {
                convertor.context.putImageData(convertor.palatte, 0, 0)
            },
            setSize: (width, height) => {
                convertor.context.canvas.width = width
                convertor.context.canvas.height = height
                convertor.palatte = convertor.context.getImageData(0, 0, width, height)
            }
        }

        //background: 背景圖層，用於顯示dicom影像
        //segment:樣板圖層，用於顯示標記範圍
        //controller:交互圖層，用於顯示圖標等使用者交互介面以及接收操作事件
        this.domElements = {
            background: {},
            segment: {},
            preview: {},
            controller: {}
        }

        for (let key in this.domElements) {
            this.domElements[key].canvas = document.createElement('canvas')
            this.domElements[key].context = this.domElements[key].canvas.getContext('2d')
            this.domElements[key].palatte = ''

            this.domElements[key].setSize = (width, height) => {
                let nw = width
                let nh = parseInt(height * this.thickness[1] / this.thickness[0])

                this.domElements[key].context.canvas.width = nw
                this.domElements[key].context.canvas.height = nh
                this.domElements[key].palatte = this.domElements[key].context.getImageData(0, 0, nw, nh)
            }

            this.domElements[key].getImageData = () => {
                let w = this.domElements[key].context.canvas.width
                let h =this.domElements[key].context.canvas.height
                return this.domElements[key].context.getImageData(0, 0, w, h)
            }

            if (key == 'segment') {
                window.addEventListener('keydown', (evt) => {
                    switch (evt.key) {
                        case 'f':
                            this.domElements[key].canvas.style.opacity = 0
                            break
                    }
                })

                window.addEventListener('keyup', (evt) => {
                    switch (evt.key) {
                        case 'f':
                            this.domElements[key].canvas.style.opacity = 100
                            break
                    }
                })

            }
        }

        this.setCanvasStyle = (width, height) => {
            for (let index in this.domElements) {
                let canvas = this.domElements[index].context.canvas
                canvas.style.width = `${width}px`
                canvas.style.height = `${height}px`
            }
        }

        //更新畫布尺寸
        this.setCanvasSize = (width, height, sync = true) => {

            this.size = [width, height]

            for (let index in this.domElements) {
                this.domElements[index].setSize(width, height)
            }

            convertor.setSize(width, height)
            //console.log(convertor)
        }

        // 載入背景(CT影像)
        this.setBaseImage = (data) => {

            for (let i = 0; i < data.length; i++) {
                convertor.palatte.data[i] = parseInt(data[i])
            }

            convertor.process()

            this.domElements.background.context.clearRect(0, 0, ...this.adaptiveSize)
            this.domElements.background.context.drawImage(convertor.context.canvas, 0, 0, ...this.adaptiveSize)
        }

        // 載入樣板至指定層數的遮罩
        this.setLayerImage = (index, pixelData, color) => {

            if (this.layers.length <= index || index < 0) {
                console.error('mask image: index out of range')
                return
            }

            //中介層轉換
            convertor.palatte.data.set(pixelData)
            convertor.process()

            let layer = this.layers[index]
            let layerData = layer.imgData.data
            let ctx = layer.context

            pushData(pixelData, layerData)
            
            //樣板著色
            if (color != null) {
                ctx.save()
                ctx.fillStyle = color
                ctx.globalAlpha = 0.5
                ctx.beginPath()
                ctx.rect(0, 0, layer.width, layer.height)
                ctx.fill()
                ctx.globalCompositeOperation = 'destination-in'
                ctx.drawImage(convertor.context.canvas, 0, 0, ...this.adaptiveSize)
                ctx.restore()
            }

        }

        this.addLayer = () => {
            let layer = document.createElement('canvas')
            layer.width = this.adaptiveSize[0]
            layer.height = this.adaptiveSize[1]
            let ctx = layer.getContext('2d')
            this.layers.push(
                {
                    imgData: new ImageData(new Uint8ClampedArray(this.size[0] * this.size[1] * 4), ...this.size),
                    context: ctx,
                    width: layer.width,
                    height: layer.height,
                    palatte: ctx.getImageData(0, 0, ...this.adaptiveSize)
                }
            )
        }

        this.removeLayer = (index) => {
            this.layers.splice(index, 1)
        }

        //清除畫布[樣板]圖層內容
        this.clear = () => {
            let ctx = this.domElements.segment.context
            ctx.clearRect(0, 0, ...this.adaptiveSize)
        }

        //更新畫布[樣板]圖層內容
        this.update = () => {
            this.clear()
            let fIndex = this.state.focusedSegIndex

            let ctx = this.domElements.segment.context
            ctx.filter = 'none'

            for (let i = 0; i < this.state.segments.length; i++) {
                if (this.state.segments[i].visible && i != fIndex)
                    ctx.drawImage(this.layers[i].context.canvas, 0, 0, ...this.adaptiveSize)
            }

            if (fIndex != -1 && this.state.segments[fIndex].visible)
                ctx.drawImage(this.layers[fIndex].context.canvas, 0, 0, ...this.adaptiveSize)
        }

        // 設置畫筆軌跡
        this.updateBorder = (points) => {
            let ctx = this.domElements.controller.context

            ctx.save()
            ctx.beginPath()
            for (let i = 0; i < points.length; i++) {
                if (i == 0) {
                    ctx.moveTo(points[i].x, points[i].y)
                }
                else {
                    ctx.lineTo(points[i].x, points[i].y)
                }
            }
            ctx.closePath()
            ctx.strokeStyle = '#FF0000'
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.stroke()
            ctx.restore()

            ctx.save()
            ctx.fillStyle = '#FF0000'
            for (let i = 0; i < points.length; i++) {
                ctx.beginPath()
                ctx.arc(points[i].x, points[i].y, 6, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.restore()
        }


        this.applyControllerTrack = (index, color, erase) => {
            let pixelData = this.layers[index].imgData.data

            let trackData = this.getControllerTrack()

            if (erase) {
                for (let i = 3; i < pixelData.length; i += 4) {
                    pixelData[i] = pixelData[i] - trackData[i] - 254
                    pixelData[i] *= 255
                }
            }
            else {
                for (let i = 3; i < pixelData.length; i += 4) {
                    pixelData[i] = pixelData[i] + trackData[i] + 254
                    pixelData[i] -= 254
                }
            }

            this.setLayerImage(index, pixelData, color)
        }

        this.setControllerTrack = (pos, radius, color) => {

            let ctx = this.domElements.controller.context

            ctx.save()

            ctx.beginPath()
            ctx.fillStyle = color
            ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }

        this.getControllerTrack = () => {
            let ctx = convertor.context
            ctx.clearRect(0, 0, ...this.size)
            ctx.drawImage(this.domElements.controller.context.canvas, 0, 0, ...this.size)
            return ctx.getImageData(0, 0, this.size[0], this.size[1]).data
        }

        // 清除畫筆軌跡
        this.clearControllerTrack = () => {
            let ctx = this.domElements.controller.context
            ctx.clearRect(0, 0, ...this.adaptiveSize)
        }

        this.setMaskTrack = (index, pos, radius, color, erase = false) => {
            if (index >= this.layers.length || index < 0) {
                return
            }

            this.applyControllerTrack(index, color, erase)
        }

        this.getLayerData = (index) => {
            return this.layers[index].imgData.data
        }

        this.getLayerImage = (index) => {
            return this.getLayerData(index)

        }

        this.getBaseImage = () => {
            let ctx = convertor.context
            ctx.clearRect(0, 0, ...this.size)
            ctx.drawImage(this.domElements.background.context.canvas, 0, 0, ...this.size)
            return ctx.getImageData(0, 0, this.size[0], this.size[1]).data
        }

        this.toImgURL = () => {
            return this.background.toDataURL()
        }

        this.setCanvasSize(this.background.width, this.background.height)
    }

    get background() {
        return this.domElements.background.context.canvas
    }

    get controller() {
        return this.domElements.controller.context.canvas
    }

    get segment() {
        return this.domElements.segment.context.canvas
    }

    get adaptiveSize() {
        return [this.size[0], this.thickness[1] / this.thickness[0] * this.size[1]]
    }

    get realSize() {
        return [this.thickness[0] * this.size[0], this.thickness[1] * this.size[1]]
    }

    get thickness() {
        let spacing = this.state.info.spacing

        switch (this.orientation) {
            case 0:
                return [spacing[0], spacing[1]]
            case 1:
                return [spacing[0], spacing[2]]
            case 2:
                return [spacing[1], spacing[2]]
        }

    }

}