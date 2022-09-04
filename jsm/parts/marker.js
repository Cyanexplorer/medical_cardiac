import * as THREE from "../build/three.module.js";
const opacity_focused = 0.4
const opacity_not_focused = 0.1
var createMarker = function (scene, name, axis, dimu, dimv, color, style) {
    var geometry = null
    var material = null
    var mesh = null
    //console.log(style)
    if (style == 0) {
        geometry = new THREE.PlaneGeometry(dimu, dimv)
        material = new THREE.MeshBasicMaterial(color);
        mesh = new THREE.Mesh(geometry, material);

    } else {
        var w = dimu / 2
        var h = dimv / 2
        var points = [
            new THREE.Vector2(w, h),
            new THREE.Vector2(-w, h),
            new THREE.Vector2(-w, -h),
            new THREE.Vector2(w, -h),
            new THREE.Vector2(w, h)
        ]

        color['opacity'] = 1
        geometry = new THREE.BufferGeometry().setFromPoints(points);
        material = new THREE.LineBasicMaterial(color);
        mesh = new THREE.Line(geometry, material);
    }
    //console.log(mesh)
    if (axis == axisXZ) {
        mesh.geometry.rotateX(-Math.PI / 2)
    } else if (axis == axisYZ) {
        mesh.geometry.rotateZ(Math.PI / 2)
        mesh.geometry.rotateY(Math.PI / 2)
    }


    //console.log(mesh)
    //check if there are any marker with the same name
    var pre_mesh = scene.getObjectByName(name)
    if (pre_mesh != null) {
        scene.remove(pre_mesh)
    }


    mesh.name = name
    //mesh.renderOrder = 1
    scene.add(mesh)

}

var generate = function (axis) {
    var color = null
    var opacity = opacity_not_focused
    var hidden = true

    if (axis == axisXY) {
        color = {color: 0x00FF00, opacity: opacity, transparent: hidden, side: THREE.DoubleSide, depthWrite:false};
    } else if (axis == axisXZ) {
        color = {color: 0xFF0000, opacity: opacity, transparent: hidden, side: THREE.DoubleSide, depthWrite:false}
    } else if (axis == axisYZ) {
        color = {color: 0x0000FF, opacity: opacity, transparent: hidden, side: THREE.DoubleSide, depthWrite:false}
    }

    var marker = {
        "object": null,
        "color": color,
        "constant": 0,
        "isClipping": true,
        "style": 0
    }

    return marker;
}

class SlicerControl {
    constructor(scene, style = 0, size = 1) {
        this.scene = scene
        this.planes = []
        this.objects = []
        this.xyzDims = [1, 1, 1]
        this.markers = {}
        this.size = size

        this.invert = () => {
            for (let mesh of this.objects.length) {
                for (let plane of mesh.material.clippingPlanes) {
                    plane.normal.multiplyScalar(-1)
                }
            }
        }

        this.markers[axisXY] = generate(axisXY)
        this.markers[axisXZ] = generate(axisXZ)
        this.markers[axisYZ] = generate(axisYZ)

        this.initMarker(style)
        this.reset()
    }

    initMarker(style) {
        createMarker(this.scene, clpPlaneXY, axisXY, this.xyzDims[0], this.xyzDims[1], this.markers[axisXY].color, style)
        createMarker(this.scene, clpPlaneXZ, axisXZ, this.xyzDims[0], this.xyzDims[2], this.markers[axisXZ].color, style)
        createMarker(this.scene, clpPlaneYZ, axisYZ, this.xyzDims[1], this.xyzDims[2], this.markers[axisYZ].color, style)

        this.markers[axisXY].object = this.scene.getObjectByName(clpPlaneXY);
        this.markers[axisXZ].object = this.scene.getObjectByName(clpPlaneXZ);
        this.markers[axisYZ].object = this.scene.getObjectByName(clpPlaneYZ);
    }

    updatePlane(marker, axis, group = 0) {
        
        let index = axis + group * 3;
        let s = group % 2 == 0 ? 1 : -1;

        if (this.planes.length <= 0 || this.planes.length <= index) {
            return;
        }

        if (marker.isClipping) {
            this.planes[index].constant = marker.constant * s;
        } else {
            //if the clipping plane is disable, move it to the edge of axis
            this.planes[index].constant = this.xyzDims[index] / 2 * s;
    }
    }

