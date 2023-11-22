import GUI from 'lil-gui';
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  AxesHelper,
  BoxGeometry,
  Clock,
  EquirectangularReflectionMapping,
  GridHelper,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
} from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import * as animations from './helpers/animations';
import { toggleFullScreen } from './helpers/fullscreen';
import { resizeRendererToDisplaySize } from './helpers/responsiveness';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import './style.css';
import { Canvas, Wizard } from 'webgl-operate';
import { Label3DRenderer } from './renderer';

const CANVAS_ID_THREE = 'three';
const CANVAS_ID_OPERATE = 'operate';

let threeCanvas: HTMLCanvasElement;
let operateCanvas: HTMLCanvasElement;
let renderer: WebGLRenderer;
let scene: Scene;
let loadingManager: LoadingManager;
let ambientLight: AmbientLight;
let pointLight: PointLight;
let cube: Mesh;
let trike: Group;
let trikeAnimations: AnimationClip[];
let mixer: AnimationMixer;
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
let dragControls: DragControls;
let axesHelper: AxesHelper;
let pointLightHelper: PointLightHelper;
let clock: Clock;
let stats: Stats;
let gui: GUI;

let lastFrame: number;

const animation = { enabled: false, play: true };
let trikeAnimationNames = new Array<string>;
let trikeAnimationSettings: { animation: string, play: boolean; };

setupCanvasses();

initOperate();

init();
animate( 0 );

addControls();
addGui();

function setupCanvasses() {
  threeCanvas = document.querySelector( `canvas#${ CANVAS_ID_THREE }` )!;
  operateCanvas = document.querySelector( `canvas#${ CANVAS_ID_OPERATE }` )!;
}

function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    //threeCanvas = document.querySelector( `canvas#${ CANVAS_ID }` )!;
    renderer = new WebGLRenderer( { canvas: threeCanvas, antialias: true, alpha: true } );
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.outputColorSpace = SRGBColorSpace;
    scene = new Scene();
    gui = new GUI( { title: '🐞 Debug GUI', width: 300 } );
    camera = new PerspectiveCamera( 50, threeCanvas.clientWidth / threeCanvas.clientHeight, 0.1, 100 );
    cameraControls = new OrbitControls( camera, threeCanvas );
  }

  // ===== 👨🏻‍💼 LOADING MANAGER =====
  {
    loadingManager = new LoadingManager();

    loadingManager.onStart = () => {
      console.log( 'loading started' );
    };
    loadingManager.onProgress = ( url, loaded, total ) => {
      console.log( 'loading in progress:' );
      console.log( `${ url } -> ${ loaded } / ${ total }` );
    };
    loadingManager.onLoad = () => {
      console.log( 'loaded!' );
    };
    loadingManager.onError = () => {
      console.log( '❌ error while loading' );
    };
  }

  // ===== 💡 LIGHTS =====
  {
    ambientLight = new AmbientLight( 'white', 0.4 );
    pointLight = new PointLight( '#ffdca8', 1.2, 100 );
    pointLight.position.set( -2, 3, 3 );
    pointLight.castShadow = true;
    pointLight.shadow.radius = 4;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 4000;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    scene.add( ambientLight );
    scene.add( pointLight );
  }

  // ===== 📦 CUBE AND PLANE =====
  {

    const sideLength = 1;
    const cubeGeometry = new BoxGeometry( sideLength, sideLength, sideLength );
    const cubeMaterial = new MeshStandardMaterial( {
      color: '#f69f1f',
      metalness: 0.5,
      roughness: 0.7,
    } );
    cube = new Mesh( cubeGeometry, cubeMaterial );
    cube.castShadow = true;
    cube.position.y = 0.5;

    const planeGeometry = new PlaneGeometry( 3, 3 );
    const planeMaterial = new MeshLambertMaterial( {
      color: 'gray',
      emissive: 'teal',
      emissiveIntensity: 0.2,
      side: 2,
      transparent: true,
      opacity: 0.4,
    } );
    const plane = new Mesh( planeGeometry, planeMaterial );
    plane.rotateX( Math.PI / 2 );
    plane.receiveShadow = true;

    //scene.add(cube)
    scene.add( plane );
  }

  // ===== 🎥 CAMERA =====
  {
    camera.position.set( 2, 2, 5 );
  }

  // ===== 🌎 ENVIRONMENT MAP =====
  {
    const loader = new RGBELoader( loadingManager );
    loader.load(
      'dresden_station_night_4k.hdr',
      function ( texture ) {
        texture.mapping = EquirectangularReflectionMapping;
        scene.background = texture;
      } );
  }

  // ===== 🪄 HELPERS =====
  {
    axesHelper = new AxesHelper( 4 );
    axesHelper.visible = false;
    scene.add( axesHelper );

    pointLightHelper = new PointLightHelper( pointLight, undefined, 'orange' );
    pointLightHelper.visible = false;
    scene.add( pointLightHelper );

    const gridHelper = new GridHelper( 20, 20, 'teal', 'darkgray' );
    gridHelper.position.y = -0.01;
    scene.add( gridHelper );
  }

  // ===== 📈 STATS & CLOCK =====
  {
    clock = new Clock();
    stats = new Stats();
    document.body.appendChild( stats.dom );
  }

  // ===== 🦕 TRICERATOPS HORRIDUS =====
  {
    const loader = new GLTFLoader( loadingManager );

    loader.load(
      '/animated_triceratops_skeleton.glb',
      function ( gltf ) {
        trike = gltf.scene;
        trike.traverse( ( node ) => {
          if ( node.type === 'Mesh' ) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        } );

        scene.add( trike );

        mixer = new AnimationMixer( trike );

        trikeAnimations = gltf.animations;

        trikeAnimations.forEach( ( animation, i ) => {
          trikeAnimationNames[ i ] = animation.name;
        } );

        trikeAnimationSettings = { animation: trikeAnimationNames[ 4 ], play: false };

        trike.position.y = 0.8;

        addTrikeGui();
      },
      undefined,
      function ( error ) {
        console.error( error );
      } );
  }
}

