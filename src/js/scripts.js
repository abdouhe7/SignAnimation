// npx parcel ./src/index.html
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'dat.gui'

let scene, camera, stats;
let model, skeleton, mixer, clock;

const crossFadeControls = [];

let currentBaseAction = 'Idel';
const allActions = [];

const baseActions = {
    none: { weight: 1 },
    Car: { weight: 0 },
    Dominat: { weight: 0 },
    Machien: { weight: 0 },
    Teeth: { weight: 0 },
};
const additiveActions = {
    sneak_pose: { weight: 0 },
    sad_pose: { weight: 0 },
    agree: { weight: 0 },
    headShake: { weight: 0 }
};
let panelSettings, numAnimations;

const Wafa = new URL('../assets/All v0.2.glb', import.meta.url);
renderer = new THREE.WebGLRenderer();
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
const orbit = new OrbitControls(camera, renderer.domElement);

Start();

function Start() {

    scene = new THREE.Scene();

    clock = new THREE.Clock();

    /// ---------------  Lighting  ----------------------

    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);
    const light = new THREE.AmbientLight(0x909090);
    // soft white light
    scene.add(light);

    // White directional light at half intensity shining from the top.
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(3, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.camera.bottom = - 2;
    directionalLight.shadow.camera.left = - 2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 40;
    scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xa484ad, 0.8);
    hemiLight.position.set(120, 80, 0);
    scene.add(hemiLight);

    // get model to the Scene ---------- NEW ------------
    const loader = new GLTFLoader();
    loader.load(Wafa.href, function (gltf) {
        model = gltf.scene;
        scene.add( model );

        model.traverse( function ( object ) {

            if ( object.isMesh ) object.castShadow = true;

        } );

        skeleton = new THREE.SkeletonHelper( model );
        skeleton.visible = false;
        scene.add( skeleton );

        const animations = gltf.animations;
        mixer = new THREE.AnimationMixer( model );

        numAnimations = animations.length;

        for ( let i = 0; i !== numAnimations; ++ i ) {

            let clip = animations[ i ];
            const name = clip.name;

            if ( baseActions[ name ] ) {

                const action = mixer.clipAction( clip );
                activateAction( action );
                baseActions[ name ].action = action;
                allActions.push( action );

            } else if ( additiveActions[ name ] ) {

                // Make the clip additive and remove the reference frame

                THREE.AnimationUtils.makeClipAdditive( clip );

                if ( clip.name.endsWith( '_pose' ) ) {

                    clip = THREE.AnimationUtils.subclip( clip, clip.name, 2, 3, 30 );

                }

                const action = mixer.clipAction( clip );
                activateAction( action );
                additiveActions[ name ].action = action;
                allActions.push( action );

            }

        }

        createPanel();

        animate();

    },

        undefined, function (error) {
            console.error(error);
        });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.useLegacyLights = false;
    document.body.appendChild(renderer.domElement);
    
    // camera
    
    camera.position.set(0, 3.5, 0);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set(0, 1, 0);
    controls.update();
    
    stats = new Stats();

    document.body.appendChild(stats.dom);

    window.addEventListener( 'resize', onWindowResize );

    renderer.setClearColor(0xA3A3A3);

}