    setIndex(axis, index, group = 0) {
        //console.log(index , this.xyzDims[axis])
        var marker
        var index

        //XY plane
        if (axis == axisXY) {
            marker = this.markers[axis]
            marker.object.position.set(0, 0, index)
        }

        //XZ plane
        else if (axis == axisXZ) {
            marker = this.markers[axis]
            marker.object.position.set(0, index, 0)
        }

        //YZ plane
        else if (axis == axisYZ) {
            marker = this.markers[axis]
            marker.object.position.set(index, 0, 0)
        }

        marker.constant = index;
        this.updatePlane(marker, axis, group)
    }

    //move markers and clipping plane to the definite position which corresponding to the current showing dicom image
    setIndexRatio(axis, ratio, group = 0) {
        //console.log(ratio)

        var marker
        var index

        //XY plane
        if (axis == axisXY) {
            index = this.xyzDims[2] / 2 - this.xyzDims[2] * ratio
            marker = this.markers[axis]
            marker.object.position.set(0, 0, index)
        }

        //XZ plane
        else if (axis == axisXZ) {
            index = this.xyzDims[1] / 2 - this.xyzDims[1] * ratio
            marker = this.markers[axis]
            marker.object.position.set(0, index, 0)
        }

        //YZ plane
        else if (axis == axisYZ) {
            index = this.xyzDims[0] / 2 - this.xyzDims[0] * ratio
            marker = this.markers[axis]
            marker.object.position.set(index, 0, 0)
        }

        marker.constant = index;
        this.updatePlane(marker, axis, group)
    }

    onFocus(axis, option) {
        if (option) {
            this.markers[axis].object.material.opacity = opacity_focused
            this.markers[axis].object.material.visible = true
        } else {
            this.markers[axis].object.material.opacity = opacity_not_focused
            this.markers[axis].object.material.visible = false
        }
    }

    //重置切片位置
    reset() {
        let ivt = 0
        for (let g = 0; g < this.groupSize; g++) {
            if (g % 2 == 0) {
                ivt = 0
            } else {
                ivt = 1
            }

            this.setIndexRatio(axisXY, ivt, g)
            this.setIndexRatio(axisXZ, ivt, g)
            this.setIndexRatio(axisYZ, ivt, g)
        }
    }

    //重置切片大小
    resize(dims, style, clipping) {
        this.xyzDims = dims
        //console.log(dims)

        this.initMarker(style)

        if (clipping == null) {
            return
        } else if (clipping.length == 1) {
            this.setClipping(axisXZ, clipping[axisXZ])
        } else if (clipping.length == 3) {
            this.setClipping(axisXY, clipping[axisXY])
            this.setClipping(axisXZ, clipping[axisXZ])
            this.setClipping(axisYZ, clipping[axisYZ])
        }

    }

    //tell markers the clipping object
    addObject(mesh) {

        for (var i = 0; i < this.objects.length; i++) {
            if (mesh.id == this.objects.id) {
                console.log('SlicerControl: model exist')
                return
            }
        }

        mesh.material.clippingPlanes = this.planes
        this.objects.push(mesh)
    }

    get groupSize() {
        return this.planes.length / 3
    }

    //新增切片
    addPlane = () => {
        let s = this.groupSize % 2 == 0 ? -1 : 1
        let subplanes = [
            new THREE.Plane(new THREE.Vector3(0, s, 0), 0),
            new THREE.Plane(new THREE.Vector3(0, 0, s), 0),
            new THREE.Plane(new THREE.Vector3(s, 0, 0), 0)
        ]

        this.planes.push(...subplanes)
    }

    removePlane = () => {
        this.planes.pop()
        this.planes.pop()
        this.planes.pop()
    }

    setVisable(axis, option) {
        //option: true / false
        //axis: slicerXY/XZ/YZ
        this.markers[axis].object.visible = option
        //console.log(this.markers[axis], option)
    }

    setVisableAll(option) {
        for (var i = 0; i < 3; i++) {
            this.setVisable(i, option)
        }
    }

    setClipping(axis, option) {
        //option: true / false
        //axis: slicerXY/XZ/YZ

        let marker = this.markers[axis]
        marker.isClipping = option
        this.updatePlane(marker, axis)
    }

    setClippingeAll(option) {
        for (let i = 0; i < 3; i++) {
            this.setClipping(i, option)
        }
    }

    updateAll() {

        this.updatePlane(this.markers[axisYZ], axisYZ)
        this.updatePlane(this.markers[axisXZ], axisXZ)
        this.updatePlane(this.markers[axisXY], axisXY)
    }
}



export { SlicerControl };
