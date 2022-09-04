import * as THREE from "./../build/three.module.js";
import { InputModule } from './inputModule.js'
import { HSV, LittleTriangle } from './hsv.js'

// three.js UI�����]�m
class ControlView extends THREE.EventDispatcher {

    constructor(domElement, arg, onload) {
        super()
        let renderer = null
        let scene = null
        let camera = null
        let width = 256
        let height = 180
        let unit = 1

        let hsvInstance = HSV.getInstance()
        let changeEvent = { type: 'change' }

        const contentLayer = 2
        const textLayer = 3

        this.updateVolumeData = function (volume) {

            let width = volume.dims[0]
            let height = volume.dims[1]
            let depth = volume.dims[2]

            arg.histogram.fill(0)

            for (let i = 0, wh = width * height; i < depth; i++) {
                for (let j = 0, iStep = i * wh; j < height; j++) {
                    for (let k = 0, jStep = j * width; k < width; k++) {
                        arg.histogram[volume.alpha[iStep + jStep + k]]++;
                    }
                }
            }

            this.updateRGBA()
        }

        // �ﭫ�Ƽҫ��ˬd�H�ΦA�Q��
        let exist = function (name, mesh) {
            if (mesh instanceof THREE.Group) {
                groupExist(name, mesh)
            }
            else {
                meshExist(name, mesh)
            }
        }

        let meshExist = function (name, mesh) {
            let preMesh = scene.getObjectByName(name)
            if (preMesh != null) {
                preMesh.geometry = mesh.geometry
                preMesh.material = mesh.material
            }
            else {
                mesh.name = name
                scene.add(mesh)
            }
        }

        let groupExist = function (name, group) {
            let preGroup = scene.getObjectByName(name)
            if (preGroup != null) {
                preGroup.children = group.children
            }
            else {
                group.name = name
                scene.add(group)
            }
        }

        this.initUI = function () {

            const histogramContent = hsvInstance.drawRainbow(arg.rgba)
            histogramContent.renderOrder = contentLayer

            const alphaPath = hsvInstance.drawPath(arg.path)
            alphaPath.renderOrder = textLayer

            exist('hContent', histogramContent)
            //exist('hSample', histogramSample)
            exist('alpha', alphaPath)
            //exist('markers', markers)
            renderScene()

            this.dispatchEvent(changeEvent)
        }

        // ��s����O�W���Ѽ����
        this.updateRGBA = function () {

            const histogramContent = hsvInstance.drawRainbow(arg.rgba)
            histogramContent.renderOrder = contentLayer

            //const histogramSample = hsvInstance.drawColorSample(arg.rgba)
            //histogramSample.renderOrder = contentLayer

            const alphaPath = hsvInstance.drawPath(arg.path)
            alphaPath.renderOrder = textLayer

            //const markers = hsvInstance.updateLittleTriangle(arg.mylist, arg.clickTriangle)
            //markers.renderOrder = textLayer


            exist('hContent', histogramContent)
            //exist('hSample', histogramSample)
            exist('alpha', alphaPath)
            //exist('markers', markers)
            renderScene()

            this.dispatchEvent(changeEvent)
        }

        let renderScene = function () {
            renderer.render(scene, camera)
        }

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height, false)
        renderer.setClearColor(0xffffff, 0.0)
        renderer.domElement.style.width = '100%'
        renderer.domElement.style.border = '5px double #adb0b4'
        domElement.append(renderer.domElement)

        // Scene
        scene = new THREE.Scene()

        // Camera
        camera = new THREE.OrthographicCamera(-width / 2 * unit, width / 2 * unit, height / 2 * unit, -height / 2 * unit, 0.1, 2)
        camera.position.set(width / 2, height / 2 + 25, 1)
        scene.add(camera)

        // Light
        let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        scene.add(directionalLight)

        let inputInstance = InputModule.getInstance(arg, domElement)

