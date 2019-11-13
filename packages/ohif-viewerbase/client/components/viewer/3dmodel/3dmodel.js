import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import * as THREE from 'three/build/three.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import  {GUI}  from 'three/examples/jsm/libs/dat.gui.module.js';
import  {TrackballControls}  from 'three/examples/jsm/controls/TrackballControls.js';
import  {NRRDLoader}  from 'three/examples/jsm/loaders/NRRDLoader.js';
import  {VTKLoader}  from 'three/examples/jsm/loaders/VTKLoader.js';


Template.threedmodel.onCreated(() => {
    const instance = Template.instance();
});

Template.threedmodel.onRendered(() => {
    const instance = Template.instance();
    let container,
        stats,
        camera,
        controls,
        scene,
        renderer,
        container2,
        renderer2,
        camera2,
        axes2,
        scene2;

    init();
    animate();

    function init() {
        let loader = new NRRDLoader();
        let vtkloader = new VTKLoader();
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1e10);
        camera.position.z = 300;
        scene.add(camera);

        let dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(200, 200, 1000).normalize();

        camera.add(dirLight);
        camera.add(dirLight.target);

        let vtkmaterial = new THREE.MeshLambertMaterial({
            wireframe: false,
            morphTargets: false,
            side: THREE.DoubleSide,
            color: 0xff0000
        });

        /*    geometry = new THREE.CubeGeometry(200, 200, 200);
            material = new THREE.MeshNormalMaterial();
            mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);*/

        renderer = new THREE.WebGLRenderer({
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container = document.createElement('div');
        document.body.appendChild(container);
        container.appendChild(renderer.domElement);


        controls = new TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 5.0;
        controls.zoomSpeed = 5;
        controls.panSpeed = 2;
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;

        /*if you want right and left top corner*/
        stats = new Stats();
        container.appendChild(stats.dom);
        let gui = new GUI();

        window.addEventListener('resize', onWindowResize, false);
        setupInset();

        vtkloader.load("/data/3dmodel/segmentation.vtk", function (geometry) {
            geometry.computeVertexNormals();
            let mesh = new THREE.Mesh(geometry, vtkmaterial);
            scene.add(mesh);
            let visibilityControl = {
                visible: true
            };
            gui.add(visibilityControl, "visible").name("Model Visible").onChange(function () {
                mesh.visible = visibilityControl.visible;
                renderer.render(scene, camera);
            });

        });


        loader.load("/data/3dmodel/Prostate.nrrd", function (volume) {

            var geometry,
                material,
                sliceZ,
                sliceY,
                sliceX;

            //box helper to see the extend of the volume
            var geometry = new THREE.BoxBufferGeometry(volume.xLength, volume.yLength, volume.zLength);
            var material = new THREE.MeshBasicMaterial({
                color: 0x00ff00
            });
            var cube = new THREE.Mesh(geometry, material);
            cube.visible = false;
            var box = new THREE.BoxHelper(cube);
            scene.add(box);
            box.applyMatrix(volume.matrix);
            scene.add(cube);

            //z plane
            sliceZ = volume.extractSlice('z', Math.floor(volume.RASDimensions[2] / 4));
            scene.add(sliceZ.mesh);

            //y plane
            sliceY = volume.extractSlice('y', Math.floor(volume.RASDimensions[1] / 2));
            scene.add(sliceY.mesh);

            //x plane
            sliceX = volume.extractSlice('x', Math.floor(volume.RASDimensions[0] / 2));
            scene.add(sliceX.mesh);

            gui.add(sliceX, "index", 0, volume.RASDimensions[0], 1).name("indexX").onChange(function () {

                sliceX.repaint.call(sliceX);

            });
            gui.add(sliceY, "index", 0, volume.RASDimensions[1], 1).name("indexY").onChange(function () {

                sliceY.repaint.call(sliceY);

            });
            gui.add(sliceZ, "index", 0, volume.RASDimensions[2], 1).name("indexZ").onChange(function () {

                sliceZ.repaint.call(sliceZ);

            });

            gui.add(volume, "lowerThreshold", volume.min, volume.max, 1).name("Lower Threshold").onChange(function () {

                volume.repaintAllSlices();

            });
            gui.add(volume, "upperThreshold", volume.min, volume.max, 1).name("Upper Threshold").onChange(function () {

                volume.repaintAllSlices();

            });
            gui.add(volume, "windowLow", volume.min, volume.max, 1).name("Window Low").onChange(function () {

                volume.repaintAllSlices();

            });
            gui.add(volume, "windowHigh", volume.min, volume.max, 1).name("Window High").onChange(function () {

                volume.repaintAllSlices();

            });

        });

    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        //copy position of the camera into inset
        camera2.position.copy(camera.position);
        camera2.position.sub(controls.target);
        camera2.position.setLength(300);
        camera2.lookAt(scene2.position);
        renderer.render(scene, camera);
        renderer2.render(scene2, camera2);
        stats.update();
        render();
    }


    function render() {
        renderer.render(scene, camera);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        controls.handleResize();
    }

    function setupInset() {
        var insetWidth = 150,
            insetHeight = 150;
        container2 = document.getElementById('inset');
        container2.width = insetWidth;
        container2.height = insetHeight;

        // renderer
        renderer2 = new THREE.WebGLRenderer({
            alpha: true
        });
        renderer2.setClearColor(0x000000, 0);
        renderer2.setSize(insetWidth, insetHeight);
        container2.appendChild(renderer2.domElement);

        // scene
        scene2 = new THREE.Scene();

        // camera
        camera2 = new THREE.PerspectiveCamera(50, insetWidth / insetHeight, 1, 1000);
        camera2.up = camera.up; // important!

        // axes
        axes2 = new THREE.AxesHelper(100);
        scene2.add(axes2);

    }
});