import init, { MarchingCubes } from "../../pkg/lib.js";
import * as THREE from "../build/three.module.js";
import { OrbitControls } from "../example/jsm/controls/OrbitControls.js";
import { SlicerControl } from "../parts/marker.js";
import { WEBGL } from "../WebGL.js";
import { mergeVertices } from "../example/jsm/utils/BufferGeometryUtils.js";
import { MMDLoader } from "../example/jsm/loaders/MMDLoader.js";
import { STLLoader } from "../example/jsm/loaders/STLLoader.js";
import { OBJLoader } from "../example/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "../example/jsm/loaders/MTLLoader.js";
import { OutlineEffect } from '../example/jsm/effects/OutlineEffect.js';
import { VolumeRenderShader1 } from '../tf/VolumeShader.js';

import { BinaryArray } from "../model/ExtendedArray.js"
import * as mc from '../example/jsm/objects/MarchingCubes.js'

class Histogram {

    static getInstance = function () {
        return new Histogram()
    }

    constructor() {
        // set the dimensions and margins of the graph

        let margin = { top: 10, right: 10, bottom: 20, left: 40 }
        let colormap = new Array(256).fill(0).map((value, index) => {
            return index
        })

        let getHistogram = (data, stored) => {
            let colorlevel = 2 ** stored
            let histogram = new Uint32Array(256).fill(0)

            for (let i = 0; i < data.length; i++) {
                histogram[Math.round(data[i] / colorlevel * 255)]++
            }

            return histogram
        }

        this.loadView = function (domElement, data, stored) {
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
                .domain([1, 255])     // except 0 value pixels
                .range([0, width]);

            let ratio = 2 ** stored / 255

            svg.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(
                    d3
                        .axisBottom(x)

                        .tickFormat((d) => {
                            return Math.round(d * ratio)
                        })
                );

            // apply this function to data to get the bins
            let bins = getHistogram(data, stored)

            // Y axis: scale and draw:
            let y = d3.scaleLog()
                .range([height, 0])
                .domain([1, d3.max(bins)]);

            svg.append('g')
                .call(
                    d3.axisLeft(y)
                );

            // append the bar rectangles to the svg element
            svg.selectAll('rect')
                .data(Array.from(bins.keys()))
                .enter()
                .append('rect')
                .attr('transform', function (d) { return 'translate(' + x(d) + ',' + y(bins[d] + 1) + ')'; })
                .attr('width', function (d) { return x(d + 1) - x(d); })
                .attr('height', function (d) { return height - y(bins[d] + 1); })
                .style('fill', function (d) {
                    //console.log(colormap)
                    let index = d
                    let hex = colormap[index]

                    if (hex < 16) {
                        hex = '0' + hex.toString(16)
                    }
                    else {
                        hex = hex.toString(16)
                    }

                    return '#' + hex + hex + hex
                })

        }
    }
}

class Histogram_bak {

    static getInstance = function () {
        return new Histogram()
    }

    constructor() {
        // set the dimensions and margins of the graph

        let margin = { top: 10, right: 10, bottom: 20, left: 40 }
        let colormap = new Array(256).fill(0).map((value, index) => {
            return index
        })

        let getHistogram = (data) => {
            let colorlevel = getDataRange(data)
            let histogram = new Uint32Array(colorlevel).fill(0)

            for (let i = 0; i < data.length; i++) {
                histogram[data[i]]++
            }

            return histogram
        }

        this.loadView = function (domElement, data) {

            let colorlevel = getDataRange(data) + 1

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
                .domain([1, colorlevel])     // except 0 value pixels
                .range([0, width]);

            svg.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(
                    d3
                        .axisBottom(x)
                        .ticks(5));

            // apply this function to data to get the bins
            let bins = getHistogram(data)

            // Y axis: scale and draw:
            let y = d3.scaleLog()
                .range([height, 0])
                .domain([1, d3.max(bins)]);

            svg.append('g')
                .call(
                    d3.axisLeft(y)
                        .ticks(5)
                );


            // append the bar rectangles to the svg element
            svg.selectAll('rect')
                .data(Array.from(bins.keys()))
                .enter()
                .append('rect')
                .attr('transform', function (d) { return 'translate(' + x(d) + ',' + y(bins[d] + 1) + ')'; })
                .attr('width', function (d) { return Math.ceil(x(d + 1) - x(d)); })
                .attr('height', function (d) { return height - y(bins[d] + 1); })
            /**
             *                 .style('fill', function (d, i) {
                //console.log(colormap)
                let index = Math.round(i * colormap.length / colorlevel)
                let hex = colormap[index]

                if (hex < 10) {
                    hex = '0' + hex.toString(16)
                }
                else{
                    hex = hex.toString(16)
                }

                
                return '#' + hex + hex + hex
            })
             */
        }
    }
}

class SignalDistribution {

    static getInstance = function () {
        return new SignalDistribution()
    }

    constructor() {
        // set the dimensions and margins of the graph
        let canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 100

        let ctx = canvas.getContext('2d')

        let range = 100

        this.loadView = function (domElement) {

            domElement.appendChild(canvas)
        }

        this.updateView = (imgData, stored) => {

            let max = 0
            let histogram = new Uint16Array(stored).fill(0)

            for (let i = 0; i < imgData.length; i++) {
                let index = parseInt(imgData[i])
                histogram[index]++

                if (histogram[index] > max) {
                    max = histogram[index]
                }
            }

            let palette = ctx.getImageData(0, 0, 256, 100)
            let data = palette.data
            let ratio = range / (max + 1)

            for (let i = 0; i < 256; i++) {
                let height = (histogram[i] + 1) * ratio
                let index = i

                for (let j = 0; j < height; j++) {

                    data[4 * index] = 255
                    data[4 * index + 1] = 255
                    data[4 * index + 2] = 255
                    data[4 * index + 3] = 255

                    index += 256
                }

            }

            ctx.putImageData(palette, 0, 0)
        }
    }
}

