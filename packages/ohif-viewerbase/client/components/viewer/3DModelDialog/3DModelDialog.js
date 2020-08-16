import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import * as THREE from 'three/build/three.module.js';
import { OHIF } from 'meteor/ohif:core';
import { Viewerbase } from 'meteor/ohif:viewerbase';

import  { OrbitControls }  from 'three/examples/jsm/controls/OrbitControls.js';
import  { OBJLoader }  from 'three/examples/jsm/loaders/OBJLoader.js';
import  { MTLLoader }  from 'three/examples/jsm/loaders/MTLLoader.js';

// import  { TrackballControls }  from 'three/examples/jsm/controls/TrackballControls.js';
// import  { NRRDLoader }  from 'three/examples/jsm/loaders/NRRDLoader.js';
// import  { VTKLoader }  from 'three/examples/jsm/loaders/VTKLoader.js';

var scene,
    camera,
    controls,
    container,
    renderer;



function init() {
    // create main scene
    scene = new THREE.Scene();

    // prepare camera
    var SCREEN_WIDTH = window.innerWidth * 0.451,
        SCREEN_HEIGHT = window.innerHeight / 1.5;

    var VIEW_ANGLE = 45,
        ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
        NEAR = 1,
        FAR = 10000;

    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

    var ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    var pointLight = new THREE.PointLight(0xffffff, 0.15);
    pointLight.position.set( 50, 50, 50 );
    scene.add(pointLight);

    scene.add(camera);

    // Camera Position
    // camera.position.set(600, 600, 400);
    camera.position.z = 300;

    const objName = OHIF.viewer.Studies.all()[0]['patientName'];
    console.log("============================")
    console.log("objName:"+objName);
    console.log("============================");
    // This way you can use as many .then as you want
    var myObjPromise = loadObj("/obj/", objName.toString());

    myObjPromise.then(myObj => {
        myObj.scale.set(90, 90, 90);
        myObj.rotation.set(-4, -3, -2);
        myObj.position.set(0, 0, 0);
        scene.add(myObj);
        //myObj.position.y = 20;
    });

    // prepare renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    // renderer.setClearColor(0xffffff);
    // renderer.shadowMapEnabled = true;
    // renderer.shadowMapSoft = true;

    // prepare container
    container = document.getElementById('3d-viewer');
    container.appendChild(renderer.domElement);

    // prepare controls (OrbitControls)
    controls = new OrbitControls(camera, renderer.domElement);

    // // prepare Inset
    // setupInset();

    //// AxisHelper
    // var axesHelper = new THREE.AxesHelper(800);
    // scene.add(axesHelper);

    // events
    window.addEventListener('resize', onWindowResize, false);
}

function loadObj(path, name) {
    // Progress
    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function () {
        console.log('Error occurred while reading the 3D Model!');
    };

    return new Promise(function (resolve, reject) {
        var mtlLoader = new MTLLoader();

        mtlLoader.setPath(path);
        mtlLoader.load(name + ".mtl", function (materials) {
            materials.preload();
            new OBJLoader()
                .setMaterials(materials)
                .setPath(path)
                .load(name + ".obj", resolve, onProgress, onError);
        }, onProgress, onError);
    });
}

function onWindowResize() {
    var SCREEN_WIDTH = $('#3d-viewer').width(),
        SCREEN_HEIGHT = $('#3d-viewer').height();

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    // controls.handleResize();
}

// Animate the scene
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

Template.view3DModelDialog.onCreated(() => {
    //if (!Detector.webgl) Detector.addGetWebGLMessage();
});

Template.view3DModelDialog.onRendered(() => {
    const instance = Template.instance();
    // Set the element to be controlled
    var $element = instance.$('#3d-viewer');

    instance.autorun(() => {
        init();
        animate();
    });
});

Template.view3DModelDialog.events({});

Template.view3DModelDialog.helpers({
    init: init,
    onWindowResize: onWindowResize,
    animate: animate
});
