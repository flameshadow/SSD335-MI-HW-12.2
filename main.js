/**
 * Created by mark on 10/28/16.
 */

Physijs.scripts.worker = 'lib/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

document.addEventListener("DOMContentLoaded", onLoad);

var renderer, camera, scene, controls, plane;

var points = [];
var line;
var cube;
var currPosition = {};
var linePrecision = 30;
var userPoints = [];
var splinePoints = [];

const ENABLE_CONTROLS = true;
const ENABLE_AXIS = true;

var pathCreated = false;
var raycaster = new THREE.Raycaster();

function onLoad() {

    sceneSetup();
    initialDraw();
    addEventListeners();
    animate();

} // function onLoad()

function addEventListeners() {
    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    //document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);

    window.addEventListener("keypress", onKeyPress);
    window.addEventListener('resize', onWindowResize, false);
} // function addEventListeners()

/*
 * KEYBOARD
 */

function onKeyPress(event) {
    switch (event.keyCode) {
        case ' '.charCodeAt(0):
        case 'p'.charCodeAt(0):
            pathCreated = true;
            makePoint(userPoints[0].x, userPoints[0].y);
            calculateTotalDistance();
            moveAlongPath();
            break;
        default:
            break;
    } // switch keyCode

} // function onKeyDown()

/*
 * MOUSE
 */

function onMouseDown(event) {
    if (pathCreated) {
        return;
    }
    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 -1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 +1;


    raycaster.setFromCamera(mouse, camera);
    plane = new THREE.Plane(THREE.Utils.cameraLookDir(camera), 0);
    var pos = raycaster.ray.intersectPlane(plane);

    makePoint(pos.x, pos.y, pos.z);
} // function onMouseDown()

function onMouseUp(event) {

} // function onMouseUp()

function onMouseMove(event) {

} // function onMouseMove()

/*
 * WINDOW RESIZE
 */

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
} // function onWindowResize()

/*
 * SCENE SETUP
 */

function sceneSetup() {
    /* Create the renderer */

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    /* Create the scene */

    scene = new Physijs.Scene({reportSize: 30, fixedTimeStep:1/120});
    scene.setGravity(new THREE.Vector3(0, 0, 0));

    /* Create the camera */

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 0, 150);

    scene.add(camera);  // add camera to scene

    /* Create the lights */

    var light = new THREE.PointLight(0xa0a0a0, 0.5, 0);
    light.position.set(50, 70, 100);
    scene.add(light);

    light = new THREE.AmbientLight(0x808080, 1);
    scene.add(light);

    /* Create the controls */
    if (ENABLE_CONTROLS) {
        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.noZoom = false;
        controls.noPan = true;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.target = scene.position;
    } else {
        controls = null;
    }

    /* Crate the axis */
    if (ENABLE_AXIS) {
        scene.add(  new THREE.AxisHelper( 50 ) );
    }

    /* Raycast plane */
    plane = new THREE.Plane(THREE.Utils.cameraLookDir(camera), 0);
} // function sceneSetup()


function initialDraw() {

    var imagePrefix = "images/dawnmountain-";
    var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
    var imageSuffix = ".png";
    var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );

    var materialArray = [];
    for (var i = 0; i < 6; i++)
        materialArray.push( new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture( imagePrefix + directions[i] + imageSuffix ),
            side: THREE.BackSide
        }));
    var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
    var skyBox = new THREE.Mesh( skyGeometry, skyMaterial );
    scene.add( skyBox );


    var geometry = new THREE.BoxGeometry(10, 10, 10, 0, 0, 0);
    //var material = new THREE.MeshBasicMaterial({color:0x808080});
    var material= new THREE.MeshNormalMaterial();
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

} // function initialDraw()


function makePoint(x, y, z) {
    userPoints.push(new THREE.Vector3(x, y, z));
    makeLineFromPoints();

} // function makePoint()

function makeLineFromPoints() {
    if (line!=null) {
        scene.remove(line);
        line = null;
    }
    if (userPoints.length < 2) return;

    var spline = new THREE.CatmullRomCurve3(userPoints);
    splinePoints = spline.getPoints(linePrecision);

    var material = new THREE.LineBasicMaterial({color:0xffffff});

    var geometry = new THREE.Geometry();
    for ( var i = 0; i < splinePoints.length; i++) {
        geometry.vertices.push(splinePoints[i]);
    }
    line = new THREE.Line(geometry, material);
    scene.add(line);

}

var pointIndex = 0;
var tween;
var totalDistance = 0;
var totalTime = 10;

function calculateTotalDistance() {
    for (var i = 0; i < splinePoints.length-1; i++) {
        totalDistance += splinePoints[i].distanceTo(splinePoints[i+1]);
    }
    totalTime = totalDistance / 100 + 10;
}

function moveAlongPath() {
    if (line != null) {
        scene.remove(line);
        line = null;
    }
    currPosition = splinePoints[pointIndex];
    pointIndex = (pointIndex+1) % splinePoints.length;
    var target = splinePoints[pointIndex];
    var distance = currPosition.distanceTo(target);
    var ratioOfWhole = (distance/totalDistance);

    var seconds = totalTime * ratioOfWhole;
    tween = new TWEEN.Tween(currPosition).to(target, seconds*1000);
    tween.onUpdate(tweenStep);
    tween.onComplete(moveAlongPath);
    tween.start();
}

function tweenStep() {
    camera.position.x = currPosition.x;
    camera.position.y = currPosition.y;
    camera.position.z = currPosition.z;
}


function animate() {
    TWEEN.update();
    if (controls) { controls.update(); }
    cube.rotation.y += 0.01;
    scene.simulate();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
} // function animate()

THREE.Utils = {
    cameraLookDir: function(camera) {
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyEuler(camera.rotation, camera.rotation.order);
        return vector;
    }
};