class DimensionView {
    constructor(manager) {
        this.domElement = document.getElementById('workingScene')
        this.uvdDims = [0, 0, 0]
        this.imgLayerValue = [-1, -1, -1]
        this.contrastValue = [0, 0, 0]
        this.exposureValue = [0, 0, 0]

        let viewports = new Array(3)
        let slider = new Array(3)
        let counterLabel = new Array(3)
        let exposureLabel = new Array(3)
        let contrastLabel = new Array(3)
        let imgGroups = new Array(3)

        this.domElements = [
            document.getElementById('horizontalView'),
            document.getElementById('coronalView'),
            document.getElementById('sagittalView')
        ]

        for (let i = 0;
            i < 3; i++) {
            viewports[i] = this.domElements[i].querySelector('.viewport')
            slider[i] = this.domElements[i].querySelector(".viewer-slider")
            counterLabel[i] = this.domElements[i].querySelector(".counter")
            exposureLabel[i] = this.domElements[i].querySelector(".exposure")
            contrastLabel[i] = this.domElements[i].querySelector(".contrast")
        }

        let init = () => {

            for (let i = 0; i < viewports.length; i++) {
                let viewport = viewports[i]
                let imgGroup = document.createElement('div')
                imgGroup.style.width = '100%'
                imgGroup.style.height = '100%'

                viewport.appendChild(imgGroup)
                imgGroups[i] = imgGroup

                let mImgDom = manager.maskImages[i].domElements
                for (let key in mImgDom) {
                    imgGroup.appendChild(mImgDom[key].context.canvas)
                }

                let action = -1
                let mousePos = [0, 0]
                let scaleRatio = [1, 1]
                let translateRatio = [0, 0]
                let diff = [0, 0]
                let screenSize = [Number(screen.width), Number(screen.height)]

                imgGroup.addEventListener('mousedown', (evt) => {
                    mousePos[0] = evt.clientX
                    mousePos[1] = evt.clientY
                    action = 0
                })

                window.addEventListener('mousemove', (evt) => {

                    if (action == -1) {
                        return
                    }


                    diff[0] = (evt.clientX - mousePos[0]) / screenSize[0]
                    diff[1] = (evt.clientY - mousePos[1]) / screenSize[1]

                    //中鍵
                    if (evt.buttons == 2 && evt.button == 0) {
                        let ratio = (diff[0]) + scaleRatio[0]

                        imgGroup.style.width = ratio * 100 + '%'
                        imgGroup.style.height = ratio * 100 + '%'

                        this.sizeReload(i)
                    }

                    else if (evt.buttons == 4 && evt.button == 0) {
                        let ratioX = (diff[0]) + translateRatio[0]
                        let ratioY = (diff[1]) + translateRatio[1]

                        viewport.style.left = ratioX * 100 + '%'
                        viewport.style.top = ratioY * 100 + '%'
                    }
                })

                window.addEventListener('mouseup', (evt) => {
                    if (evt.buttons == 0 && evt.button == 2) {
                        scaleRatio[0] += diff[0]
                        scaleRatio[1] += diff[1]
                    }
                    else if (evt.buttons == 0 && evt.button == 1) {
                        translateRatio[0] += diff[0]
                        translateRatio[1] += diff[1]
                    }
                    action = -1
                })

                window.addEventListener('mouseleave', (evt) => {
                    if (evt.buttons == 0 && evt.button == 2) {
                        scaleRatio[0] += diff[0]
                        scaleRatio[1] += diff[1]
                    }
                    else if (evt.buttons == 0 && evt.button == 1) {
                        translateRatio[0] += diff[0]
                        translateRatio[1] += diff[1]
                    }
                    action = -1
                })

            }

        }

        this.sliderUpdate = (axis) => {

            let mImgs = manager.maskImages
            let index = this.imgLayerValue[axis];
            let length, ratio

            //this.renderScene()

            if (axis == axisUV) {
                //ratio = index / this.uvdDims[2]
                length = this.uvdDims[2]
            } else if (axis == axisUD) {
                //ratio = index / this.uvdDims[1]
                length = this.uvdDims[1]
            } else {
                //ratio = index / this.uvdDims[0]
                length = this.uvdDims[0]
            }


            counterLabel[axis].textContent = `${parseInt(index) + 1}/${length}`

            exposureLabel[axis].textContent = Math.round(mImgs[axis].exposure * 10 - 10) / 10
            contrastLabel[axis].textContent = Math.round(mImgs[axis].contrast * 10 - 10) / 10

            this.sizeReload(axis)
            this.showDicom(axis, index)

            manager.notify('imageUpdate')
        }

        //axis: Top2button(TB) is 0; Front2Back(FB) is 1; Left2Right(LR) is 2
        //index: current dicom image page
        this.showDicom = (axis, index) => {

            requestAnimationFrame(() => {
                index = parseInt(index)
                if (index >= this.uvdDims[axis].length) {
                    return
                }

                //console.log(axis, index)
                manager.setFocusedLayer(axis, index)
            })

        }


        this.sizeReload = (index) => {
            //adjust element size
            let mImg = manager.maskImages[index]
            let imgGroup = imgGroups[index]
            let ratio = mImg.size[1] * mImg.thickness[1] / mImg.size[0] / mImg.thickness[0]

            // 預留畫布
            let newW = imgGroup.offsetWidth
            let newH = imgGroup.clientHeight
            let nratio = newH / newW

            if (ratio > nratio) {
                newW = newH / ratio
            } else {
                newH = newW * ratio
            }

            mImg.setCanvasStyle(newW, newH)
        }

        window.addEventListener('resize', () => {
            for (let i = 0; i < 3; i++) {
                this.sizeReload(i)
            }
        })

        this.setDcmViewerDims = (uvdDims) => {

            this.uvdDims = uvdDims

            for (let i = 0; i < 3; i++) {
                slider[i].min = 0
                slider[i].max = 1
                slider[i].step = 1 / (uvdDims[2 - i] - 1) / 200
                slider[i].value = 0.5
                this.scrollto(i, 0.5)
            }

        }

        this.updateDcmView = () => {
            this.sliderUpdate(axisUV)
            this.sliderUpdate(axisUD)
            this.sliderUpdate(axisVD)
        }

        this.scrollto = (axis, percent) => {
            //console.log(percent * this.uvdDims[2 - axis])
            this.imgLayerValue[axis] = Math.round(percent * (this.uvdDims[2 - axis] - 1))
            this.sliderUpdate(axis)
        }

        this.Index2Ratio = (axis, index) => {
            if (index < 0) {
                index = 0
            } else if (index >= this.uvdDims[2 - axis]) {
                index = this.uvdDims[2 - axis] - 1
            }
            return index / (this.uvdDims[2 - axis] - 1)
        }

        this.Ratio2Index = (axis, ratio) => {
            if (ratio < 0) {
                ratio = 0
            } else if (ratio > 1) {
                ratio = 1
            }
            return ratio * (this.uvdDims[2 - axis] - 1)
        }

        init()
    }
}

