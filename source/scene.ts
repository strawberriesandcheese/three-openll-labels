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
import Stats from 'three/examples/jsm/libs/stats.module';
import { toggleFullScreen } from './helpers/fullscreen';
import { resizeRendererToDisplaySize } from './helpers/responsiveness';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { WorldInHandControls } from '@world-in-hand-controls/threejs-world-in-hand';

import './style.css';

import { Label } from '../lib/main';
import { FontFace } from '../lib/main';
import { FontFaceLoader } from '../lib/main';
import { MultilineController } from './helpers/multilineController';

const base = document.createElement( 'base' );
base.href = import.meta.env.BASE_URL;
document.head.insertBefore( base, document.head.firstChild );

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
let cameraControls: WorldInHandControls;
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

let colors = { headerColor: 0xf5f5f5, infoColor: 0xf5f5f5, annotationColor: 0xf5f5f5 };

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
    camera.position.set( 0, 10, 20 );
    camera.lookAt( new Vector3( 0, 0, 0 ) );
    cameraControls = new WorldInHandControls( camera, canvas, renderer, scene );
    cameraControls.allowRotationBelowGroundPlane = false;
    cameraControls.useBottomOfBoundingBoxAsGroundPlane = false;
    cameraControls.rotateAroundMousePosition = false;
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
      //@ts-expect-error
      scene.dispatchEvent( { type: 'change' } );
    };
    loadingManager.onError = ( error ) => {
      console.log( '❌ error while loading:', error );
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
    const texturePath = "./textures/rock_pitted_mossy/rock_pitted_mossy_";

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
      './models/fern_grass_02.glb?asset',
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
      './models/palms.glb',
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
        palm.translateZ( -5 );
        palm.rotateY( - Math.PI / 3 );
        scene.add( palm );

        addPalmGui();
      }
    );
  }

  // ===== 🆎 STATIC LABELS =====
  {
    const triceratopsHeadingText = `Triceratops
        	    horridus`;
    const triceratopsWrapText =
      `With its three sharp horns and spiky head plate, Triceratops horridus must have been an intimidating presence as it trampled across western North America in the late Cretaceous period, some 69 million years ago. Despite its fierce appearance, this famous ceratopsian, or horned dinosaur, was an herbivore.`;

    bodyFont = new FontFaceLoader( loadingManager ).loadFromAPI( 'https://fonts.varg.dev/api/fonts/cookierun-regular.ttf/5b932794dbdddf34e80eca00ba9a0b93/distancefield' );
    const headingFont = new FontFaceLoader( loadingManager ).load( './fonts/dmserifdisplay/dmserifdisplay-regular' );

    headerLabel = new Label( triceratopsHeadingText, headingFont, new Color( colors.headerColor ) );
    headerLabel.debugMode = false;
    headerLabel.position.set( -4, 5, 1 );
    scene.add( headerLabel );
    labels.push( headerLabel );

    infoLabel = new Label( triceratopsWrapText, bodyFont, new Color( colors.infoColor ) );
    labels.push( infoLabel );

    const sourceLabel = new Label( 'https://www.nationalgeographic.com/animals/facts/triceratops-horridus', bodyFont, infoLabel.color );
    sourceLabel;
    sourceLabel.fontSize = 0.5;
    sourceLabel.addTo( infoLabel );
    sourceLabel.alignment = Label.Alignment.Center;
    sourceLabel.translateGlobal( new Vector3( 0, -7.5, 0 ) );
    labels.push( sourceLabel );

    infoLabel.scale.set( 0.5, 0.5, 0.5 );
    infoLabel.rotateX( -Math.PI / 2 );
    scene.add( infoLabel );
    infoLabel.position.set( 0, 3, 4 );
    infoLabel.lineAnchor = Label.LineAnchor.Baseline;
    infoLabel.alignment = Label.Alignment.Center;
    infoLabel.wrap = true;
    infoLabel.lineWidth = 30;
    infoLabel.castShadow = true;

    numberOfLabels = labels.length;
  }

  // ===== 🌎 ENVIRONMENT MAP =====
  {
    const loader = new RGBELoader( loadingManager );
    loader.load(
      './textures/rustig_koppie_puresky_4k.hdr',
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

    pointLightHelper = new PointLightHelper( pointLight, 1, 'orange' );
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
      './models/animated_triceratops_skeleton.glb',
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

        // now we create a label for every animation bone
        trikeBones!.forEach( ( bone ) => {
          const label = new Label( bone.name, bodyFont, new Color( colors.annotationColor ) );
          //labels.push( label );
          label.projected = true;
          label.scale.set( trikeBoneAnnotations.scale, trikeBoneAnnotations.scale, trikeBoneAnnotations.scale );
          const boneLabelPositionOffset = new Vector3( 0.1, 0, 0 );
          label.addTo( bone, boneLabelPositionOffset );
          //label.position.set( boneLabelPositionOffset.x, label.position.y, label.position.z );
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
  // Full screen
  window.addEventListener( 'dblclick', ( event ) => {
    if ( event.target === canvas ) {
      toggleFullScreen( canvas );
      //@ts-expect-error
      scene.dispatchEvent( { type: 'resize' } );
    }
  } );
}

function addGui() {
  gui.addFolder( 'Labels' );
  gui.addFolder( 'Triceratops' );

  const envFolder = gui.addFolder( 'Environment' );
  envFolder.add( plane, 'visible' ).name( 'plane' );

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
  trikeFolder.addColor( colors, 'annotationColor' ).name( 'annotation color' ).onChange( ( value: number ) => updateTrikeBoneAnnotationsColor( value ) );
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
  folder.addColor( colors, 'headerColor' ).name( 'header color' ).onChange( ( value: number ) => headerLabel.color = new Color( value ) );
  folder.add( headerLabel, 'aa' ).name( 'header antialiasing' );
  folder.add( infoLabel, 'visible' ).name( 'info' );
  new MultilineController( folder, infoLabel, 'text', 4 ).name( 'info text' );
  folder.addColor( colors, 'infoColor' ).name( 'info color' ).onChange( ( value: number ) => infoLabel.color = new Color( value ) );
  folder.add( infoLabel, 'aa' ).name( 'info antialiasing' );
  folder.add( infoLabel, 'wrap' ).name( 'word wrap' );
  folder.add( infoLabel, 'fontSize' ).name( 'fontSize' ).min( 0.5 ).max( 5 ).step( 0.5 );
  folder.add( infoLabel, 'lineWidth' ).name( 'line width' ).min( 0 ).max( 100 ).step( 5 );
  folder.add( infoLabel, 'alignment', Label.Alignment );
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

function updateTrikeBoneAnnotationsColor( value: number ) {
  if ( trike ) {
    trikeBones.forEach( bone => {
      bone.children.forEach( ( child ) => {
        if ( child instanceof Label )
          child.color = new Color( value );
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

  if ( resizeRendererToDisplaySize( renderer ) ) {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    //@ts-expect-error
    scene.dispatchEvent( { type: 'resize' } );
  }

  if ( cameraControls instanceof WorldInHandControls ) {
    renderer.setRenderTarget( cameraControls.navigationRenderTarget );
    renderer.render( scene, camera );
  }
  renderer.setRenderTarget( null );
  renderer.render( scene, camera );

  debugLog( debugSettings.logEnabled );

  cameraControls.update();

}