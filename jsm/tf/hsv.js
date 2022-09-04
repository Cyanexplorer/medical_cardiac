import * as THREE from './../build/three.module.js'
import { RGBType, HSVType } from './colorSpaceConvertor.js'

let instance = null

class HSV {

    static getInstance() {
        if (instance == null) {
            instance = new HSV()
        }

        return instance
    }

    constructor() {

        const CENTRAL_X = 300.0
        const CENTRAL_Y = 100.0
        const WHEEL_RADIUS = 80
        const wheel_thick = 20;

        this.drawLittleTriangle = function (t) {

            let vertex = new Float32Array([
                t.x, 25, 0,
                t.x - 10, 25 - 15, 0,
                t.x + 10, 25 - 15, 0
            ])

            let rgb = t.hsv.to_RGB();

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            const material = new THREE.MeshBasicMaterial()
            material.setValues({ color: new THREE.Color(rgb.R, rgb.G, rgb.B) })

            return new THREE.Mesh(geometry, material)
        }

        this.updateLittleTriangle = function (mylist, target) {
            let group = new THREE.Group()
            for (let i = 0; i < mylist.length; i++) {
                group.add(this.drawLittleTriangle(mylist[i]))
            }

            if (target != null) {
                let vertex = new Float32Array([
                    target.x + 10, 25 - 25, 0,
                    target.x + 10, 25 - 15, 0,
                    target.x - 10, 25 - 15, 0,
                    target.x + 10, 25 - 25, 0,
                    target.x - 10, 25 - 15, 0,
                    target.x - 10, 25 - 25, 0
                ])

                let rgb = target.hsv.to_RGB()

                const geometry = new THREE.BufferGeometry()
                geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

                const material = new THREE.MeshBasicMaterial()
                material.setValues({ color: new THREE.Color(rgb.R, rgb.G, rgb.B) })

                group.add(new THREE.Mesh(geometry, material))
            }

            return group
        }

        this.drawHistogram = function () {

            let geometry, material, vertex, group


            group = new THREE.Group()

            // �έp�Ϫ��ؽu
            vertex = new Float32Array([
                0, 25 + 200, 0,
                256, 25 + 200, 0,
                256, 25 + 299, 0,
                0, 25 + 299, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0x666666 })

            group.add(new THREE.LineLoop(geometry, material))

            vertex = new Float32Array([
                0, 25 - 15, 0,
                256, 25 - 15, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0x666666 })

            //group.add(new THREE.LineSegments(geometry, material))

            vertex = new Float32Array([
                0, 25, 0,
                256, 25, 0,
                256, 25 + 180, 0,
                0, 25 + 180, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0x666666 })

            group.add(new THREE.LineLoop(geometry, material))

            vertex = new Float32Array([
                200, 200, 0,
                250, 225, 0,
                200, 250, 0
            ])

            return group
        }

        // �ǫ�->�ⶥ��Alpha�ܤƦ��u
        this.drawPath = function (path) {
            let vertex = new Array()
            for (let i = 0; i < 256; i++)
                vertex.push(new THREE.Vector2(0 + i, 25 + path[i]))


            let geometry = new THREE.BufferGeometry().setFromPoints(vertex)

            return new THREE.Line(geometry)
        }

        this.getMinMax = function (logEnable, array) {
            if (array.length <= 0) {
                return { min: 0, max: 0 }
            }

            let minValue = Math.log(array[0] + 1)
            let maxValue = Math.log(array[0] + 1)
            let value

            if (logEnable) {
                minValue = Math.log(minValue)
                maxValue = Math.log(maxValue)

                for (let i = 1; i < array.length; i++) {
                    value = Math.log(array[i] + 1)
                    if (value > maxValue) {
                        maxValue = value
                    }
                    else if (value < minValue) {
                        minValue = value
                    }
                }

            }

            else {
                for (let i = 1; i < array.length; i++) {
                    value = array[i] + 1
                    if (value > maxValue) {
                        maxValue = value
                    }
                    else if (value < minValue) {
                        minValue = value
                    }
                }
            }

            return { min: minValue, max: maxValue }

        }

        // �ǫ�->RGBA�ⶥ�M�g
        this.drawColorSample = function (rgba) {
            let geometry, material, vertex, group

            group = new THREE.Group()

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 6), 3))
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(256 * 6), 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ vertexColors: THREE.VertexColors })

            group.add(new THREE.LineSegments(geometry, material))

            vertex = new Float32Array([
                256, 205, 0,
                0, 205, 0,
                0, 225, 0,
                256, 225, 0
            ])

            geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertex, 3))

            material = new THREE.LineBasicMaterial()
            material.setValues({ 'color': 0x666666 })

            group.add(new THREE.LineLoop(geometry, material))

            //console.log(group)
            this.updateColorSample(group, rgba)

            return group
        }

        this.updateColorSample = function (group, rgba) {
            let vertex = group.children[0].geometry.attributes.position.array
            let color = group.children[0].geometry.attributes.color.array

            for (let i = 0; i < 256; i++) {
                color.set([
                    rgba[0][i] * rgba[3][i], rgba[1][i] * rgba[3][i], rgba[2][i] * rgba[3][i],
                    rgba[0][i] * rgba[3][i], rgba[1][i] * rgba[3][i], rgba[2][i] * rgba[3][i]
                ], i * 6);

                vertex.set([
                    i, 205, 0,
                    i, 225, 0
                ], i * 6);
            }
        }

        // �ǫ�->RGB�ⶥ�M�g
        this.drawRainbow = function (rgba) {

            const geometry = new THREE.BufferGeometry()

            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 6), 3))
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(256 * 6), 3))

            const material = new THREE.LineBasicMaterial()
            material.setValues({ vertexColors: THREE.VertexColors })

            let mesh = new THREE.LineSegments(geometry, material)
            this.updateRanibow(mesh, rgba)
            return mesh
        }

        this.updateRanibow = function (mesh, rgba) {
            let vertex = mesh.geometry.attributes.position.array
            let color = mesh.geometry.attributes.color.array

            for (let i = 0; i < 256; i++) {
                color.set([
                    rgba[0][i], rgba[1][i], rgba[2][i],
                    rgba[0][i] * rgba[3][i], rgba[1][i] * rgba[3][i], rgba[2][i] * rgba[3][i]
                ], i * 6);

                vertex.set([
                    i, 25, 0,
                    i, 25 + 180, 0
                ], i * 6)
            }
        }

    }
}


class LittleTriangle {
    constructor(value) {
        this.x = 0
        this.hsv = new HSVType()
        this.marker = document.createElement('input')
        this.marker.type = 'color'
        this.marker.style.position = 'absolute'
        this.marker.style.border = '3px solid rgba(255,255,255,0.4)'
        this.marker.style.borderRadius = '50%'
        this.marker.style.overflow = 'overlay'

        this.x = value != null ? value : 0 

        this.compare = function (t) {
            return x == t.x
        }

        this.copy = () => {
            let t = new LittleTriangle()
            t.x = this.x
            t.marker = this.marker.cloneNode(true)
            t.hsv.set(this.hsv.H, this.hsv.S, this.hsv.V)
            return t
        }

        this.setColor = (r, g, b) => {

            this.hsv.setFromRGB(r, g, b)
            this.marker.value = this.hsv.to_string()

        }
        
        this.setColor(255, 0, 0)

    }

    set pos(value) {
        this.marker.style.left = 'calc(' + value * 100 + '% - 10px)' 
    }

}

export { HSV, LittleTriangle }