class CADViewer {
    constructor(domElement) {
        this.scene = null
        this.camera = null
        this.clippingControl = null
        this.renderer = null
        this.controller = null
        this.domElement = domElement
        this.effect = null;
        this.thickness = [1, 1, 1]

        const camera_unit = 1.2
        const model_unit = 1

        let model = null

        let setCameraSize = (width, height) => {
            let aspect = width / height
            this.camera.left = -aspect * camera_unit / 2
            this.camera.right = aspect * camera_unit / 2
            this.camera.top = camera_unit / 2
            this.camera.bottom = -camera_unit / 2
            this.camera.far = 100
            this.camera.near = 0.1
            this.camera.updateProjectionMatrix();
        }

        let onWindowResize = () => {
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            setCameraSize(width, height)
            this.renderer.setSize(width, height)
            this.renderScene()
        }

        let loadModel = () => {
            new MTLLoader().load('model/obj/f-16.mtl', (mtl) => {

                new OBJLoader().setMaterials(mtl).load('model/obj/f-16.obj', (object) => {
                    console.log(object)
                    let box = new THREE.Box3().setFromObject(object)

                    /*
                    let geometry = object.geometry
                    geometry.computeVertexNormals()
                    geometry.computeBoundingBox()
                    geometry.center()
                    */

                    let min = box.min
                    let max = box.max
                    let scaleX = model_unit / (max.x - min.x)
                    let scaleY = model_unit / (max.y - min.y)
                    let scaleZ = model_unit / (max.z - min.z)
                    console.log(scaleX, scaleY, scaleZ, box)

                    for (let i = 0; i < object.children.length; i++) {
                        //object.children[i].scale.set(scaleX, scaleY, scaleZ)
                    }


                    this.scene.add(object)

                    // Clipping Control
                    //this.setClippingMesh(model)
                    //console.log(model)
                    this.renderScene()
                })
            })



            /*
             
             new OBJLoader().load('model/obj/f-16.obj', (object) => {
             
             model[1] = object
             
             let boundingBox = new THREE.Box3().setFromObject(object)
             let min = boundingBox.min
             let max = boundingBox.max
             let scaleX = model_unit / (max.x - min.x)
             let scaleY = model_unit / (max.y - min.y)
             let scaleZ = model_unit / (max.z - min.z)
             
             let center = new THREE.Vector3()
             boundingBox.getCenter(center)
             
             object.scale.set(scaleX, scaleY, scaleZ)
             object.position.set(-center.x * scaleX, -center.y * scaleY, -center.z * scaleZ)
             
             this.scene.add(model[1])
             
             onload()
             })
             */
        }

        this.copyCamera = (c) => {
            if (!(c instanceof THREE.Camera))
                return

            let zoom = this.camera.zoom
            this.camera.copy(c, false)
            this.camera.zoom = zoom
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            setCameraSize(width, height)
        }

        this.setOrientation = (index) => {
            this.clippingControl.setClipping(0, false)
            this.clippingControl.setClipping(1, false)
            this.clippingControl.setClipping(2, false)
            switch (index) {
                case 0:
                    this.camera.position.set(0, 16, 0);
                    this.camera.up.set(0, 0, 1);
                    this.camera.lookAt(0, 0, 0);
                    this.clippingControl.setClipping(0, true)
                    break
                case 1:
                    this.camera.position.set(0, 0, 16);
                    this.camera.up.set(0, 1, 0);
                    this.camera.lookAt(0, 0, 0);
                    this.clippingControl.setClipping(1, true)
                    break
                case 2:
                    this.camera.position.set(16, 0, 0);
                    this.camera.up.set(0, 1, 0);
                    this.camera.lookAt(0, 0, 0);
                    this.clippingControl.setClipping(2, true)
                    break
            }
            this.camera.updateProjectionMatrix()
            this.renderScene()
        }

        let init = () => {
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            // Camera

            this.camera = new THREE.OrthographicCamera();
            setCameraSize(width, height)

            this.camera.position.set(0, 16, 0);
            this.camera.up.set(0, 0, 1);
            this.camera.lookAt(0, 0, 0);

            // Scene
            this.scene = new THREE.Scene();
            this.scene.add(this.camera)

            // Light
            const ambient = new THREE.AmbientLight(0x666666);
            this.scene.add(ambient);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
            directionalLight.position.set(- 1, 1, 1).normalize();
            this.camera.add(directionalLight);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            //this.renderer.localClippingEnabled = true
            this.renderer.setSize(width, height);
            this.renderer.setClearColor(0xFFFFFF, 0)
            this.domElement.appendChild(this.renderer.domElement);
            //renderer.setrenderSceneLoop(renderScene);

            //this.effect = new OutlineEffect(this.renderer);
            //this.effect.setSize(width, height)

            //let axesHelper = new THREE.AxesHelper(10)
            //this.scene.add(axesHelper)

            // Window Size Event
            window.addEventListener('resize', () => {
                onWindowResize()
            });

            //Cliping Control
            this.clippingControl = new SlicerControl(this.scene)
            this.clippingControl.addPlane()
            this.setClippingDim(new Array(3).fill(model_unit))
            this.setClippingRatio(axisXY, 0)
            this.setClippingRatio(axisXZ, 0)
            this.setClippingRatio(axisYZ, 0)
            this.clippingControl.setClippingeAll(true)
            this.clippingControl.setVisableAll(false)

            // Render
            loadModel();
            //console.log(model)

            //this.renderScene()
        }

        init()
    }

    setOnFocus(axis, option) {
        this.clippingControl.onFocus(axis, option)
        this.renderScene();
    }

    setClippingMesh(mesh) {
        this.clippingControl.addObject(mesh)
        this.renderScene();
    }

    setClippingDim(dims) {
        let nDims = [dims[0] / dims[2], dims[1] / dims[2], 1]
        this.clippingControl.thickness = this.thickness
        this.clippingControl.resize(nDims, 0, false)
        this.clippingControl.reset()
        this.renderScene();
    }

    setClippingRatio(type, ratio) {
        this.clippingControl.setIndexRatio(type, ratio)

        this.renderScene();
    }

    getClippingPlaneIndex() {
        return this.clippingControl.getClippingPlaneIndex() * 10
    }

    vmax = 1
    vration = 0.4
    vremain = this.vmax - this.vration
    renderScene() {
        //let x, y, width, height
        /**
         x = 0
         y = 0
         width = this.domElement.clientWidth * this.vration;
         height = this.domElement.clientHeight * this.vration;
         
         this.effect.setViewport(x, y, width, height)
         this.effect.setScissor(x, y, width, height)
         this.effect.setScissorTest(true)
         this.setModel(0)
         this.effect.render(this.scene, this.camera);
         
         
         x = width
         y = height
         width = this.domElement.clientWidth * this.vremain;
         height = this.domElement.clientHeight * this.vremain;
         
         this.effect.render(this.scene, this.camera);
         this.effect.setViewport(x, y, width, height)
         this.effect.setScissor(x, y, width, height)
         this.effect.setScissorTest(true)
         this.setModel(1)
         this.effect.render(this.scene, this.camera);
         */
        //this.setModel(0)
        this.renderer.render(this.scene, this.camera);
    }
}

// 體積投影模型生成
class VolumeViewer {
    constructor(domElement) {

        this.domElement = domElement
        this.camera = null
        this.renderer = null
        this.scene = null
        this.renderType = 0
        this.colormap = new Float32Array(256 * 4).fill(1)

        const model_unit = 1
        const camera_unit = 2

        let model = null

        this.renderVolume = (volDims, dataBuffer, spacing = [1, 1, 1], filterBuffer = null, sizeData) => {

            //console.log(volDims, dataBuffer, spacing = [1, 1, 1], filterBuffer = null, sizeData)

            let max = Math.max(volDims[0] * spacing[0], volDims[1] * spacing[1], volDims[2] * spacing[2])

            if (model == null) {

                //初始化紋理
                const datatexture = new THREE.DataTexture3D();
                const filtertexture = new THREE.DataTexture3D();
                const sizetextures = new THREE.DataTexture3D();

                datatexture.format = filtertexture.format = sizetextures.format = THREE.RedFormat;
                datatexture.type = filtertexture.type = sizetextures.type = THREE.UnsignedByteType;
                datatexture.minFilter = filtertexture.minFilter = sizetextures.minFilter = THREE.LinearFilter;
                datatexture.magFilter = filtertexture.magFilter = sizetextures.magFilter = THREE.LinearFilter;

                const colormaptexture = new THREE.DataTexture()
                colormaptexture.format = THREE.RGBAFormat
                colormaptexture.type = THREE.FloatType

                // THREE.Mesh
                const geometry = new THREE.BoxGeometry(volDims[0], volDims[1], volDims[2]);
                geometry.translate(volDims[0] / 2, volDims[1] / 2, volDims[2] / 2)

                // Material
                const shader = VolumeRenderShader1;
                const uniforms = THREE.UniformsUtils.clone(shader.uniforms);

                uniforms["u_data"].value = datatexture;
                uniforms["u_size"].value.set(volDims[0], volDims[1], volDims[2]);
                uniforms["u_clim"].value.set(0, 1);
                uniforms["u_renderstyle"].value = this.renderType;
                uniforms["u_cmdata"].value = colormaptexture;
                uniforms["u_filter"].value = filtertexture
                uniforms['u_sizeData'].value = sizetextures

                //設定材質
                const material = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: shader.vertexShader,
                    fragmentShader: shader.fragmentShader,
                    transparent: true,
                    side: THREE.BackSide // The volume shader uses the backface as its "reference point"
                });

                model = new THREE.Mesh(geometry, material);
                model.scale.set(
                    -model_unit / max * spacing[0],
                    model_unit / max * spacing[1],
                    model_unit / max * spacing[2])

                model.position.set(
                    volDims[0] * model_unit / max * spacing[0] / 2,
                    -volDims[1] * model_unit / max * spacing[1] / 2,
                    -volDims[2] * model_unit / max * spacing[2] / 2)

                let m = new THREE.Matrix4().identity()
                m.makeRotationX(-Math.PI / 2)
                model.applyMatrix4(m)
                m.makeRotationZ(Math.PI)
                model.applyMatrix4(m)

                this.scene.add(model)
            }

