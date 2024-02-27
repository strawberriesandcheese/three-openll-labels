import {
  BufferAttribute,
  Camera,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  MeshLambertMaterial,
  MeshMatcapMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  Object3D,
  PointsMaterial,
  Quaternion,
  Renderer,
  Scene,
  ShaderMaterial,
  SpriteMaterial,
  Texture,
  TypedArray,
  Vector3,
} from 'three';

import { FontFace } from './FontFace';

import vertexShader from './shaders/font.vert?raw';
import fragmentShader from './shaders/font.frag?raw';

import font_pars_vertex from './ShaderChunks/font_pars_vertex.glsl?raw';
import font_vertex from './ShaderChunks/font_vertex.glsl?raw';

import font_pars_frag from './ShaderChunks/font_pars_frag.glsl?raw';
import font_frag from './ShaderChunks/font_frag.glsl?raw';

import { Glyph } from './Glyph';
import { Typesetter } from './Typesetter';

type SupportedMaterial =
  LineBasicMaterial |
  MeshBasicMaterial |
  MeshDepthMaterial |
  MeshDistanceMaterial |
  MeshLambertMaterial |
  MeshMatcapMaterial |
  MeshPhongMaterial |
  MeshStandardMaterial |
  MeshToonMaterial |
  PointsMaterial |
  SpriteMaterial;


class Label extends Object3D {

  static readonly DEFAULT_LINE_FEED = '\x0A';

  protected _mesh: Mesh;
  protected _material: SupportedMaterial;

  protected _fontFace: FontFace;
  protected _needsInitialLayout = true;
  protected _needsLayout = false;
  protected _textChanged = false;
  protected _color = new Color( 0x000000 );
  protected _text: string;

  protected _alwaysFaceCamera = false;
  protected _lineAnchor = Label.LineAnchor.Baseline;
  protected _fontSize = 1;
  protected _lineWidth = 100;
  protected _lineFeed = Label.DEFAULT_LINE_FEED;
  protected _wrap = false;
  protected _alignment = Label.Alignment.Left;

  protected _debugMode = false;
  protected _aa = true;
  protected _frustumCulledChanged = false;

  // TypeScript only references complex objects in arrays so we are not loosing (much, at all?) memory compared to an index based implementation
  protected _textGlyphs: Array<Glyph>;

  protected readonly _vertices = new Float32Array( [
    0.0, 0.0, 0.0, // v0
    1.0, 0.0, 0.0, // v1
    0.0, 1.0, 0.0, // v2

    0.0, 1.0, 0.0, // v3
    1.0, 0.0, 0.0, // v4
    1.0, 1.0, 0.0  // v5
  ] );

  private _origins: Float32Array;
  private _tangents: Float32Array;
  private _ups: Float32Array;
  private _texCoords: Float32Array;

  private _originsAttribute: InstancedBufferAttribute;
  private _tangentsAttribute: InstancedBufferAttribute;
  private _upsAttribute: InstancedBufferAttribute;
  private _texCoordsAttribute: InstancedBufferAttribute;

  constructor( text: string, fontFace: FontFace, color: Color = new Color( 0x000000 ), material = new MeshStandardMaterial() ) {
    super();

    this.text = text;
    this._lineAnchor;

    this._origins = new Float32Array( this.length * 3 ).fill( 0 );
    this._tangents = new Float32Array( this.length * 3 ).fill( 0 );
    this._ups = new Float32Array( this.length * 3 ).fill( 0 );
    this._texCoords = new Float32Array( this.length * 4 ).fill( 0 );

    let geometry = new InstancedBufferGeometry();
    let material2 = this.createShaderMaterial( new Texture, new Color );
    this._material = material;

    this._material.onBeforeCompile = ( shader ) => {

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>' + font_pars_vertex
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        font_vertex
      );

      //console.log( shader.fragmentShader );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>' + font_pars_frag
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
        #include <clipping_planes_fragment>
        vec4 diffuseColor = vec4( color, opacity );
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>' + font_frag
      );

