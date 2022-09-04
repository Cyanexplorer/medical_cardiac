import * as THREE from "./../threejs/build/three.module.js";
import { VolumeRenderShader1 } from './VolumeShader.js'
import { OrbitControls } from './../threejs/examples/jsm/controls/OrbitControls.js'

class threejsViewer {
    constructor(domElement) {

        let width = domElement.clientWidth;
        let height = domElement.clientHeight;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0xE6E6FA, 1.0)
        domElement.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        let fieldOfView = 45.0;
        let aspect = window.innerWidth / window.innerHeight;
        let nearPlane = 0.1;
        let farPlane = 50.0;

        this.camera = new THREE.PerspectiveCamera(fieldOfView, aspect, nearPlane, farPlane);
        this.camera.position.set(2, 1, 2)
        this.scene.add(this.camera)

        // Light
        let directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(1, 1, 1)
        
        this.scene.add(directionalLight)
        this.scene.add(new THREE.HemisphereLight(0x443333, 0x111122))

        // Controller
        let controller = new OrbitControls(this.camera, this.renderer.domElement)
        controller.target.set(0, 0.5, 0)
        controller.update()

        controller.addEventListener('change', () => {
            this.renderScene()
        })
        
        //Axis Landmark
        const axesHelper = new THREE.AxesHelper(100)
        this.scene.add(axesHelper)

        // Ground
        const plane = new THREE.Mesh(
            new THREE.CircleGeometry(2, 30),
            new THREE.MeshPhongMaterial({ color: 0xbbddff, opacity:0.4, transparent: true })
        );
        plane.rotation.x = - Math.PI / 2;
        this.scene.add(plane);

        const sphere = new THREE.Mesh(
            new THREE.SphereBufferGeometry(10, 20, 10),
            new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.BackSide })
        );
        sphere.rotation.x = - Math.PI / 2;

        this.renderScene = function() {

            //render scene
            this.renderer.render(this.scene, this.camera);
        }

        //�����ܰʮ� �A��s�e���j�p�H�ά۾�(��v�x�})ø�s�����
        window.addEventListener('resize', () => {
            //update render canvas size
            let width = window.innerWidth
            let height = window.innerHeight
            this.renderer.setSize(width, height);

            //update camera project aspect
            let aspect = width / height;
            this.camera.aspect = aspect
            this.camera.updateProjectionMatrix();

            this.renderScene()
        })

        let getMinMax = function (dataBuffer) {
            if (dataBuffer.length <= 0) {
                return { min: 0, max: 0 }
            }
            else if (dataBuffer.length == 1) {
                return { min: dataBuffer[0], max: dataBuffer[0] }
            }

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

            return { min: min, max: max }
        }

        //���I�y�Хͦ��ҫ�
        /**
         * 
         * @param {any} dims: ��ƪ�����
         * @param {any} vertices: �I�y�а}�C�A�Hunsigned int array�x�s
         * @param {any} vertexCount: �}�C�ƧǪ����q�A�q�`�H3����ƥͦ��@�Ӹ`�I
         */
        this.loadModelfromVertices = function (dims, vertices, meshCount) {
            let scaleSize = 1 / getMinMax(dims).min

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, vertexCount));
            geometry.translate(-dims[0] / 2, -dims[1] / 2, -dims[2] / 2)
            geometry.computeVertexNormals()

            let mesh = this.scene.getObjectByName('model')

            if (mesh != null && mesh instanceof THREE.Object3D) {
                mesh.geometry = geometry
            }
            else {
                const material = new THREE.MeshStandardMaterial({ color: 0x0055ff, flatShading: true, side: THREE.DoubleSide });
                mesh = new THREE.Mesh(geometry, material)
                mesh.name = 'model'
            }

            mesh.position.set(0, dims[1] * scaleSize / 2, 0)
            mesh.scale.set(scaleSize, scaleSize, scaleSize)
            
            this.scene.add(mesh)
        }

        this.clear = function () {
            let mesh = this.scene.getObjectByName('volume')
            if (mesh != null) {
                this.scene.remove(mesh)
            }
        }

        //�Ѽv����ƥͦ��ҫ�
        this.renderVolume = function (volume, colormap) {

            const name = 'volume'
            let dims = volume.dims
            let uniforms = null
            let mesh = this.scene.getObjectByName(name)
            let max = Math.max(...dims)
            if (mesh == null) {
                // THREE.Mesh
                const geometry = new THREE.BoxGeometry(dims[0] / max, dims[1] / max, dims[2] / max)

                // shader�H(0,0,0)���_�I�A�ҫ��ݻP�����H�קK���z��V���~
                geometry.translate(dims[0] / max / 2, dims[1] / max / 2, dims[2] / max / 2)

                // Material
                const shader = VolumeRenderShader1;
                uniforms = THREE.UniformsUtils.clone(shader.uniforms);

                const cmtextures = new THREE.DataTexture(colormap, 256, 1, THREE.RGBAFormat)

                const texture = new THREE.DataTexture3D(volume.alpha
                    , dims[0], dims[1], dims[2]);

                texture.format = THREE.LuminanceFormat;
                texture.type = THREE.UnsignedByteType;
                texture.wrapR = THREE.RepeatWrapping;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                //texture.unpackAlignment = 1;

                //�s��shader�Ѽ�
                uniforms["u_data"].value = texture;
                uniforms["u_size"].value.set(dims[0] / max, dims[1] / max, dims[2] / max);
                uniforms["u_transerfunction"].value = cmtextures;
                uniforms["u_sizeEnable"].value = 0

                const material = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: shader.vertexShader,
                    fragmentShader: shader.fragmentShader,
                    side: THREE.DoubleSide
                });

                mesh = new THREE.Mesh(geometry, material);
                mesh.name = name
                //mesh.scale.set(1 / max, 1 / max, 1 / max)

                // �m���B�z
                mesh.rotation.set(-Math.PI / 2, 0, Math.PI / 2)
                mesh.position.set(0.5, 0, 0.5)
                this.scene.add(mesh)
            }
            else {
                uniforms = mesh.material.uniforms
                uniforms["u_data"].value.image = { data: volume.alpha, width: dims[0], height: dims[1], depth: dims[2] }
                uniforms["u_data"].value.needsUpdate = true
                uniforms["u_transerfunction"].value.image = { data: colormap, width: 256, height: 1 }
                uniforms["u_transerfunction"].value.needsUpdate = true
            }

            // �[�Jsize based transfer data
            if (volume.used && uniforms["u_sizeEnable"].value != 1) {
                const sizetextures = new THREE.DataTexture3D(volume.sizeData
                    , dims[0], dims[1], dims[2])
                sizetextures.format = THREE.LuminanceFormat;
                sizetextures.type = THREE.UnsignedByteType;
                sizetextures.wrapR = THREE.RepeatWrapping;
                sizetextures.wrapS = THREE.RepeatWrapping;
                sizetextures.wrapT = THREE.RepeatWrapping;
                sizetextures.minFilter = THREE.LinearFilter;
                sizetextures.magFilter = THREE.LinearFilter;

                uniforms["u_sizeEnable"].value = 1
                uniforms["u_sizeData"].value = sizetextures
            }
            else if (volume.used) {
                
                uniforms["u_sizeData"].value.images = { data: volume.sizeData, width: dims[0], height: dims[1], depth: dims[2] }
                uniforms["u_sizeData"].value.needsUpdate = true
            }
           
            this.renderScene()
        }

        this.renderScene()
    }
}

export {
    threejsViewer
}