            //更新紋理
            let datatexture = model.material.uniforms["u_data"].value;
            if (dataBuffer == null) {
                datatexture.image.data = new Uint8Array(1).fill(255)
                datatexture.image.width = 1
                datatexture.image.height = 1
                datatexture.image.depth = 1
            }
            else {
                datatexture.image.data = dataBuffer
                datatexture.image.width = volDims[0];
                datatexture.image.height = volDims[1];
                datatexture.image.depth = volDims[2];
            }
            datatexture.needsUpdate = true;

            let sizetextures = model.material.uniforms["u_sizeData"].value;
            if (sizeData == null) {
                sizetextures.image.data = new Uint8Array(1).fill(255)
                sizetextures.image.width = 1
                sizetextures.image.height = 1
                sizetextures.image.depth = 1
            }
            else {
                sizetextures.image.data = sizeData
                sizetextures.image.width = volDims[0];
                sizetextures.image.height = volDims[1];
                sizetextures.image.depth = volDims[2];
            }
            sizetextures.needsUpdate = true;

            let filtertexture = model.material.uniforms["u_filter"].value;
            if (filterBuffer == null) {
                filtertexture.image.data = new Uint8Array(1).fill(255)
                filtertexture.image.width = 1
                filtertexture.image.height = 1
                filtertexture.image.depth = 1
            }
            else {
                filtertexture.image.data = filterBuffer
                filtertexture.image.width = volDims[0];
                filtertexture.image.height = volDims[1];
                filtertexture.image.depth = volDims[2];
            }
            filtertexture.needsUpdate = true;

            let colormaptexture = model.material.uniforms["u_cmdata"].value;
            colormaptexture.image.data = this.colormap;
            colormaptexture.image.width = 256
            colormaptexture.image.height = 1
            colormaptexture.needsUpdate = true;

            model.material.uniforms["u_size"].value.set(volDims[0], volDims[1], volDims[2]);
            model.material.uniforms["u_renderstyle"].value = this.renderType;
            model.material.uniformsNeedUpdate = true


            this.renderScene()
        }

        this.renderScene = () => {
            this.renderer.render(this.scene, this.camera)
        }

        this.copyCamera = (c) => {
            if (!(c instanceof THREE.Camera))
                return

            let zoom = this.camera.zoom
            this.camera.copy(c, false)
            this.camera.zoom = zoom
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            setCameraSize(width, height)
        }

        let setCameraSize = (width, height) => {
            let aspect = width / height
            this.camera.left = -aspect * camera_unit / 2
            this.camera.right = aspect * camera_unit / 2
            this.camera.top = camera_unit / 2
            this.camera.bottom = -camera_unit / 2
            this.camera.far = 100
            this.camera.near = 0.1
            this.camera.updateProjectionMatrix();
        }

        let init = () => {
            let width = domElement.clientWidth;
            let height = domElement.clientHeight;
            let aspect = width / height

            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
            this.renderer.setSize(width, height, false)
            this.renderer.setClearColor(0xFFFFFF, 0.0)
            this.domElement.appendChild(this.renderer.domElement)

            this.scene = new THREE.Scene()

            this.camera = new THREE.OrthographicCamera();
            setCameraSize(width, height)

            this.camera.position.set(10, 10, 10)
            this.camera.lookAt(0, 0, 0)
            this.scene.add(this.camera)

            window.addEventListener('resize', () => {
                width = domElement.clientWidth * 2;
                height = domElement.clientHeight * 2;

                aspect = width / height
                setCameraSize(width, height)

                this.renderer.setSize(width, height)
                this.renderScene()
            })

            this.renderScene()
        }

        init()
    }
}

// marching cubes 模型生成
class ModelViewer {

    sceneObject = {
        scene: null,
        camera: null,
        clippingControl: null,
        windowControl: null,
        light: {
            distance: 0,
            intensity: 0
        }
    }

    cardiacObject = {
        color: '0xFF0000',
        colorMap: null,
        volDims: [0, 0, 0],
        thickness: [1, 1, 1],
        ratio: -1,
        geometry: null,
        polygen: true,
        wireline: true
    }

    constructor(domElement) {
        if (WEBGL.isWebGL2Available() === false) {
            document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
        }

        this.full = false
        this.domElement = domElement
        this.renderer = null
        this.marchingCubes = null
        this.viewContructor()

        init("pkg/lib_bg.wasm").then(() => {
            this.marchingCubes = MarchingCubes.new()
        });

        this._data = null
    }