function addControls() {
  cameraControls.target = cube.position.clone();
  cameraControls.enableDamping = true;
  cameraControls.autoRotate = false;
  cameraControls.update();

  dragControls = new DragControls( [ cube ], camera, renderer.domElement );
  //dragControls.transformGroup = true
  dragControls.addEventListener( 'hoveron', ( event ) => {
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'orange' );
  } );
  dragControls.addEventListener( 'hoveroff', ( event ) => {
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'black' );
  } );
  dragControls.addEventListener( 'dragstart', ( event ) => {
    cameraControls.enabled = false;
    animation.play = false;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'black' );
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).opacity = 0.7;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).needsUpdate = true;
  } );
  dragControls.addEventListener( 'dragend', ( event ) => {
    cameraControls.enabled = true;
    animation.play = true;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'black' );
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).opacity = 1;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).needsUpdate = true;
  } );
  dragControls.enabled = false;

  // Full screen
  window.addEventListener( 'dblclick', ( event ) => {
    if ( event.target === threeCanvas ) {
      toggleFullScreen( threeCanvas );
    }
  } );
}

function addGui() {
  gui.addFolder( 'Triceratops' );
  /*
    const cubeOneFolder = gui.addFolder('Cube one')

    cubeOneFolder.add(cube.position, 'x').min(-5).max(5).step(0.1).name('pos x')
    cubeOneFolder.add(cube.position, 'y').min(-5).max(5).step(0.1).name('pos y')
    cubeOneFolder.add(cube.position, 'z').min(-5).max(5).step(0.1).name('pos z')

    cubeOneFolder.add(cube.material, 'wireframe')
    cubeOneFolder.addColor(cube.material, 'color')
    cubeOneFolder.add(cube.material, 'metalness', 0, 1, 0.1)
    cubeOneFolder.add(cube.material, 'roughness', 0, 1, 0.1)

    cubeOneFolder.add(cube.rotation, 'x', -Math.PI * 2, Math.PI * 2, Math.PI / 4).name('rotate x')
    cubeOneFolder.add(cube.rotation, 'y', -Math.PI * 2, Math.PI * 2, Math.PI / 4).name('rotate y')
    cubeOneFolder.add(cube.rotation, 'z', -Math.PI * 2, Math.PI * 2, Math.PI / 4).name('rotate z')

    cubeOneFolder.add(animation, 'enabled').name('animated')
    */

  const controlsFolder = gui.addFolder( 'Controls' );
  controlsFolder.add( dragControls, 'enabled' ).name( 'drag controls' );

  const lightsFolder = gui.addFolder( 'Lights' );
  lightsFolder.add( pointLight, 'visible' ).name( 'point light' );
  lightsFolder.add( ambientLight, 'visible' ).name( 'ambient light' );

  const helpersFolder = gui.addFolder( 'Helpers' );
  helpersFolder.add( axesHelper, 'visible' ).name( 'axes' );
  helpersFolder.add( pointLightHelper, 'visible' ).name( 'pointLight' );

  const cameraFolder = gui.addFolder( 'Camera' );
  cameraFolder.add( cameraControls, 'autoRotate' );

  // persist GUI state in local storage on changes
  gui.onFinishChange( () => {
    const guiState = gui.save();
    localStorage.setItem( 'guiState', JSON.stringify( guiState ) );
  } );

  // load GUI state if available in local storage
  const guiState = localStorage.getItem( 'guiState' );
  if ( guiState ) gui.load( JSON.parse( guiState ) );

  // reset GUI state button
  const resetGui = () => {
    localStorage.removeItem( 'guiState' );
    gui.reset();
  };
  gui.add( { resetGui }, 'resetGui' ).name( 'RESET' );

  gui.close();
}

