import * as Opt from './ImageProcessTools.js'
import { State } from "../model/State.js"
import { Segment, ImageData } from '../model/Segment.js'
import { MaskImage } from "./MaskImage.js"

class SLController {
    constructor(state) {
        //steps

        this.startStep = 0
        this.endStep = 1
        this.currentStep = 1
        this.length = 20

        this.tmpSegment = new Segment('tmp', state.originSegment.dims, null, false)

        this.mode = {
            NONE: -1,
            INITIAL: 0,
            addSeg: 1,
            removeSeg: 2,
            modifySeg: 3,
            changeIndex: 4,
            cropImg:5
        }

        this.stack = new Array(this.length).fill(0).map(() => {
            return {
                action: this.mode.NONE,
                content: null,
                cropped: null,
                index: -1,
            }
        })

        this.onload = () => { }
        this.state = state
    }

    get undoEnable() {
        let limit = (this.startStep + 1) % this.length
        return limit != this.currentStep
    }

    get redoEnable() {
        return this.currentStep != this.endStep
    }

    setStackSeg(segment) {
        if (segment === null) {
            //do nothing
        }
        else if (this.stack[this.currentStep].content === null) {
            this.stack[this.currentStep].content = segment.clone();
        }
        else {
            this.stack[this.currentStep].content.copyfrom(segment);
        }
    }

    // �O�s���v�T��Segment
    // action:�ާ@����
    // index:�ާ@�ؼ�
    // segemnt:�ؼФ��e
    save(action) {

        this.currentStep = (this.currentStep + 1) % this.length
        this.endStep = this.currentStep

        if (this.endStep == this.startStep) {
            this.startStep = (this.startStep + 1) % this.length
        }

        this.stack[this.currentStep].action = action

        switch (action) {
            case this.mode.addSeg:
            case this.mode.removeSeg:
            case this.mode.modifySeg:
                this.stack[this.currentStep].index = this.state.focusedSegIndex
                this.setStackSeg(this.state.focusedSegment)
                break
            case this.mode.cropImg:
                break
        }
        
        this.onload(this.undoEnable, this.redoEnable)
    }

    undo() {
        if (!this.undoEnable) {
            return
        }

        let stk = this.stack[this.currentStep]

        switch (stk.action) {
            case this.mode.addSeg:
                this.setStackSeg(this.state.segments[stk.index + 1])

                this.state.segments.splice(stk.index + 1, 1)
                this.state.focusedSegIndex = stk.index

                break
            case this.mode.removeSeg:

                this.state.segments.splice(stk.index, 0, stk.content.clone())
                this.state.focusedSegIndex = stk.index
                break
            case this.mode.modifySeg:

                this.state.focusedSegIndex = stk.index
                this.tmpSegment.copyfrom(this.state.focusedSegment)

                this.state.focusedSegment.copyfrom(stk.content)
                this.setStackSeg(this.tmpSegment)
                break
            case this.mode.cropImg:
                break
        }

        this.currentStep = (this.currentStep + this.length - 1) % this.length
        this.onload(this.undoEnable, this.redoEnable)
    }

    redo() {
        if (!this.redoEnable) {
            return
        }

        this.currentStep = (this.currentStep + 1) % this.length

        let stk = this.stack[this.currentStep]

        switch (stk.action) {
            case this.mode.addSeg:
                this.state.segments.splice(stk.index + 1, 0, stk.content.clone())
                this.state.focusedSegIndex = stk.index + 1
                break
            case this.mode.removeSeg:
                this.state.segments.splice(stk.index, 1)
                this.state.focusedSegIndex = stk.index - 1
                break
            case this.mode.modifySeg:
                this.state.focusedSegIndex = stk.index
                this.tmpSegment.copyfrom(this.state.focusedSegment)
                this.state.focusedSegment.copyfrom(stk.content)
                this.setStackSeg(this.tmpSegment)
                break
            case this.mode.cropImg:
                break
        }

        this.onload(this.undoEnable, this.redoEnable)
    }
}

class StateManager {

