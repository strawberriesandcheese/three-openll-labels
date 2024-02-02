import GUI from 'lil-gui';
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  AxesHelper,
  Bone,
  Color,
  DirectionalLight,
  DirectionalLightHelper,
  EquirectangularReflectionMapping,
  GridHelper,
  Group,
  LinearSRGBColorSpace,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  SkinnedMesh,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
//import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { toggleFullScreen } from './helpers/fullscreen';
import { resizeRendererToDisplaySize } from './helpers/responsiveness';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import './style.css';

import { Label } from './label';
import { FontFace } from './FontFace';
import { FontFaceLoader } from './FontFaceLoader';

let canvas: HTMLCanvasElement;
let renderer: WebGLRenderer;
let scene: Scene;
let loadingManager: LoadingManager;
let ambientLight: AmbientLight;
let pointLight: PointLight;
let directionalLight: DirectionalLight;
let directionalLightHelper: DirectionalLightHelper;
let trike: Group;
let trikeAnimations: AnimationClip[];
let trikeBones: Bone[];
let labels = new Array<Label>;
let headerLabel: Label;
let infoLabel: Label;
let plane: Mesh;
let gridHelper: GridHelper;
let palm: Group;
let fern: Group;
let mixer: AnimationMixer;
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
//let dragControls: DragControls;
let axesHelper: AxesHelper;
let pointLightHelper: PointLightHelper;
let stats: Stats;
let drawCallPanel: Stats.Panel;
let gui: GUI;
let bodyFont: FontFace;

let lastFrame: number;

let trikeAnimationNames = new Array<string>;
let trikeAnimationSettings: { animation: string, play: boolean; };
let trikeBoneAnnotations = { enabled: false, scale: 0.1 };

let debugSettings = { logEnabled: false, glyphDebug: false };
let loggingInfo = { labels: 0, drawCalls: 0 };
let previousLoggingInfo = { labels: 0, drawCalls: 0 };
let numberOfLabels = 0;

init();
addControls();
addContent();
addGui();
addLabelGui();
animate( 0 );


function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector( `canvas` )!;
    renderer = new WebGLRenderer( { canvas: canvas, antialias: true, alpha: true } );
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.outputColorSpace = SRGBColorSpace;
    scene = new Scene();
    gui = new GUI( { title: '🐞 Debug GUI', width: 300 } );
    gui.close();
    camera = new PerspectiveCamera( 50, canvas.clientWidth / canvas.clientHeight, 0.1, 2000 );
    cameraControls = new OrbitControls( camera, canvas );
  }

}