    viewContructor() {

        // Camera
        let width = this.domElement.clientWidth;
        let height = this.domElement.clientHeight;

        let camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.01, 2000);
        camera.position.set(800, 800, 800);
        camera.up.set(0, 1, 0);

        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0.9, 0.9, 0.9)

        // Light
        let directionalLight = new THREE.DirectionalLight(0xffffff, 1);

        camera.add(directionalLight)

        scene.add(new THREE.HemisphereLight(0x443333, 0x111122))
        scene.add(camera)

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height, true);

        this.renderer.localClippingEnabled = true
        this.domElement.appendChild(this.renderer.domElement);

        //axis landmark
        let axesHelper = new THREE.AxesHelper(800)
        scene.add(axesHelper)

        // Controller
        let windowControl = new OrbitControls(camera, this.renderer.domElement)
        windowControl.target.set(0, 0, 0)

        windowControl.addEventListener('change', () => {
            this.renderScene()
        })

        windowControl.enableRotate = true;
        //windowControl.minZoom = 0;
        //windowControl.maxZoom = 4;
        windowControl.update();


        this.sceneObject.scene = scene
        this.sceneObject.camera = camera
        this.sceneObject.clippingControl = new SlicerControl(scene)
        this.sceneObject.clippingControl.addPlane()
        this.sceneObject.clippingControl.addPlane()
        this.sceneObject.clippingControl.setVisableAll(false)
        this.sceneObject.windowControl = windowControl

        this.renderScene()

        window.addEventListener('resize', () => {
            let width = this.domElement.clientWidth
            let height = this.domElement.clientHeight
            this.renderer.setSize(width, height, true);
            this.sceneObject.camera.left = -width / 2
            this.sceneObject.camera.right = width / 2
            this.sceneObject.camera.top = height / 2
            this.sceneObject.camera.bottom = -height / 2
            this.sceneObject.camera.updateProjectionMatrix();
            this.renderScene()
        });
    }

    setModelData(uvdDims, dataBuffer, color, spacing) {
        //console.log(dataBuffer)
        //console.log(uvdDims)

        this.cardiacObject.thickness = spacing;
        this.cardiacObject.volDims = uvdDims;
        this.cardiacObject.color = color

        let padding = 5

        let p2 = 2 * padding
        let pDims = [uvdDims[0] + p2, uvdDims[1] + p2, uvdDims[2] + p2]
        let pSize = pDims[0] * pDims[1] * pDims[2];

        if (this._data == null || this._data.length != pSize) {
            this._data = new BinaryArray(pSize);
        }

        this._data.clear();

        //padding
        let counter = 0;
        let phSize = [uvdDims[0] + padding, uvdDims[1] + padding, uvdDims[2] + padding]
        for (let i = phSize[2] - 1; i >= padding; i--) {
            let step_i = i * pDims[1] * pDims[0];
            for (let j = padding; j < phSize[1]; j++) {
                let step_j = step_i + j * pDims[0];
                for (let k = padding; k < phSize[0]; k++) {
                    let step_k = step_j + k;
                    this._data.setValue(dataBuffer.getBit(counter++), step_k);
                }
            }
        }

        //console.log(counter)
        this.marchingCubes.set_volume(this._data.data, pDims[0], pDims[1], pDims[2]);

        let xyzDims = [pDims[0], pDims[2], pDims[1]]
        this.setClippingDim(xyzDims)
        this.setClippingRatio(axisXY, 0)
        this.setClippingRatio(axisXZ, 0)
        this.setClippingRatio(axisYZ, 0)
    }

    modelUpdate(evt, callback) {
        if (this.lock) {
            return
        }

        this.lock = true
        let scene = this.sceneObject.scene
        let color = this.cardiacObject.color
        //output two render result

        this.renderMeshAsync(1, "cardiac_mesh", scene, color).then(() => {
            let mesh = scene.getObjectByName("cardiac_mesh").children[0]
            let line = scene.getObjectByName("cardiac_mesh").children[1]

            this.cardiacObject.geometry = mesh.geometry
            this.sceneObject.clippingControl.addObject(mesh)
            this.sceneObject.clippingControl.addObject(line)
            this.sceneObject.clippingControl.updateAll()

            this.updateMeshState()
            this.renderScene()

            if (callback != null && callback instanceof Function) {
                callback()
            }
            this.lock = false
        });

    }

    setDistance(distance) {
        this.cardiacObject.distance = distance
    }

    setLightProfile(profit, update = true) {
        this.sceneObject.light = profit
        if (update) {
            this.updateLight()
        }
    }

    setQuality(value) {
        this.cardiacObject.quality = Number(value)
        this.updateLight()
    }

    setMeshVisible(option) {
        let mesh = this.sceneObject.scene.getObjectByName("cardiac_mesh")
        mesh.visible = option
        this.renderScene()
    }

    setRenderMode(option, enabled) {
        if (option == 'wireline') {
            this.cardiacObject.wireline = enabled
        } else if (option == 'polygen') {
            this.cardiacObject.polygen = enabled
        }

        this.updateMeshState()
        this.renderScene()
    }

    getLightProfit() {
        return this.sceneObject.light
    }

    updateLight() {
        let profit = this.sceneObject.light
        let light = this.sceneObject.camera.children[0]
        light.intensity = profit.intensity
        this.renderScene()
    }

    updateMeshState = () => {
        let mesh = this.sceneObject.scene.getObjectByName("cardiac_mesh")

        if (mesh == null) {
            return
        }

        mesh.children[0].visible = this.cardiacObject.polygen
        mesh.children[1].visible = this.cardiacObject.wireline
    }

    //切片控制器參數設置
    setClippingMesh(mesh) {
        this.sceneObject.clippingControl.addObject(mesh)
        this.renderScene();
    }

    setClippingDim(xyzDims) {
        this.sceneObject.clippingControl.resize([
            xyzDims[0] * this.cardiacObject.thickness[0],
            xyzDims[1] * this.cardiacObject.thickness[1],
            xyzDims[2] * this.cardiacObject.thickness[2],
        ], 1, true)

        this.sceneObject.clippingControl.reset()
        this.renderScene();
    }

    setClippingRatio(type, ratio, group) {
        this.sceneObject.clippingControl.setIndexRatio(type, ratio, group)
        this.renderScene();
    }

    setClippingEnable(axis, option) {
        this.sceneObject.clippingControl.setClipping(axis, option)
        this.renderScene()
    }

    getClippingPlaneIndex() {
        return this.sceneObject.clippingControl.getClippingPlaneIndex() * 10
    }

    get mesh() {
        return this.sceneObject.scene.getObjectByName('cardiac_mesh')
    }

    get vertices() {
        return this.sceneObject.scene.getObjectByName('cardiac_mesh').geometry.vertices
    }

    renderScene() {
        this.renderer.render(this.sceneObject.scene, this.sceneObject.camera);
    }

    renderMeshAsync = (ratio, id, scene, color) => {
        let _this = this
        return new Promise(
            function (resolve, reject) {
                _this.renderMesh(ratio, id, scene, color)
                resolve()
            }
        )
    }

    renderMeshRemote = () => {
        let xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {

        }
        xhr.open('GET', '')
        xhr.send()
    }

    textures = [
        new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, color: 0x0000FF, specular: 0x101010 }),
        new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
    ]

    renderThreeJSMesh = (xyzDims, ratio, id, scene, color) => {
        let size = Math.max(...xyzDims)
        let process = (mesh) => {

            let iStep, jStep, counter = 0
            for (let i = 0; i < xyzDims[2]; i++) {
                iStep = i * size * size
                for (let j = 0; j < xyzDims[1]; j++) {
                    jStep = j * size
                    for (let k = 0; k < xyzDims[0]; k++) {
                        mesh.field[iStep + jStep + k] = this._data.getBit(counter++);
                    }
                }
            }
        }

        let thickness = this.cardiacObject.thickness

        let group = scene.getObjectByName(id)
        if (group == null) {
            group = new THREE.Group()
            group.name = id

            let mesh = new mc.MarchingCubes(size);
            mesh.name = 'polygen'
            mesh.material = this.textures[0];
            mesh.isolation = 0;
            process(mesh);
            mesh.scale.set(...thickness)
            //mesh.scale.set(1/size,1/size,1/size)
            group.add(mesh)
            console.log(mesh, size)
            group.name = 'cardiac_mesh'
            group.position.set(0, 0.5 * size, 0)

            scene.add(group)
        } else {
            group.children[0].init(size);
            process(mesh);
        }
    }

    renderMesh = function (ratio, id, scene, color) {

        let vertice = this.marchingCubes.marching_cubes(ratio);
        let geometry = new THREE.BufferGeometry();

        geometry.setAttribute('position', new THREE.BufferAttribute(vertice, 3));
        geometry = mergeVertices(geometry)
        geometry.rotateX(-Math.PI / 2)
        geometry.computeVertexNormals()

        const material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide });
        const wireframe = new THREE.WireframeGeometry(geometry);

        // group[0]: mesh
        // group[1]: line
        let thickness = this.cardiacObject.thickness
        let group = scene.getObjectByName(id)
        if (group == null) {
            group = new THREE.Group()
            group.name = id

            let mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'polygen'
            mesh.scale.set(...thickness)
            group.add(mesh)

            let line = new THREE.LineSegments(wireframe);
            //line.material.depthTest = false;
            line.material.opacity = 0.6;
            line.material.transparent = true;
            line.name = 'wireframe'
            line.scale.set(...thickness)
            group.add(line)

            group.name = 'cardiac_mesh'

            scene.add(group)
        } else {
            group.children[0].geometry = geometry
            group.children[0].scale.set(...thickness)
            group.children[1].geometry = wireframe
            group.children[1].scale.set(...thickness)
        }
        //console.log(thickness)
    }
}

class BodyViewer {