      console.log( shader.fragmentShader );
      material.userData.shader = shader;
    };
    this.mesh = new Mesh( geometry, this._material );
    this.mesh.frustumCulled = this.frustumCulled;

    this.fontFace = fontFace;
    this._color = color;
  }

  setOnBeforeRender( mesh: Mesh ) {
    mesh.onBeforeRender =
      ( renderer: Renderer, scene: Scene, camera: Camera ) => {
        // first we need to check if our parents frustum culling setting has changed
        this._frustumCulledChanged = this.frustumCulled !== this.mesh.frustumCulled;
        if ( this._frustumCulledChanged ) {
          //console.log( this.frustumCulled, this.mesh.frustumCulled );
          this.mesh.frustumCulled = this.frustumCulled;
        }

        // we need to make sure we have an actual font face ready before starting to work with it
        if ( this._textChanged && this.fontFace.ready ) {
          this.updateText();
          this._needsLayout = true;
          this._textChanged = false;
        }

        if ( this._needsInitialLayout && this.fontFace.ready ) {
          this._needsLayout = true;
          this._needsInitialLayout = false;
          this.updateMap();
          this.mesh.material = this.material;
        }

        if ( this._needsLayout && this.fontFace.ready ) {
          this.layout();
        }

        if ( this.projected )
          this.lookAt( camera.position );
      };
  }

  private updateText() {
    this.geometry.instanceCount = this.length;
    this.updateTextGlyphs();
  }

  private updateTextGlyphs() {
    let glyphArray = new Array<Glyph>( this.text.length );
    for ( let i = 0; i < this.text.length; i++ ) {
      const codepoint = this.text.codePointAt( i );
      if ( codepoint ) {
        glyphArray[ i ] = this._fontFace.glyph( codepoint );
      }
    }
    this.textGlyphs = glyphArray;
  }

  layout() {
    const typesetResults = Typesetter.typeset( this );
    this.origins = typesetResults.origins;
    this.tangents = typesetResults.tangents;
    this.ups = typesetResults.ups;
    this.texCoords = typesetResults.texCoords;

    this.setupGeometry();
    this._needsLayout = false;
  }

  setupGeometry() {
    this.geometry = new InstancedBufferGeometry();
    this.geometry.instanceCount = this.length;

    this._originsAttribute = new InstancedBufferAttribute( this._origins, 3 );
    this._tangentsAttribute = new InstancedBufferAttribute( this._tangents, 3 );
    this._upsAttribute = new InstancedBufferAttribute( this._ups, 3 );
    this._texCoordsAttribute = new InstancedBufferAttribute( this._texCoords, 4 );

    this.geometry.setAttribute( 'position', new BufferAttribute( this._vertices, 3 ) );

    this.geometry.setAttribute( 'origin', this._originsAttribute );
    this.geometry.setAttribute( 'tangent', this._tangentsAttribute );
    this.geometry.setAttribute( 'up', this._upsAttribute );
    this.geometry.setAttribute( 'texCoords', this._texCoordsAttribute );
  }

  updateColor() {
    // if ( !this.material.uniforms )
    //   return;
    // this.material.uniforms.color.value = this.color;
    //this._material.color = this.color;
    // following line might not be necessary
    //this.material.uniforms.color.value.needsUpdate = true;
  }

  updateMap() {
    //console.log( this.material.uniforms );
    // if ( !this.material.uniforms )
    //   return;
    // this.material.uniforms.map.value = this.fontFace.glyphTexture;
    this._material.map = this.fontFace.glyphTexture;
    console.warn( this._material.map );
    this._material.needsUpdate = true;
    //this.material.setValues = this.fontFace.glyphTexture;
    // following line might not be necessary
    //this.material.uniforms.color.value.needsUpdate = true;
  }

  updateDebug() {
    //@ts-expect-error
    console.log( this.material.uniforms );
    // if ( !this.material.uniforms )
    //   return;
    //@ts-expect-error
    this.material.uniforms.debug.value = this.debugMode;
    // following line might not be necessary
    //this.material.uniforms.debug.value.needsUpdate = true;
  }

  updateAntialiasing() {
    // if ( !this.material.uniforms )
    //   return;
    // this.material.uniforms.aa.value = this._aa;
    // following line might not be necessary
    //this.material.uniforms.debug.value.needsUpdate = true;
  }

  createShaderMaterial( map?: Texture, color?: Color ): ShaderMaterial {
    return ( new ShaderMaterial( {
      uniforms: {
        color: { value: color },
        map: { value: map },
        debug: { value: this._debugMode },
        aa: { value: this._aa },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: DoubleSide,
    } ) );
  }

  /***
   * @param object Object3D to attach to, label will then change position and rotation based on this object
   * @param anchorPosition A vector in world space that defines where the label is anchored
   * @param offsetRotationAxis A normalized vector in world space - can only be used together with angle!
   * @param offsetRotationAngle Angle in radians, expects float - can only be used together with axis!
   */
  addTo( object: Object3D, anchorPosition?: Vector3, offsetRotationAxis?: Vector3, offsetRotationAngle?: number ) {
    if ( offsetRotationAngle && offsetRotationAxis ) {
      this.rotateOnAxis( offsetRotationAxis, offsetRotationAngle );
    } else if ( offsetRotationAngle && !offsetRotationAxis ) {
      console.warn( `You tried to attach ${ this.text } Label with only an offset rotation angle but without rotation axis, an offset rotation needs both therefore no rotation was done` );
    } else if ( !offsetRotationAngle && offsetRotationAxis ) {
      console.warn( `You tried to attach ${ this.text } Label with only an offset rotation axis but without rotation angle, an offset rotation needs both therefore no rotation was done` );
    }
    const ogRotation = this.getWorldQuaternion( new Quaternion() );
    object.add( this );
    this.setGlobalRotation( ogRotation );
    if ( anchorPosition )
      this.translateGlobal( anchorPosition );
  }

  public setGlobalRotation( targetRotation: Quaternion ) {
    const parentQuaternion = new Quaternion();
    this.parent?.getWorldQuaternion( parentQuaternion );

    //rotation needed to get from q1 (parent) to q2 (target)
    // q2 = r * q1
    // q2 * q1.inv = r
    const rotation = parentQuaternion.invert();
    rotation.multiply( targetRotation );
    this.setRotationFromQuaternion( rotation );
  };

  public translateGlobal( vec: Vector3 ) {
    if ( !this.parent ) {
      this.position.add( vec );
      return;
    };

    const origin = this.parent.worldToLocal( new Vector3( 0, 0, 0 ) );
    const to = this.parent.worldToLocal( vec );
    this.position.add( to.sub( origin ) );
  }

  charAt( index: number ): string {
    if ( index >= this.length ) {
      console.error( `Expected index smaller than ${ length }, got index ${ index }` );
      return '';
    }

    return this.textGlyphs[ index ].toChar();
  }

  lineFeedAt( index: number ): boolean {
    return this.charAt( index ) === this.lineFeed;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }

  get fontFace(): FontFace {
    return this._fontFace;
  }
  set fontFace( fontFace: FontFace ) {
    if ( this._fontFace === fontFace )
      return;
    this._fontFace = fontFace;
    this._needsInitialLayout = true;
  }

  get length(): number {
    return this._text.length;
  }

  set text( text: string ) {
    if ( this._text === text )
      return;
    this._text = text;
    this._textChanged = true;
  }
  get text(): string {
    return this._text;
  }

  get textGlyphs(): Array<Glyph> {
    return this._textGlyphs;
  }
  private set textGlyphs( glyphArray: Array<Glyph> ) {
    this._textGlyphs = glyphArray;
  }

  get origins(): TypedArray {
    return this._origins;
  }
  private set origins( origins: Float32Array ) {
    if ( origins.length < this.length * 3 ) {
      console.error( `Expected array of size ${ this.length * 3 }, got an array of size ${ origins.length }` );
      return;
    }
    this._origins = origins;
  }

  get tangents(): TypedArray {
    return this._tangents;
  }
  private set tangents( tangents: Float32Array ) {
    if ( tangents.length < this.length * 3 ) {
      console.error( `Expected array of size ${ this.length * 3 }, got an array of size ${ tangents.length }` );
      return;
    }
    this._tangents = tangents;
  }

  get ups(): TypedArray {
    return this._ups;
  }
  private set ups( ups: Float32Array ) {
    if ( ups.length < this.length * 3 ) {
      console.error( `Expected array of size ${ this.length * 3 }, got an array of size ${ ups.length }` );
      return;
    }
    this._ups = ups;
  }

  get texCoords(): TypedArray {
    return this._tangents;
  }
  private set texCoords( texCoords: Float32Array ) {
    if ( texCoords.length < this.length * 4 ) {
      console.error( `Expected array of size ${ this.length * 4 }, got an array of size ${ texCoords.length }` );
      return;
    }
    this._texCoords = texCoords;
  }

  protected get material(): Material {
    return this.mesh.material as Material;
  }
  protected set material( material: Material ) {
    ( this.mesh.material as Material ).dispose();
    this.mesh.material = material;
  }

  protected get geometry(): InstancedBufferGeometry {
    return this.mesh.geometry as InstancedBufferGeometry;
  }
  protected set geometry( geometry: InstancedBufferGeometry ) {
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
  }

  protected get mesh(): Mesh {
    return this._mesh;
  }
  protected set mesh( mesh: Mesh ) {
    this._mesh = mesh;
    this.setOnBeforeRender( this._mesh );
    this.add( this._mesh );
  }

  /**
   * Text color as THREE.Color
   */
  get color(): Color {
    return this._color;
  }
  set color( color: Color ) {
    if ( this._color === color )
      return;
    this._color = color;
    this.updateColor();
  }

  get fontSize(): number {
    return this._fontSize;
  }
  set fontSize( scalingFactor: number ) {
    if ( this._fontSize === scalingFactor )
      return;
    this._fontSize = scalingFactor;
    this._needsLayout = true;
  }

  get projected(): boolean {
    return this._alwaysFaceCamera;
  }
  set projected( projected: boolean ) {
    this._alwaysFaceCamera = projected;
  }

  get lineAnchor(): Label.LineAnchor {
    return this._lineAnchor;
  }
  set lineAnchor( lineAnchor: Label.LineAnchor ) {
    if ( this._lineAnchor === lineAnchor )
      return;
    this._lineAnchor = lineAnchor;
    this._needsLayout = true;
  }

  get lineAnchorOffset(): number {
    let offset = 0.0;
    if ( !this.fontFace.ready )
      return 0;
    const fontFace = this.fontFace;
    const padding = fontFace.glyphTexturePadding;

    switch ( this.lineAnchor ) {
      case Label.LineAnchor.Ascent:
        offset = fontFace.ascent - padding.top;
        break;
      case Label.LineAnchor.Descent:
        offset = fontFace.descent * ( 1.0 + padding.top / fontFace.ascent );
        break;
      case Label.LineAnchor.Center:
        offset = fontFace.ascent - padding.top - 0.5 * fontFace.size;
        break;
      case Label.LineAnchor.Top:
        offset = fontFace.ascent - padding.top + 0.5 * fontFace.lineGap;
        break;
      case Label.LineAnchor.Bottom:
        offset = fontFace.ascent - padding.top + 0.5 * fontFace.lineGap - fontFace.lineHeight;
        break;
      case Label.LineAnchor.Baseline:
      default:
        offset = - padding.top;
        break;
    }
    return offset;
  }

  /**
     * Line width after which there is an automatic line feed if {@link wrap} is enabled
     */
  get lineWidth(): number {
    return this._lineWidth;
  }
  set lineWidth( lineWidth: number ) {
    if ( this._lineWidth === lineWidth ) {
      return;
    }
    this._lineWidth = lineWidth;
    this._needsLayout = true;
  }

  get lineFeed(): string {
    if ( this._lineFeed != '' ) {
      return this._lineFeed;
    }
    return Label.DEFAULT_LINE_FEED;
  }
  set lineFeed( lineFeed: string ) {
    if ( this._lineFeed === lineFeed )
      return;
    this._lineFeed = lineFeed;
    this._needsLayout = true;
  }

  /**
     * If enabled, breaks lines automatically at {@link lineWidth} (while typesetting)
     */
  set wrap( flag: boolean ) {
    this._wrap = flag;
    this._needsLayout = true;
  }
  get wrap(): boolean {
    return this._wrap;
  }

  /**
   * Text alignment, can be any from
   * @param Label.Alignment
   */
  get alignment(): Label.Alignment {
    return this._alignment;
  }
  set alignment( alignment: Label.Alignment ) {
    if ( this._alignment === alignment ) {
      return;
    }
    this._alignment = alignment;
    this._needsLayout = true;
  }

  get scalingFactor(): number {
    if ( !this.fontFace.ready )
      return 1;
    return this.fontSize / this.fontFace.size;
  }

  /**
   * Draws green borders around all glyphs when true
   */
  get debugMode(): boolean {
    return this._debugMode;
  }
  set debugMode( debug: boolean ) {
    if ( this._debugMode === debug )
      return;
    this._debugMode = debug;
    this.updateDebug();
  }

  /**
   * Anti-aliasing setting, set to true to turn on and false to turn off.
   */
  get aa(): boolean {
    return this._aa;
  }
  set aa( aa: boolean ) {
    if ( this._aa === aa )
      return;
    this._aa = aa;
    this.updateAntialiasing();
  }
}

namespace Label {

  export enum Alignment {
    Left = 'left',
    Center = 'center',
    Right = 'right',
  }

  export enum LineAnchor {
    Top = 'top',
    Ascent = 'ascent',
    Center = 'center',
    Baseline = 'baseline',
    Descent = 'descent',
    Bottom = 'bottom',
  }
}

export { Label };