function addTrikeGui() {
  const trikeFolder = gui.folders[ 0 ];
  trikeFolder.add( trike.position, 'x' ).min( -5 ).max( 5 ).step( 0.1 ).name( 'pos x' );
  trikeFolder.add( trike.position, 'y' ).min( -5 ).max( 5 ).step( 0.1 ).name( 'pos y' );
  trikeFolder.add( trike.position, 'z' ).min( -5 ).max( 5 ).step( 0.1 ).name( 'pos z' );

  trikeFolder.add( trike.rotation, 'x', -Math.PI * 2, Math.PI * 2, Math.PI / 4 ).name( 'rotate x' );
  trikeFolder.add( trike.rotation, 'y', -Math.PI * 2, Math.PI * 2, Math.PI / 4 ).name( 'rotate y' );
  trikeFolder.add( trike.rotation, 'z', -Math.PI * 2, Math.PI * 2, Math.PI / 4 ).name( 'rotate z' );

  trikeFolder.add( trikeAnimationSettings, 'play' ).name( 'animated' ).onChange( () => toggleTrikeAnimation() );
  trikeFolder.add( trikeAnimationSettings, "animation", trikeAnimationNames ).name( 'animation' ).onChange( ( value: string ) => changeTrikeAnimation( value ) );
}

function changeTrikeAnimation( id: string ) {
  if ( trike ) {
    mixer.stopAllAction();
    const clip = AnimationClip.findByName( trikeAnimations, trikeAnimationSettings.animation );
    const action = mixer.clipAction( clip );
    action.play();
  }
}

function toggleTrikeAnimation() {
  if ( trike ) {
    if ( trikeAnimationSettings.play ) {
      const clip = AnimationClip.findByName( trikeAnimations, trikeAnimationSettings.animation );
      const action = mixer.clipAction( clip );
      action.play();
    } else {
      mixer.stopAllAction();
    }
  }
}

function animate( timeStamp: number ) {
  requestAnimationFrame( animate );

  if ( lastFrame === undefined )
    lastFrame = timeStamp;
  const deltaTime = timeStamp - lastFrame;
  lastFrame = timeStamp;

  stats.update();
  if ( trike )
    mixer.update( deltaTime / 1000 );

  cameraControls.update();

  if ( animation.enabled && animation.play ) {
    animations.rotate( cube, clock, Math.PI / 3 );
    animations.bounce( cube, clock, 1, 0.5, 0.5 );
  }

  if ( resizeRendererToDisplaySize( renderer ) ) {
    const canvas = threeCanvas;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  renderer.render( scene, camera );
}

function initOperate() {
  let canvas = new Canvas( operateCanvas, { antialias: false } );
  canvas.controller.multiFrameNumber = 1;
  canvas.framePrecision = Wizard.Precision.byte;
  canvas.frameScale = [ 1.0, 1.0 ];

  let renderer = new Label3DRenderer();
  canvas.renderer = renderer;

  // Create a target cross as reference for coordinate origin [0,0,0]

  // const hlStyle = 'z-index: 1; position: absolute; width: 100%; margin: 0; margin-left: 0%;'
  //   + 'border: none; border-bottom: 1pt solid #1c75bc; border-top: 1pt solid #1c75bc;';
  // const vlStyle = 'z-index: 1; position: absolute; height: 100%; margin: 0; margin-top: 0%;'
  //   + 'border: none; border-left: 1pt solid #1cbc75; border-right: 1pt solid #1cbc75;';

  // const hl = document.createElement( 'hl' );
  // hl.setAttribute( 'style', `${ hlStyle } top: 50%;` );
  // const vl = document.createElement( 'vl' );
  // vl.setAttribute( 'style', `${ vlStyle } left: 50%;` );


  // const parent = canvas.element!.parentElement!;
  // const reference = canvas.element!;
  // parent.insertBefore( hl, reference );
  // parent.insertBefore( vl, reference );
}