    constructor(domElement) {
        this.scene = null
        this.camera = null
        this.clippingControl = null
        this.renderer = null
        this.domElement = domElement
        this.effect = null;
        this.thickness = [1, 1, 1]

        const camera_unit = 4.4
        const model_unit = 0.6
        const loader = new MMDLoader()

        let model = {
            cardiac: null,
            body: null
        }

        let setCameraSize = (width, height) => {
            let aspect = width / height
            this.camera.left = -aspect * camera_unit / 2
            this.camera.right = aspect * camera_unit / 2
            this.camera.top = camera_unit / 2
            this.camera.bottom = -camera_unit / 2
            this.camera.far = 100
            this.camera.near = 0.1
            this.camera.updateProjectionMatrix();
        }

        let onWindowResize = () => {
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            setCameraSize(width, height)
            this.renderer.setSize(width, height)
            this.renderScene()
        }

        // 初始模型載入
                // 初始模型載入
        let loadModel = () => {

            // 載入心臟模型
            new STLLoader().load('model/stl/heart.stl', (geometry) => {
                geometry.computeVertexNormals();
                geometry.computeBoundingBox();
                geometry.center();

                let min = geometry.boundingBox.min;
                let max = geometry.boundingBox.max;
                let scaleX = model_unit / (max.x - min.x);
                let scaleY = model_unit / (max.y - min.y);
                let scaleZ = model_unit / (max.z - min.z);

                geometry.scale(scaleX, scaleY, scaleZ);
                geometry.translate(0, 0, -0.1)

                const material = new THREE.MeshToonMaterial({
                    //depthWrite: false,
                    //renderOrder:0,
                    //depthTest:false,
                    side: THREE.DoubleSide,
                });

                const material2 = new THREE.MeshToonMaterial({
                    //depthWrite: false,
                    transparent: true,
                    opacity: 0.1,
                    side: THREE.DoubleSide
                });

                if (model.cardiac != null) {
                    this.scene.remove(model.cardiac);
                }


                model.cardiac = new THREE.Group()
                model.cardiac.add(new THREE.Mesh(geometry, material));
                //model[0].renderOrder = 2
                model.cardiac.add(new THREE.Mesh(geometry, material2));
                //model[0].visible = false;

                this.scene.add(model.cardiac);

                // Clipping Control
                this.addClippingMesh(model.cardiac.children[0]);

                this.renderScene();
            });

            // 載入人物模型
            loader.load('model/mmd/kizunaai/kizunaai.pmx', (mesh) => {
                mesh.position.set(0, -2.8, -0.4);
                mesh.scale.set(0.6,0.6,0.6)
                mesh.geometry.center();

                let materials = mesh.material;

                //There are some issues make the markers not able to show up properly. Close the depth test to ignore the problem.
                //Materials[4] is kizunaai's cloth.
                //materials[4].depthWrite = false;
                //materials[4].transparent = true;
                //materials[4].opacity = 0.4;

                
                for (let i = 0; i < materials.length; i++) {
                    materials[4] = new THREE.MeshToonMaterial()
                    materials[4].side = THREE.FrontSide
                    materials[4].depthWrite = false;
                    materials[4].depthTest = false;
                    materials[4].transparent = true;
                    materials[4].opacity = 0.4;
                }

                /*此處使用的PMXLoader是客製化的版本
                原版(ThreeJS)採用非同步的方式載入檔案，然而load function在僅有模型文件、貼圖尚在讀取狀態時便貿然執行，
                導致紋理方面的操作不可行，對此需要修改，額外加入判斷的方式處理
                */

                //當process數為0，表示貼圖讀取完成
                let wait = () => {
                    this.renderScene();
                    if (loader.meshBuilder.materialBuilder.process > 0) {
                        setTimeout(wait, 100);
                    } else {
                        console.log('complete');
                    }
                };

                if (model.body != null) {
                    this.scene.remove(model.body);
                }

                let group = new THREE.Group()
                group.add(mesh)
                //group.add(line)

                //console.log(group)

                model.body = group;
                model.body.visible = true;

                this.scene.add(model.body);
                this.renderScene();
                wait();
            });
        }

        this.copyCamera = (c) => {
            if (!(c instanceof THREE.Camera))
                return

            let zoom = this.camera.zoom
            this.camera.copy(c, false)
            this.camera.zoom = zoom
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            setCameraSize(width, height)
        }

        // 設置場景物件的顯示狀態
        this.enableModel = (index, option) => {

            // 切片控制
            if (index == 0) {
                this.setClippingPlaneEnablesd(option)
            }
            // 人物顯示
            else if (index == 1) {
                model.body.visible = option;
            }

            this.renderScene();
        }

        let init = () => {
            let width = this.domElement.clientWidth;
            let height = this.domElement.clientHeight;
            // Camera

            this.camera = new THREE.OrthographicCamera();
            setCameraSize(width, height)

            this.camera.position.set(8, 8, 8);
            this.camera.up.set(0, 1, 0);
            this.camera.lookAt(0, 0, 0);

            // Scene
            this.scene = new THREE.Scene();
            this.scene.add(this.camera)

            // Light
            const ambient = new THREE.AmbientLight(0x666666);
            this.scene.add(ambient);

            const directionalLight = new THREE.DirectionalLight(0x887766);
            //directionalLight.position.set(- 1, 1, 1).normalize();
            this.camera.add(directionalLight);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.localClippingEnabled = true
            this.renderer.setSize(width, height);
            this.renderer.setClearColor(0xFFFFFF, 0.0)
            this.domElement.appendChild(this.renderer.domElement);
            //renderer.setrenderSceneLoop(renderScene);

            this.effect = new OutlineEffect(this.renderer);
            this.effect.setSize(width, height)

            // Window Size Event
            window.addEventListener('resize', () => {
                onWindowResize()
            });

            // Clipping Control
            this.clippingControl = new SlicerControl(this.scene, 1);
            this.clippingControl.addPlane();
            this.clippingControl.resize([1, 1, 1], 0, [false, false, false])

            // Render
            loadModel();

            //this.renderScene()
        }

        init()
    }

    // 設置欲顯示的clipping plane
    setOnFocus(axis) {
        for (let i = 0; i < 3; i++) {
            if (i == axis) {
                this.clippingControl.onFocus(i, true)
            } else {
                this.clippingControl.onFocus(i, false)
            }
        }

        this.renderScene();
    }

    // 關閉所有顯示的clipping plane
    setNonFocus() {
        for (let i = 0; i < 3; i++) {
            this.clippingControl.onFocus(i, false)
        }

        this.renderScene();
    }

    // 將需要切片的模型加入切片控制器
    addClippingMesh(mesh) {
        this.clippingControl.addObject(mesh)
        this.renderScene();
    }

    // 設置切片控制器需要裁切的尺寸
    setClippingDim(dims) {
        let nDims = [dims[0] / dims[2], dims[1] / dims[2], 1]
        this.clippingControl.thickness = this.thickness
        this.clippingControl.resize(nDims, 0, false)
        this.clippingControl.reset()
        this.renderScene();
    }

    // 設置切片控制器當前裁切的方向與裁切位置(比例)
    setClippingRatio(type, ratio) {
        this.clippingControl.setIndexRatio(type, ratio)
        this.renderScene();
    }

    // 設置切片控制器當前裁切的方向與裁切位置(座標)
    getClippingPlaneIndex() {
        return this.clippingControl.getClippingPlaneIndex() * 10
    }

    // 設置切片控制器是否啟用
    setClippingPlaneEnablesd(option) {
        this.clippingControl.setClippingeAll(option)
    }

    // 渲染場景中的物件
    renderScene() {
        this.effect.render(this.scene, this.camera);
    }
}