function addContent() {
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

    pointLight = new PointLight( '#ffdca8', 80, 100 );
    pointLight.position.set( 3, 10, 5 );
    pointLight.castShadow = true;
    pointLight.shadow.radius = 15;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 4000;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    pointLight.visible = false;

    directionalLight = new DirectionalLight( '#fdfbd3', 1 );
    directionalLight.position.set( 13, 7, 10 );
    directionalLight.castShadow = true;

    scene.add( ambientLight );
    scene.add( pointLight );
    scene.add( directionalLight );
  }

  // ===== 🌱 PLANE =====
  {
    const loader = new TextureLoader( loadingManager );
    const repeatVector = new Vector2( 10, 10 );
    const wrappingMode = RepeatWrapping;
    const texturePath = "/textures/rock_pitted_mossy/rock_pitted_mossy_";

    const floorColorTexture = loader.load( texturePath + "diff_1k.jpg" );
    floorColorTexture.repeat = repeatVector;
    floorColorTexture.wrapS = wrappingMode;
    floorColorTexture.wrapT = wrappingMode;

    const floorDispTexture = loader.load( texturePath + 'disp_1k.png' );
    floorDispTexture.repeat = repeatVector;
    floorDispTexture.wrapS = wrappingMode;
    floorDispTexture.wrapT = wrappingMode;

    const floorNormalTexture = loader.load( texturePath + 'nor_gl_1k.png' );
    floorNormalTexture.repeat = repeatVector;
    floorNormalTexture.wrapS = wrappingMode;
    floorNormalTexture.wrapT = wrappingMode;

    const floorRoughTexture = loader.load( texturePath + 'rough_1k.png' );
    floorRoughTexture.repeat = repeatVector;
    floorRoughTexture.wrapS = wrappingMode;
    floorRoughTexture.wrapT = wrappingMode;

    const planeGeometry = new PlaneGeometry( 150, 150, 200, 200 );
    const planeMaterial = new MeshStandardMaterial( {
      map: floorColorTexture,
      displacementMap: floorDispTexture,
      normalMap: floorNormalTexture,
      roughnessMap: floorRoughTexture,
      side: 2,
    } );
    planeMaterial.onBeforeCompile = ( shader ) => {

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        const float mountainFlatRadius = 25.;
        float mountainHeight(vec3 position)
        {
          float radius = max(length(position.xy) - mountainFlatRadius, 0.);
          return -cos(radius * 0.2) + 1. + sqrt(radius);
        }
        `);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3(position.x, position.y, position.z + mountainHeight(position));
        `);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        float step = 0.1;
        float deltaX = mountainHeight(vec3(position.x + step, position.y, position.z)) - mountainHeight(vec3(position.x - step, position.y, position.z));
        float deltaY = mountainHeight(vec3(position.x, position.y + step, position.z)) - mountainHeight(vec3(position.x, position.y - step, position.z));
        vec3 xStep = vec3(2. * step, 0, deltaX);
        vec3 yStep = vec3(0, 2. * step, deltaY);
        vec3 objectNormal = cross(xStep, yStep);
        `);
      planeMaterial.userData.shader = shader;
    };
    plane = new Mesh( planeGeometry, planeMaterial );
    plane.rotateX( -Math.PI / 2 );
    plane.position.setY( -0.47 );
    plane.receiveShadow = true;

    scene.add( plane );
  }

  // ===== 🌴 PLANTS =====
  {
    const loader = new GLTFLoader( loadingManager );
    loader.load(
      '/models/fern_grass_02.glb',
      ( gltf ) => {
        fern = gltf.scene;
        fern.traverse( ( node ) => {
          if ( node.type === 'Mesh' ) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        } );
        fern.scale.set( 50, 50, 50 );
        fern.translateX( -3.7 );
        fern.translateY( 0.3 );
        fern.translateZ( 1 );
        scene.add( fern );

        addFernGui();
      }
    );
    loader.load(
      '/models/palms.glb',
      ( gltf ) => {
        palm = gltf.scene;
        palm.traverse( ( node ) => {
          if ( node.type === 'Mesh' ) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        } );
        const palmScale = 0.02;
        palm.scale.set( palmScale, palmScale, palmScale );
        palm.translateX( 1.6 );
        //palms.translateY( 0.3 );
        palm.translateZ( -5 );
        palm.rotateY( - Math.PI / 3 );
        scene.add( palm );

        addPalmGui();
      }
    );
  }

  // ===== 🆎 STATIC LABELS =====
  {
    const triceratopsHeadingText = 'Triceratops horridus';
    const triceratopsInfoText =
      `With its three sharp horns and spiky head plate, Triceratops 
horridus must have been an intimidating presence 
as it trampled across western North America in the late Cretaceous period, 
some 69 million years ago. Despite its fierce appearance, 
this famous ceratopsian, or horned dinosaur, was an herbivore. `;

    bodyFont = new FontFaceLoader( loadingManager ).load( '/fonts/cookierun/cookierun-regular' );
    const headingFont = new FontFaceLoader( loadingManager ).load( '/fonts/dmserifdisplay/dmserifdisplay-regular' );

    headerLabel = new Label( triceratopsHeadingText, headingFont, new Color( 0xf5f5f5 ) );
    headerLabel.useUlrikeTypesetter = true;
    headerLabel.debugMode = false;
    headerLabel.position.set( -4, 5, 1 );
    // const headingOldWayLabel = new Label( triceratopsHeadingText, headingFont, new Color( 0x000000 ) );
    // headingOldWayLabel.position.set( -4, 5, 2 );

    scene.add( headerLabel/*, headingOldWayLabel*/ );
    labels.push( headerLabel );

    infoLabel = new Label( triceratopsInfoText, bodyFont, new Color( 0xf5f5f5 ) );
    labels.push( infoLabel );
    infoLabel.scale.set( 0.5, 0.5, 0.5 );
    infoLabel.rotateX( -Math.PI / 2 );
    scene.add( infoLabel );
    infoLabel.position.set( 0, 0.4, 4 );
    infoLabel.lineAnchor = Label.LineAnchor.Center;
    infoLabel.alignment = Label.Alignment.Center;

    numberOfLabels = labels.length;
  }

  // ===== 🎥 CAMERA =====
  {
    camera.position.set( 0, 10, 20 );
  }

  // ===== 🌎 ENVIRONMENT MAP =====
  {
    const loader = new RGBELoader( loadingManager );
    loader.load(
      '/textures/rustig_koppie_puresky_4k.hdr',
      ( texture ) => {
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

    directionalLightHelper = new DirectionalLightHelper( directionalLight, undefined, 'orange' );
    directionalLightHelper.visible = false;
    scene.add( directionalLightHelper );

    gridHelper = new GridHelper( 20, 20, 'teal', 'darkgray' );
    gridHelper.position.y = -0.01;
    gridHelper.visible = false;
    scene.add( gridHelper );

  }

  // ===== 📈 STATS =====
  {
    stats = new Stats();
    drawCallPanel = new Stats.Panel( 'Draw Calls', '#ff8', '#221' );
    stats.addPanel( drawCallPanel );

    document.body.appendChild( stats.dom );
  }

  // ===== 🦕 TRICERATOPS HORRIDUS =====
  {
    const loader = new GLTFLoader( loadingManager );

    loader.load(
      '/models/animated_triceratops_skeleton.glb',
      ( gltf ) => {
        trike = gltf.scene;
        trikeBones = new Array<Bone>;
        trike.traverse( ( node ) => {
          if ( node.type === 'SkinnedMesh' ) {
            const mesh = node as SkinnedMesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const material = mesh.material as MeshStandardMaterial;
            material.map!.colorSpace = LinearSRGBColorSpace;
            material.aoMap!.colorSpace = LinearSRGBColorSpace;
            material.metalnessMap!.colorSpace = LinearSRGBColorSpace;
            material.normalMap!.colorSpace = LinearSRGBColorSpace;
            material.roughnessMap!.colorSpace = LinearSRGBColorSpace;
          }
          if ( node.type === 'Bone' ) {
            // it is discouraged to change the scene tree in the traverse callback, so we just save all bones
            const bone = node as Bone;
            trikeBones.push( bone );
            ;
          };
        } );

        cameraControls.target = trike.position.clone();

        const pride = [ new Color( 0xFFFFFF ), new Color( 0xFFAFC7 ), new Color( 0x73D7EE ), new Color( 0x613915 ), new Color( 0x000000 ), new Color( 0xE50000 ), new Color( 0xFF8D00 ), new Color( 0xFFEE00 ), new Color( 0x028121 ), new Color( 0x004CFF ), new Color( 0x760088 ) ];

        // now we create a label for every animation bone
        trikeBones!.forEach( ( bone, index ) => {
          const label = new Label( bone.name, bodyFont, pride[ index % pride.length ] );
          labels.push( label );
          label.projected = true;
          label.scale.set( trikeBoneAnnotations.scale, trikeBoneAnnotations.scale, trikeBoneAnnotations.scale );
          label.attachTo( bone );
          label.translateGlobal( new Vector3( 0.1, 0, 0 ) );
          label.visible = false;
        } );

        scene.add( trike );

        mixer = new AnimationMixer( trike );

        trikeAnimations = gltf.animations;

        trikeAnimations.forEach( ( animation, i ) => {
          trikeAnimationNames[ i ] = animation.name;
        } );

        trikeAnimationSettings = { animation: trikeAnimationNames[ 4 ], play: true };
        toggleTrikeAnimation();

        trike.position.y = 1;

        addTrikeGui();
        addControls();
      },
      undefined,
      function ( error ) {
        console.error( error );
      } );
  }
}

function addControls() {
  cameraControls.enableDamping = true;
  cameraControls.autoRotate = false;
  cameraControls.maxDistance = 30;
  cameraControls.minDistance = 1;
  cameraControls.maxPolarAngle = 1.5;
  cameraControls.update();

  /*
  dragControls = new DragControls( [ trike ], camera, renderer.domElement );
  //dragControls.transformGroup = true
  dragControls.addEventListener( 'hoveron', ( event ) => {
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'orange' );
  } );
  dragControls.addEventListener( 'hoveroff', ( event ) => {
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'black' );
  } );
  dragControls.addEventListener( 'dragstart', ( event ) => {
    cameraControls.enabled = false;
    trikeAnimationSettings.play = false;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'black' );
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).opacity = 0.7;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).needsUpdate = true;
  } );
  dragControls.addEventListener( 'dragend', ( event ) => {
    cameraControls.enabled = true;
    trikeAnimationSettings.play = true;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).emissive.set( 'black' );
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).opacity = 1;
    ( ( event.object as THREE.Mesh ).material as MeshLambertMaterial ).needsUpdate = true;
  } );
  dragControls.enabled = false;
  */

  // Full screen
  window.addEventListener( 'dblclick', ( event ) => {
    if ( event.target === canvas ) {
      toggleFullScreen( canvas );
    }
  } );
}

function addGui() {
  gui.addFolder( 'Labels' );
  gui.addFolder( 'Triceratops' );

  const envFolder = gui.addFolder( 'Environment' );
  envFolder.add( plane, 'visible' ).name( 'plane' );

  // const controlsFolder = gui.addFolder( 'Controls' );
  // controlsFolder.add( dragControls, 'enabled' ).name( 'drag controls' );

  const lightsFolder = gui.addFolder( 'Lights' );
  lightsFolder.add( pointLight, 'visible' ).name( 'point light' );
  lightsFolder.add( directionalLight, 'visible' ).name( 'directional light' );
  lightsFolder.add( ambientLight, 'visible' ).name( 'ambient light' );

  const helpersFolder = gui.addFolder( 'Helpers' );
  helpersFolder.add( axesHelper, 'visible' ).name( 'axes' );
  helpersFolder.add( gridHelper, 'visible' ).name( 'grid' );
  helpersFolder.add( pointLightHelper, 'visible' ).name( 'pointLight' );
  helpersFolder.add( directionalLightHelper, 'visible' ).name( 'directionalLight' );
  helpersFolder.add( debugSettings, 'logEnabled' ).name( 'logging' );

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

  // open modal with sources
  const showSources = () => {
    const dialog = document.querySelector( 'dialog' );
    if ( dialog ) {
      dialog.showModal();
      const cancelButton = document.querySelector( "button[name='close']" );
      if ( cancelButton ) {
        cancelButton.addEventListener( "click", () => {
          dialog.close();
        } );
      }
    }
  };

  gui.add( { showSources }, 'showSources' ).name( 'Show Resource Attributions' );
  gui.add( { resetGui }, 'resetGui' ).name( 'RESET' );
  gui.close();
}

function addTrikeGui() {
  const trikeFolder = gui.folders[ 1 ];
  trikeFolder.add( trike, 'visible' ).name( 'show' );

  trikeFolder.add( trike.position, 'x' ).min( -5 ).max( 5 ).step( 0.1 ).name( 'pos x' );
  trikeFolder.add( trike.position, 'y' ).min( -5 ).max( 5 ).step( 0.1 ).name( 'pos y' );
  trikeFolder.add( trike.position, 'z' ).min( -5 ).max( 5 ).step( 0.1 ).name( 'pos z' );

  trikeFolder.add( trike.rotation, 'x', -Math.PI * 2, Math.PI * 2, Math.PI / 4 ).name( 'rotate x' );
  trikeFolder.add( trike.rotation, 'y', -Math.PI * 2, Math.PI * 2, Math.PI / 4 ).name( 'rotate y' );
  trikeFolder.add( trike.rotation, 'z', -Math.PI * 2, Math.PI * 2, Math.PI / 4 ).name( 'rotate z' );

  trikeFolder.add( trikeAnimationSettings, 'play' ).name( 'animated' ).onChange( () => toggleTrikeAnimation() );
  trikeFolder.add( trikeAnimationSettings, "animation", trikeAnimationNames ).name( 'animation' ).onChange( ( value: string ) => changeTrikeAnimation( value ) );
  trikeFolder.add( trikeBoneAnnotations, 'enabled' ).name( 'enable bone annotations' ).onChange( ( value: boolean ) => toggleTrikeBoneAnnotations( value ) );
  trikeFolder.add( trikeBoneAnnotations, 'scale' ).min( 0 ).max( 0.1 ).step( 0.0001 ).name( 'annotation size' ).onChange( ( value: number ) => changeTrikeBoneAnnotationsSize( value ) );
}

function addPalmGui() {
  const folder = gui.folders[ 2 ];
  folder.add( palm, 'visible' ).name( 'palm' );
}

function addFernGui() {
  const folder = gui.folders[ 2 ];
  folder.add( fern, 'visible' ).name( 'fern' );
}

function addLabelGui() {
  const folder = gui.folders[ 0 ];
  folder.add( headerLabel, 'visible' ).name( 'header' );
  folder.add( headerLabel, 'text' ).name( 'header text' );
  folder.add( infoLabel, 'visible' ).name( 'info' );
  folder.add( infoLabel, 'text' ).name( 'info text' );
  folder.add( debugSettings, 'glyphDebug' ).name( 'glyph debug view' ).onChange( ( value: boolean ) => toggleGlyphDebugView( value ) );
}

function changeTrikeAnimation( id: string ) {
  if ( trike ) {
    mixer.stopAllAction();
    const clip = AnimationClip.findByName( trikeAnimations, id );
    const action = mixer.clipAction( clip );
    if ( trikeAnimationSettings.play )
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

function toggleGlyphDebugView( value: boolean ) {
  for ( const label of labels ) {
    label.debugMode = value;
  }
}

function toggleTrikeBoneAnnotations( value: boolean ) {
  if ( trike ) {
    trikeBones.forEach( bone => {
      bone.children.forEach( ( child ) => {
        if ( child instanceof Label )
          child.visible = value;
      } );
    } );
    if ( value ) {
      numberOfLabels = labels.length;
    } else {
      numberOfLabels -= trikeBones.length;
    }
  }
}

function changeTrikeBoneAnnotationsSize( value: number ) {
  if ( trike ) {
    trikeBones.forEach( bone => {
      bone.children.forEach( ( child ) => {
        if ( child instanceof Label )
          child.scale.set( value, value, value );
      } );
    } );
  }
}

function debugLog( enabled: boolean ) {
  loggingInfo.drawCalls = renderer.info.render.calls;
  loggingInfo.labels = numberOfLabels;

  const infoChanged = (
    ( loggingInfo.drawCalls != previousLoggingInfo.drawCalls ) ||
    ( loggingInfo.labels != previousLoggingInfo.labels ) );

  if ( enabled && infoChanged ) {
    loggingInfo.drawCalls = renderer.info.render.calls;
    console.log( loggingInfo );
  }

  previousLoggingInfo.drawCalls = loggingInfo.drawCalls;
  previousLoggingInfo.labels = loggingInfo.labels;
}

function animate( timeStamp: number ) {
  requestAnimationFrame( animate );

  if ( lastFrame === undefined )
    lastFrame = timeStamp;
  const deltaTime = timeStamp - lastFrame;
  lastFrame = timeStamp;

  stats.update();
  drawCallPanel.update( loggingInfo.drawCalls, 150 );
  if ( trike )
    mixer.update( deltaTime / 1000 );

  cameraControls.update();

  if ( resizeRendererToDisplaySize( renderer ) ) {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  debugLog( debugSettings.logEnabled );

  renderer.render( scene, camera );

}