import GUI from 'lil-gui';
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  AxesHelper,
  Bone,
  Color,
  EquirectangularReflectionMapping,
  GridHelper,
  Group,
  LinearSRGBColorSpace,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
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
import { DragControls } from 'three/examples/jsm/controls/DragControls';
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
let trike: Group;
let trikeAnimations: AnimationClip[];
let trikeBones: Bone[];
let plane: Mesh;
let mixer: AnimationMixer;
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
let dragControls: DragControls;
let axesHelper: AxesHelper;
let pointLightHelper: PointLightHelper;
let stats: Stats;
let gui: GUI;
let bodyFont: FontFace;

let lastFrame: number;

let trikeAnimationNames = new Array<string>;
let trikeAnimationSettings: { animation: string, play: boolean; };
let trikeBoneAnnotations = { enabled: false, scale: 0.1 };

init();
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
    scene.add( ambientLight );
    scene.add( pointLight );
  }

  // ===== 🌱 PLANE =====
  {
    const loader = new TextureLoader( loadingManager );
    const repeatVector = new Vector2( 10, 10 );
    const wrappingMode = RepeatWrapping;

    const floorColorTexture = loader.load( 'rock_pitted_mossy_diff_1k.jpg' );
    floorColorTexture.repeat = repeatVector;
    floorColorTexture.wrapS = wrappingMode;
    floorColorTexture.wrapT = wrappingMode;

    const floorDispTexture = loader.load( 'rock_pitted_mossy_disp_1k.png' );
    floorDispTexture.repeat = repeatVector;
    floorDispTexture.wrapS = wrappingMode;
    floorDispTexture.wrapT = wrappingMode;

    const floorNormalTexture = loader.load( 'rock_pitted_mossy_nor_gl_1k.png' );
    floorNormalTexture.repeat = repeatVector;
    floorNormalTexture.wrapS = wrappingMode;
    floorNormalTexture.wrapT = wrappingMode;

    const floorRoughTexture = loader.load( 'rock_pitted_mossy_rough_1k.png' );
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
      'fern_grass_02.glb',
      ( gltf ) => {
        const fern = gltf.scene;
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
      }
    );
    loader.load(
      'palms.glb',
      ( gltf ) => {
        const palms = gltf.scene;
        palms.traverse( ( node ) => {
          if ( node.type === 'Mesh' ) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        } );
        const palmScale = 0.02;
        palms.scale.set( palmScale, palmScale, palmScale );
        palms.translateX( 1.6 );
        //palms.translateY( 0.3 );
        palms.translateZ( -5 );
        palms.rotateY( - Math.PI / 3 );
        scene.add( palms );
      }
    );
  }

  // ===== 🆎 STATIC LABELS =====
  {
    const triceratopsHeadingText = 'Triceratops horridus';
    const triceratopsInfoText = `With its three sharp horns and spiky head plate, \r
    Triceratops horridus must have been an intimidating presence \r
    as it trampled across western North America in the late Cretaceous period, \r
    some 69 million years ago. Despite its fierce appearance, \r
    this famous ceratopsian, or horned dinosaur, was an herbivore.`;

    bodyFont = new FontFaceLoader( loadingManager ).load( 'cookierun-bold' );
    const headingFont = new FontFaceLoader( loadingManager ).load( 'dmserifdisplay-regular' );

    const headingMyWayLabel = new Label( triceratopsHeadingText, headingFont, new Color( 0xff0000 ) );
    headingMyWayLabel.useUlrikeTypesetter = true;
    headingMyWayLabel.position.set( -4, 5, 1 );
    //const headingOldWayLabel = new Label( triceratopsHeadingText, headingFont, new Color( 0x000000 ) );
    //headingOldWayLabel.position.set( -4, 5, 2 );

    scene.add( headingMyWayLabel/*, headingOldWayLabel*/ );

    const infoTextLabel = new Label( triceratopsInfoText, bodyFont, new Color( 0x000000 ) );
    infoTextLabel.scale.set( 0.5, 0.5, 0.5 );
    infoTextLabel.rotateX( -Math.PI / 2 );
    scene.add( infoTextLabel );
    infoTextLabel.position.set( 0, 0.4, 4 );
    infoTextLabel.lineAnchor = Label.LineAnchor.Center;
    infoTextLabel.alignment = Label.Alignment.Center;
  }

  // ===== 🎥 CAMERA =====
  {
    camera.position.set( 0, 10, 20 );
  }

  // ===== 🌎 ENVIRONMENT MAP =====
  {
    const loader = new RGBELoader( loadingManager );
    loader.load(
      'rustig_koppie_puresky_4k.hdr',
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

    const gridHelper = new GridHelper( 20, 20, 'teal', 'darkgray' );
    gridHelper.position.y = -0.01;
    scene.add( gridHelper );
  }

  // ===== 📈 STATS =====
  {
    stats = new Stats();
    document.body.appendChild( stats.dom );
  }

  // ===== 🦕 TRICERATOPS HORRIDUS =====
  {
    const loader = new GLTFLoader( loadingManager );

    loader.load(
      '/animated_triceratops_skeleton.glb',
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

        const pride = [ new Color( 0xFFFFFF ), new Color( 0xFFAFC7 ), new Color( 0x73D7EE ), new Color( 0x613915 ), new Color( 0x000000 ), new Color( 0xE50000 ), new Color( 0xFF8D00 ), new Color( 0xFFEE00 ), new Color( 0x028121 ), new Color( 0x004CFF ), new Color( 0x760088 ) ];

        // now we create a label for every animation bone
        trikeBones!.forEach( ( bone, index ) => {
          const label = new Label( bone.name, bodyFont, pride[ index % pride.length ] );
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

        trike.position.y = 0.8;

        addControls();
        addGui();

      },
      undefined,
      function ( error ) {
        console.error( error );
      } );
  }
}

function addControls() {
  cameraControls.target = trike.position.clone();
  cameraControls.enableDamping = true;
  cameraControls.autoRotate = false;
  cameraControls.maxDistance = 20;
  cameraControls.minDistance = 1;
  cameraControls.maxPolarAngle = 1.5;
  cameraControls.update();

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

  // Full screen
  window.addEventListener( 'dblclick', ( event ) => {
    if ( event.target === canvas ) {
      toggleFullScreen( canvas );
    }
  } );
}

function addGui() {
  gui.addFolder( 'Triceratops' );

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
  addTrikeGui();
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
  trikeFolder.add( trikeBoneAnnotations, 'enabled' ).name( 'enable bone annotations' ).onChange( ( value: boolean ) => toggleTrikeBoneAnnotations( value ) );
  trikeFolder.add( trikeBoneAnnotations, 'scale' ).min( 0 ).max( 0.1 ).step( 0.0001 ).name( 'annotation size' ).onChange( ( value: number ) => changeTrikeBoneAnnotationsSize( value ) );
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

function toggleTrikeBoneAnnotations( value: boolean ) {
  if ( trike ) {
    trikeBones.forEach( bone => {
      bone.children.forEach( ( child ) => {
        if ( child instanceof Label )
          child.visible = value;
      } );
    } );
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

  if ( resizeRendererToDisplaySize( renderer ) ) {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  renderer.render( scene, camera );

}