class ModelControl {
    constructor(manager) {
        let dcmVolume = document.getElementById("dcmViewer");
        this.modelViewer = new ModelViewer(dcmVolume)

        //let dcmBody = document.getElementById("dcmBody");
        //this.subrenderer = new BodyViewer(dcmBody);

        let initFOV = () => {
            let directionCube = document.getElementsByClassName('cube')[0]
            let faces = directionCube.getElementsByClassName('cubeFace')
            let camera_radius = 800
            let wControl = this.modelViewer.sceneObject.windowControl
            for (let i = 0; i < faces.length; i++) {

                let process = (order) => {
                    let pos = new Array(3).fill(0)
                    switch (order) {
                        case 'TOP':
                            pos[1] = camera_radius
                            break
                        case 'BOTTOM':
                            pos[1] = -camera_radius
                            break
                        case 'LEFT':
                            pos[0] = -camera_radius
                            break
                        case 'RIGHT':
                            pos[0] = camera_radius
                            break
                        case 'FRONT':
                            pos[2] = camera_radius
                            break
                        case 'BACK':
                            pos[2] = -camera_radius
                            break
                        default:
                            console.error('Incorrect parameters')
                            break
                    }

                    wControl.object.position.set(...pos)
                }

                faces[i].addEventListener('click', () => {
                    let order = faces[i].dataset['order']
                    process(order)
                    wControl.update()
                })

            }

            let process = (evt) => {
                let mPosition = this.modelViewer.sceneObject.camera.position

                let pos = mPosition.clone().normalize().multiplyScalar(8)
                //this.subrenderer.camera.position.set(pos.x, pos.y, pos.z)
                //this.subrenderer.camera.lookAt(0, 0, 0)
                //this.subrenderer.renderScene()

                let target = wControl.target
                let eyePos = wControl.object.position

                let m = new THREE.Matrix4().identity()
                m.lookAt(eyePos, target, new THREE.Vector3(0, 1, 0))

                let q = new THREE.Quaternion()
                q.setFromRotationMatrix(m)

                directionCube.style.transform = `rotate3d(${q.x}, ${-q.y}, ${q.z}, ${Math.acos(q.w) * 2}rad)`
            }

            wControl.addEventListener('change', (evt) => {
                process()
            })

            process()
        }

        this.calculate = () => {
            let segment = manager.state.focusedSegment

            if (segment == null) {
                alert('No segment selected or create.')
                return
            }

            let dims = segment.dims
            let data = segment.data
            let color = segment.color
            let spacing = manager.state.info.spacing

            this.modelViewer.setModelData(dims, data, color, [spacing[0], spacing[2], spacing[1]])
            this.modelViewer.modelUpdate()
        }

        initFOV()

    }

}

class DcmController {