        renderer.domElement.addEventListener('mousemove', (evt) => {
            evt.preventDefault()

            // �̽������I���H�~���ƥ�
            if (evt.buttons != 1 || evt.button != 0) {
                return
            }

            let pos = getMousePos(renderer.domElement, evt)
            inputInstance.mouseMoveHandler2(pos[0], pos[1])
            this.updateRGBA()
        })


        //ColorPicker
        let colorPicker = document.createElement('div')
        colorPicker.style.width = '100%'
        colorPicker.style.height = '20px'
        colorPicker.style.backgroundColor = 'grey'
        colorPicker.style.borderRadius = '10px'
        colorPicker.style.position = 'relative'
        colorPicker.style.marginTop = '10px'
        domElement.append(colorPicker)

        let action = -1

        function createTriangle(pos) {

            let t = new LittleTriangle();
            t.x = pos2color(pos)
            t.pos = pos
            arg.mylist.push(t);

            pushMarker(t)
        }

        let pos2color = (pos) => {
            return Math.round(pos * 255)
        }

        let pushMarker = (t) => {
            colorPicker.appendChild(t.marker)

            t.marker.addEventListener('input', (evt) => {

                let hex = t.marker.value
                let r = parseInt(hex.substring(1, 3), 16)
                let g = parseInt(hex.substring(3, 5), 16)
                let b = parseInt(hex.substring(5, 7), 16)

                t.setColor(r, g, b)

                arg.fillColorUpdate()
                this.updateRGBA()
            })

            t.marker.addEventListener('mousedown', (evt) => {
                if (evt.buttons != 1 || evt.button != 0) {
                    return
                }
                action = -1
                arg.clickTriangle = t

                evt.stopPropagation()
            })

            t.marker.addEventListener('contextmenu', (evt) => {

                if (evt.buttons != 0 || evt.button != 2) {
                    return
                }

                arg.mylist.splice(arg.mylist.indexOf(t), 1)

                colorPicker.removeChild(t.marker)
                arg.clickTriangle = null;

                this.updateRGBA()
                arg.fillColorUpdate()
            })

            t.marker.addEventListener('click', (evt) => {
                if (evt.buttons != 0 || evt.button != 0) {
                    return
                }

                if (action != -1) {
                    evt.preventDefault()
                }
            })

            window.addEventListener('mouseup', () => {
                arg.clickTriangle = null
            })
        }

        this.updateMarkers = () => {
            colorPicker.innerHTML = ''
            for (let i = 0; i < arg.mylist.length; i++) {
                arg.mylist[i].pos = arg.mylist[i].x / 255

                pushMarker(arg.mylist[i])
            }
        }

        colorPicker.addEventListener('mousedown', (evt) => {
            if (evt.buttons != 1 || evt.button != 0) {
                return
            }

            let pos = getMousePosNonScale(colorPicker, evt)[0]

            if (pos < 20) {
                pos = 20
            }

            if (pos > colorPicker.clientWidth -20) {
                pos =  colorPicker.clientWidth - 20
            }

            pos /= colorPicker.clientWidth
            createTriangle(pos);

            arg.fillColorUpdate()
            this.updateRGBA()
        })

        colorPicker.addEventListener('mousemove', (evt) => {
            if (evt.buttons != 1 || evt.button != 0) {
                return
            }

            let marker = arg.clickTriangle

            if (marker == null || marker.x == 0 || marker.x == 255)
                return

            let pos = getMousePosNonScale(colorPicker, evt)[0]

            if (pos < 20) {
                pos = 20
            }

            if (pos > colorPicker.clientWidth -20) {
                pos =  colorPicker.clientWidth - 20
            }

            pos /= colorPicker.clientWidth

            marker.x = pos2color(pos);
            marker.pos = pos

            arg.fillColorUpdate()
            this.updateRGBA()

            action = 0
        })


        this.initUI()

    }
}



export { ControlView }