    constructor(state) {
        this.maskImages = []
        this.events = []

        for (let i = 0; i < 3; i++) {
            this.maskImages.push(new MaskImage(state, i))
        }

        let uvdDims = state.originSegment.dims

        this.maskImages[axisUV].setCanvasSize(uvdDims[0], uvdDims[1]);
        this.maskImages[axisUD].setCanvasSize(uvdDims[0], uvdDims[2]);
        this.maskImages[axisVD].setCanvasSize(uvdDims[1], uvdDims[2]);

        this.mode = {
            NONE: 0,
            BRUSH: 1,
            THRESHOLD: 2,
            MORPH: 3,
            LOGIC: 4,
            REGIONGROW: 5,
            SCISSOR: 6,
            ML: 7,
            SIZEBASED: 8,
            TRANSFER: 9
        }

        this.selectedMode = this.mode.NONE
        this.state = state

        for (let i = 0; i < this.maskImages.length; i++) {
            this.maskImages[i].state = this.state
        }

        this.slc = new SLController(this.state)//存檔/讀檔控制

        this.cropTools = new Opt.CropTools(this.state, this.maskImages)
        this.cropTools.enable = true
        this.cropTools.onload = () => {
            this.notify()
        }

        this.listControlTools = new Opt.ListControlTools(this.state, this.maskImages)
        this.listControlTools.enable = true
        this.listControlTools.onstart = (result) => {
            if (result == true) {
                this.slc.save(this.slc.mode.addSeg)
            }
            else if (result == false) {
                this.slc.save(this.slc.mode.removeSeg)
            }

        }
        this.listControlTools.onload = () => {
            this.notify()
        }

        this.logicTools = new Opt.LogicTools(this.state)
        this.logicTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.logicTools.onload = () => {
            this.notify()
        }

        this.brushTools = new Opt.BrushTools(this.state, this.maskImages)
        this.brushTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.brushTools.onload = () => {
            this.notify()
        }

        this.filterTools = new Opt.FilterTools(this.state)
        this.filterTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.filterTools.onload = () => {
            this.notify()
        }

        this.regionGrowing = new Opt.GrowingTools(this.state, this.maskImages)
        this.regionGrowing.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.regionGrowing.onload = () => {
            this.notify()
        }

        this.thresholdTools = new Opt.ThresholdTools(this.state)
        this.thresholdTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.thresholdTools.onload = () => {
            this.notify()
        }

        let domElement = document.getElementById('transfer_layout')
        this.transferTools = new Opt.TransferTools2(this.state, domElement)
        this.transferTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.transferTools.onload = () => {
            this.notify()
        }

        domElement = document.getElementById('tool_sizebased_histogram')
        this.sizeBasedTools = new Opt.SizeBasedTools(this.state, domElement)
        this.sizeBasedTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.sizeBasedTools.onload = () => {
            //this.notify()
        }

        domElement = document.getElementById('dcmViewer')
        this.scissorTools = new Opt.ScissorTools(this.state, domElement)
        this.scissorTools.onstart = () => {
            this.slc.save(this.slc.mode.modifySeg)
        }
        this.scissorTools.onload = () => {
            this.notify()
        }


        this.updateBaseSegment()
    }

    disableAll() {
        this.logicTools.enable = false
        this.brushTools.enable = false
        this.filterTools.enable = false
        this.regionGrowing.enable = false
        this.thresholdTools.enable = false
        this.scissorTools.enable = false
        this.transferTools.enable = false
        this.sizeBasedTools.enable = false
    }

    enable() {
        this.setManagerTools(this.selectedMode)
    }

    // 更新CT影像中的資料
    updateBaseSegment() {

        return new Promise((resolve) => {
            this.state.baseDataReset()
            this.state.generate(() => {
                this.notify('update')
                resolve()
            })
        })

    }

    updateColorMap() {
        this.notify('colormap')
    }

    setManagerTools(option, enabled = true) {
        this.disableAll()

        switch (option) {
            case this.mode.BRUSH:
                this.selectedMode = option
                this.brushTools.enable = enabled
                break
            case this.mode.THRESHOLD:
                this.selectedMode = option
                this.thresholdTools.enable = enabled
                this.transferTools.enable = enabled
                break
            case this.mode.MORPH:
                this.selectedMode = option
                this.filterTools.enable = enabled
                break
            case this.mode.REGIONGROW:
                this.selectedMode = option
                this.regionGrowing.enable = enabled
                break
            case this.mode.LOGIC:
                this.selectedMode = option
                this.logicTools.enable = enabled
                break
            case this.mode.NONE:
                this.selectedMode = option
                break
            case this.mode.SCISSOR:
                this.selectedMode = option
                this.scissorTools.enable = enabled
                break
            case this.mode.ML:
                this.selectedMode = option
                //this.scissorTools.enable = enabled
                break
            case this.mode.SIZEBASED:
                this.selectedMode = option
                this.sizeBasedTools.enable = enabled
                break
            default:
                this.selectedMode = this.mode.NONE
        }
    }

    getFocusedLayer(axis) {
        let segment = this.state.focusedSegment
        let image = this.maskImages[axis]
        let index = image.index

        if (segment == null || index == -1) {
            return null
        }

        let data = image.getLayerImage(0)

        return segment.binaryLoader(axis, index, data)
    }

    setFocusedLayer(axis, index = this.maskImages[axis].index) {

        if (this.state.baseSegment == null) {
            return
        }

        let image = this.maskImages[axis]
        this.maskImages[axis].index = index

        //取得canvas data
        let imgdata = image.getBaseImage()

        //從3D中取出指定層數的2D影像，以canvas data保存
        this.state.baseSegment.imgLoader(axis, index, imgdata)
        //this.state.originSegment.addBuffer(axis, index, imgdata)

        if (this.state.baseSegment.used) {
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                data[i + 3] = this.state.baseSegment.alpha[j]
            }
        }

        //將canvas data存回canvas中
        image.setBaseImage(imgdata)

        while (image.layers.length > this.state.segments.length) {
            image.removeLayer()
        }

        while (image.layers.length < this.state.segments.length) {
            image.addLayer()
        }

        let color, pixelData, segment
        for (let i = 0; i < this.state.segments.length; i++) {
            segment = this.state.segments[i]
            color = segment.color
            pixelData = image.getLayerImage(i)

            segment.binaryLoader(axis, index, pixelData)

            image.setLayerImage(i, pixelData, color)
        }

        image.update()
    }

    addNotifyEvent = (event, type = 'none') => {
        if(this.events[type] == null){
            this.events[type] = []
        }

        this.events[type].push(event)
    }

    removeNotifyEvent = (event, type = 'none') => {
        if(this.events[type] == null){
            return
        }

        let index = this.events[type].findIndex(event)
        this.events[type].splice(index,1)
    }

    notify(type = 'none') {
        for (let index in this.maskImages) {
            this.setFocusedLayer(index)
        }

        if(this.events[type] == null){
            return
        }

        for(let event of this.events[type]){
            event()
        }
    }

}

export { StateManager }