    constructor(manager) {

        let dimView = new DimensionView(manager)
        let volume = new VolumeViewer(document.getElementById('volumeView').querySelector('.viewport'))
        let body = new BodyViewer(document.getElementById('idolView').querySelector('.viewport'))
        let cadViews = new Array()

        document.querySelectorAll('.axis-plane3D').forEach((element) => {
            cadViews.push(new CADViewer(element))
        })

        let layouts = document.querySelectorAll(".viewer-layout")

        let funcbar = document.querySelectorAll(".viewer-layout > .viewer-bar")

        this.domElement = document.getElementById('workingScene')

        // 同步3D視窗之間的相機投影方向
        let cameraSync = (views) => {
            for (let i = 0; i < views.length; i++) {
                let controller = new OrbitControls(views[i].camera, views[i].domElement)
                controller.target.set(0, 0, 0)
                controller.update()

                controller.addEventListener('change', () => {

                    for (let j = 0; j < views.length; j++) {
                        if (i != j) {
                            views[j].copyCamera(views[i].camera)
                        }
                        views[j].renderScene()
                    }
                })
            }
        }

        this.scrollto = (axis, index) => {
            dimView.scrollto(axis, index)
            //cadView.setClippingRatio(axis, index)
            body.setClippingRatio(axis, index)
        }

        // axis == null: 更新所有方向的CT影像
        this.repaint = (axis) => {
            if (axis == null) {
                for (let i = 0; i < 3; i++) {
                    dimView.sliderUpdate(i)
                }
            } else {
                dimView.sliderUpdate(axis)
            }
        }

        this.updateVolume = () => {
            let state = manager.state

            let base = state.baseSegment

            // 檢查CT是否正確載入
            if (base == null) {
                return
            }

            // 當前正在使用的樣板
            let segment = state.focusedSegment
            let filterData = null

            // 以縮圖的形式載入樣板資料
            if (segment != null && segment.visible) {
                segment.generateThumbnail()
                filterData = segment.thumbnail
            }

            // transfer function 二維資料
            let tfData = state.transferData

            volume.colormap = state.colorSetting.colormap
            volume.renderType = state.volumeType

            volume.renderVolume(base.thumbnailSize, base.thumbnail, state.info.spacing, filterData, tfData.thumbnail)
        }

        this.updateData = () => {
            this.repaint()
            this.updateVolume()
        }

        const funcbtns = {
            sizeControl: {
                enable: true,
                imgsrc: 'img/svg/maximun.svg',
                icon: "fa-solid fa-up-right-and-down-left-from-center",
                process: (e, arg, layout) => {
                    if (layout.dataset.toggle == 'on') {
                        layout.classList.remove('centerViewer')
                        layout.dataset.toggle = 'off'
                        //e.srcElement.classList.remove('rotate180')
                        //e.srcElement.classList.add('rotate0')
                    } else {
                        layout.classList.add('centerViewer')
                        layout.dataset.toggle = 'on'
                        //e.srcElement.classList.remove('rotate0')
                        //e.srcElement.classList.add('rotate180')
                    }

                    setTimeout(() => {

                        window.dispatchEvent(resizeEvent)
                    }, 500)
                }
            },
            infoEnable: {
                enable: false,
                imgsrc: 'img/svg/info.svg',
                icon: 'fa-solid fa-info',
                process: (e, arg, layout) => {
                }
            },
            moveTop: {
                enable: true,
                imgsrc: 'img/svg/movetop.svg',
                icon: 'fa-solid fa-angles-up',
                process: (e, arg, layout) => {
                    //let value = (this.uvdDims[2 - index] > 0) ? 0 : -1
                    let slider = layout.querySelector(".viewer-slider")
                    slider.value = slider.min

                    this.scrollto(arg.index, Number(slider.value))
                }
            },
            moveCenter: {
                enable: true,
                imgsrc: 'img/svg/movecenter.svg',
                icon: 'fa-solid fa-arrow-down-up-across-line',
                process: (e, arg, layout) => {
                    //let value = parseInt(Number(this.uvdDims[2 - index] / 2 - 1))
                    let slider = layout.querySelector(".viewer-slider")
                    slider.value = (Number(slider.max) + Number(slider.min)) / 2

                    this.scrollto(arg.index, Number(slider.value))
                }
            },
            moveBottom: {
                enable: true,
                imgsrc: 'img/svg/movedown.svg',
                icon: 'fa-solid fa-angles-down',
                process: (e, arg, layout) => {
                    //let value = this.uvdDims[2 - index] - 1
                    let slider = layout.querySelector(".viewer-slider")
                    slider.value = slider.max

                    this.scrollto(arg.index, Number(slider.value))
                }
            },
            exposureInc: {
                enable: true,
                imgsrc: 'img/svg/exposureInc.svg',
                icon: 'fa-solid fa-info',
                process: (e, arg, layout) => {
                    let mImg = manager.maskImages[index]
                    if (mImg.exposure < 2) {
                        mImg.exposure += 0.1
                        this.sliderUpdate(arg.index)
                    }
                }
            },
            exposureDec: {
                enable: true,
                imgsrc: 'img/svg/exposureDec.svg',
                icon: 'fa-solid fa-info',
                process: (e, arg, layout) => {
                    let mImg = manager.maskImages[index]
                    if (mImg.exposure > 0.1) {
                        mImg.exposure -= 0.1
                        this.repaint(arg.index)
                    }
                }
            },
            contrastInc: {
                enable: true,
                imgsrc: 'img/svg/contrastInc.svg',
                icon: 'fa-solid fa-info',
                process: (e, arg, layout) => {
                    let mImg = manager.maskImages[index]
                    if (mImg.contrast < 2) {
                        mImg.contrast += 0.1
                        this.repaint(arg.index)
                    }
                }
            },
            contrastDec: {
                enable: true,
                imgsrc: 'img/svg/contrastDec.svg',
                icon: 'fa-solid fa-info',
                process: (e, arg, layout) => {
                    let mImg = manager.maskImages[index]
                    if (mImg.contrast > 0.1) {
                        mImg.contrast -= 0.1
                        this.repaint(arg.index)
                    }
                }
            },
            alphamap: {
                enable: true,
                imgsrc: 'img/svg/contrastDec.svg',
                icon: 'fa-solid fa-radiation',
                process: (e, arg, layout) => {
                    //volume.enableColorMap = false
                    manager.notify()
                }
            },
            colormap: {
                enable: true,
                imgsrc: 'img/svg/contrastDec.svg',
                icon: 'fa-solid fa-palette',
                process: (e, arg, layout) => {
                    //volume.enableColorMap = true
                    manager.notify()
                }
            },
            enableCardiac: {
                enable: true,
                imgsrc: 'img/svg/contrastDec.svg',
                icon: 'fa-solid fa-heart',
                process: (e, arg, layout) => {
                    if (layout.dataset.toggle == 'off') {
                        body.enableModel(0, true);
                        layout.dataset.toggle = 'true'
                    }
                    else {
                        body.enableModel(0, false);
                        layout.dataset.toggle = 'off'
                    }

                    manager.notify();
                }
            },
            enableBody: {
                enable: true,
                imgsrc: 'img/svg/contrastDec.svg',
                icon: 'fa-solid fa-person-dress',
                process: (e, arg, layout) => {
                    if (layout.dataset.toggle == 'off') {
                        body.enableModel(1, true);
                        layout.dataset.toggle = 'true'
                    }
                    else {
                        body.enableModel(1, false);
                        layout.dataset.toggle = 'off'
                    }

                    manager.notify();
                }
            },
            hideInfo: {
                enable: true,
                imgsrc: 'img/svg/info2.svg',
                icon: 'fa-solid fa-info',
                process: (e, arg, layer) => {
                    let base = layer.querySelector('.imgLayerInfo')
                    let title = layer.querySelector('.imgLayerTitle')
                    let slider = layer.querySelector('.imgLayerSlider')

                    if (base.dataset.toggle == 'on') {
                        base.classList.add('d-none')
                        title.classList.add('d-none')
                        slider.classList.add('d-none')
                        base.dataset.toggle = 'off'

                    } else {
                        base.classList.remove('d-none')
                        title.classList.remove('d-none')
                        slider.classList.remove('d-none')
                        base.dataset.toggle = 'on'
                    }

                }
            }
        }

        this.showBackground = (option) => {
            if (option) {

            }
            else {

            }
        }

        let init = () => {

            let pushBtn = (index, layout, funcs, arg) => {

                for (let funcname in funcs) {
                    let bfunc = funcs[funcname]

                    if (!bfunc.enable) {
                        continue
                    }

                    let btn = document.createElement('button')
                    let img = document.createElement('i')
                    img.classList = bfunc.icon

                    btn.appendChild(img)
                    btn.onclick = (e) => {
                        bfunc.process(e, arg, layout)
                    }

                    btn.classList.add('barfunc')

                    funcbar[index].appendChild(btn)
                }
            }

            let pushDivider = (index, layout) => {

                let divider = document.createElement('div')
                divider.classList.add('barDivider')

                funcbar[index].appendChild(divider)
            }

            //prevent screen from scrolling while dcm viewers scroll 
            let stopWindowScroll = {
                enable: false,
                func: (e) => {
                    if (stopWindowScroll.enable)
                        e.preventDefault()
                }
            }

            let passiveSupport = checkPassiveSupported(false)
            window.addEventListener('DOMMouseScroll', stopWindowScroll.func, false)
            window.addEventListener('wheel', stopWindowScroll.func, passiveSupport)
            window.addEventListener('touchmove', stopWindowScroll.func, passiveSupport)

            let mark = 0
            let onFocusedView = -1
            layouts.forEach((layout, key) => {

                // these tools inside the function bar used to justify the images information
                if (layout.dataset['layoutType'] == 'image') {

                    let slider = layout.querySelector('.viewer-slider')
                    slider.min = 0
                    slider.max = 1
                    slider.step = 0
                    let index = mark

                    let keyPressEvt = (evt) => {
                        let newValue = dimView.imgLayerValue[index]

                        if (evt.keyCode == 40) {
                            newValue++;
                        } else if (evt.keyCode == 38) {
                            newValue--
                        }

                        slider.value = dimView.Index2Ratio(index, newValue)
                        this.scrollto(index, Number(slider.value))
                    }

                    layout.addEventListener('mouseenter', () => {
                        stopWindowScroll.enable = true
                        body.setOnFocus(index)
                        window.addEventListener('keydown', keyPressEvt)
                    })

                    layout.addEventListener('mouseleave', () => {
                        stopWindowScroll.enable = false
                        body.setNonFocus()
                        window.removeEventListener('keydown', keyPressEvt)
                    })

                    layout.addEventListener('wheel', (e) => {
                        let distance = Number(slider.step) * e.deltaY
                        slider.value = Number(slider.value) + distance

                        this.scrollto(index, Number(slider.value))
                    }, checkPassiveSupported(true))

                    slider.addEventListener('input', () => {
                        this.scrollto(index, slider.value)
                    })

                    const btnFuns = {
                        main: [
                            funcbtns.sizeControl,
                        ],
                        sub: [
                            funcbtns.hideInfo
                        ]
                    }

                    let arg = {
                        index: mark
                    }

                    let topBtn = layout.querySelector('.goTop')
                    topBtn.classList.add("fa-2xl", "fa-solid", "fa-caret-left")
                    topBtn.addEventListener('click', () => {
                        slider.value = slider.min

                        this.scrollto(arg.index, Number(slider.value))
                    })

                    let bottomBtn = layout.querySelector('.goBottom')
                    bottomBtn.classList.add("fa-2xl", "fa-solid", "fa-caret-right")
                    bottomBtn.addEventListener('click', () => {
                        slider.value = slider.max

                        this.scrollto(arg.index, Number(slider.value))
                    })

                    slider.addEventListener('dblclick', () => {
                        slider.value = (Number(slider.max) + Number(slider.min)) / 2

                        this.scrollto(arg.index, Number(slider.value))
                    })

                    pushBtn(key, layout, btnFuns.main)
                    pushDivider(key, layout)
                    pushBtn(key, layout, btnFuns.sub)

                    mark += 1
                } else if (layout.dataset['layoutType'] == 'volume') {
                    const btnFuns = {
                        main: [
                            funcbtns.sizeControl,
                        ],
                        sub: [
                        ]
                    }

                    pushBtn(key, layout, btnFuns.main)
                    pushDivider(key, layout)
                    pushBtn(key, layout, btnFuns.sub)
                } else if (layout.dataset['layoutType'] == 'cad') {
                    const btnFuns = {
                        main: [

                        ],
                        sub: [

                        ]
                    }

                    pushBtn(key, layout, btnFuns.main)
                    pushDivider(key, layout)
                    pushBtn(key, layout, btnFuns.sub)

                } else if (layout.dataset['layoutType'] == 'idol') {
                    const btnFuns = {
                        main: [
                            funcbtns.enableCardiac,
                            funcbtns.enableBody
                        ],
                        sub: [

                        ]
                    }

                    pushBtn(key, layout, btnFuns.main)

                }
            })

            cameraSync([volume, body, ...cadViews])

            body.setNonFocus()

            manager.addNotifyEvent(() => {
                this.updateVolume();
            }, 'colormap');

            manager.addNotifyEvent(() => {
                this.updateVolume();
            });

            let base = manager.state.baseSegment
            if (base == null) {
                return
            }

            dimView.setDcmViewerDims(base.dims)
        }

        init()


    }

}

export { DcmController, ModelControl, SignalDistribution, Histogram }
