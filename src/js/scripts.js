// npx parcel ./src/index.html
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'dat.gui'

const Wafa = new URL('../assets/All1.glb', import.meta.url);

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();


renderer.setClearColor(0xA3A3A3);

/// Camera orbit Extention Add

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
    );
camera.position.set(0, 1.5, 2);

//const orbit = new OrbitControls(camera, renderer.domElement);
//orbit.update();

/// Light

const light = new THREE.AmbientLight( 0x909090 ); // soft white light
scene.add( light );
// White directional light at half intensity shining from the top.
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
scene.add( directionalLight );

/// Load Model
const assetLoader = new GLTFLoader();
let mixer;


assetLoader.load(Wafa.href, function(gltf) {
    const model = gltf.scene;
    scene.add(model);
    mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations;
  
    
    const animationname = '';
/// GUI 
const Wave = false;
const np   = false;
const wow  = false;


const gui = new dat.GUI;
const options = {
    Wave : false
    ,np : false
     ,wow: false
};

gui.add(options,"Wave").onChange(function(e){
    Wave = e;
    });
gui.add(options,"np").onChange(function(e){
    np = e;
    });
gui.add(options,"wow").onChange(function(e){
    wow = e;
    });


    if(Wave)
    {
        animationname = "Hi";
    }
    if(np)
    {
        animationname = "np";
    }
    if(wow)
    {
        animationname = "wow";
    }



    const clip = THREE.AnimationClip.findByName(clips, "Car");
    const action = mixer.clipAction(clip);
    action.play();


}, undefined, function(error) {
    console.error(error);
});

const clock = new THREE.Clock();
function animate() {
    if(mixer)
        mixer.update(clock.getDelta());
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