function createPanel() {

    const panel = new dat.GUI( { width: 310 } );

    const folder1 = panel.addFolder( 'Base Actions' );
    //const folder2 = panel.addFolder( 'Additive Action Weights' );
    const folder3 = panel.addFolder( 'General Speed' );

    panelSettings = {
        'modify time scale': 1.0
    };

    const baseNames = [ 'None', ...Object.keys( baseActions ) ];

    for ( let i = 0, l = baseNames.length; i !== l; ++ i ) {

        const name = baseNames[ i ];
        const settings = baseActions[ name ];
        panelSettings[ name ] = function () {

            const currentSettings = baseActions[ currentBaseAction ];
            const currentAction = currentSettings ? currentSettings.action : null;
            const action = settings ? settings.action : null;

            if ( currentAction !== action ) {

                prepareCrossFade( currentAction, action, 0.35 );

            }

        };

        crossFadeControls.push( folder1.add( panelSettings, name ) );

    }

    for ( const name of Object.keys( additiveActions ) ) {

        const settings = additiveActions[ name ];

        panelSettings[ name ] = settings.weight;
        // folder2.add( panelSettings, name, 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {

        //     setWeight( settings.action, weight );
        //     settings.weight = weight;

        // } );

    }

    folder3.add( panelSettings, 'modify time scale', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );

    folder1.open();
    //folder2.open();
    folder3.open();

    crossFadeControls.forEach( function ( control ) {

        control.setInactive = function () {

            control.domElement.classList.add( 'control-inactive' );

        };

        control.setActive = function () {

            control.domElement.classList.remove( 'control-inactive' );

        };

        const settings = baseActions[ control.property ];

        if ( ! settings || ! settings.weight ) {

            control.setInactive();

        }

    } );

}

function activateAction( action ) {

    const clip = action.getClip();
    const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
    setWeight( action, settings.weight );
    action.play();

}

function modifyTimeScale( speed ) {

    mixer.timeScale = speed;

}

function prepareCrossFade( startAction, endAction, duration ) {

    // If the current action is 'idle', execute the crossfade immediately;
    // else wait until the current action has finished its current loop

    if ( currentBaseAction === 'None' || ! startAction || ! endAction ) {

        executeCrossFade( startAction, endAction, duration );

    } else {

        synchronizeCrossFade( startAction, endAction, duration );

    }

    // Update control colors

    if ( endAction ) {

        const clip = endAction.getClip();
        currentBaseAction = clip.name;

    } else {

        currentBaseAction = 'None';

    }

    crossFadeControls.forEach( function ( control ) {

        const name = control.property;

        if ( name === currentBaseAction ) {

            control.setActive();

        } else {

            control.setInactive();

        }

    } );

}

function synchronizeCrossFade( startAction, endAction, duration ) {

    mixer.addEventListener( 'loop', onLoopFinished );

    function onLoopFinished( event ) {

        if ( event.action === startAction ) {

            mixer.removeEventListener( 'loop', onLoopFinished );

            executeCrossFade( startAction, endAction, duration );

        }

    }

}

function executeCrossFade( startAction, endAction, duration ) {

    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)

    if ( endAction ) {

        setWeight( endAction, 1 );
        endAction.time = 0;

        if ( startAction ) {

            // Crossfade with warping

            startAction.crossFadeTo( endAction, duration, true );

        } else {

            // Fade in

            endAction.fadeIn( duration );

        }

    } else {

        // Fade out

        startAction.fadeOut( duration );

    }

}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))

function setWeight( action, weight ) {

    action.enabled = true;
    action.setEffectiveTimeScale( 1 );
    action.setEffectiveWeight( weight );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
function animate() {

    // Render loop

    requestAnimationFrame( animate );
    function handleActions(allActions, baseActions, additiveActions) {
        for(let i = 0; i < allActions.length; i++) {
            const action = allActions[i];
            // Check if action is defined before trying to use it
            if (action) {
                const clip = action.getClip();
                const settings = baseActions[clip.name] || additiveActions[clip.name];
                if (settings) {
                    settings.weight = action.getEffectiveWeight();
                }
            } else {
                console.error(`action at index ${i} is undefined`);
            }
        }
    }
    
    // Call this function with your arrays
    handleActions(allActions, baseActions, additiveActions);
    // Get the time elapsed since the last frame, used for mixer update

    const mixerUpdateDelta = clock.getDelta();

    // Update the animation mixer, the stats panel, and render this frame

    if (mixer)
            mixer.update(clock.getDelta());
    stats.update();

    renderer.render( scene, camera );

}


