import {
  BufferAttribute,
  Camera,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  Object3D,
  Quaternion,
  Renderer,
  Scene,
  ShaderMaterial,
  Texture,
  TypedArray,
  Vector3,
} from 'three';

import { FontFace } from './FontFace';

import vertexShader from './shaders/font.vert?raw';
import fragmentShader from './shaders/font.frag?raw';
import { Glyph } from './Glyph';
import { Typesetter } from './Typesetter';


class Label extends Mesh {

  static readonly DEFAULT_LINE_FEED = '\x0A';

  _geometry: InstancedBufferGeometry;
  declare public material: ShaderMaterial;

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
  protected _wordWrap = false;
  protected _alignment = Label.Alignment.Left;

  public useUlrikeTypesetter = false;

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

  constructor( text: string, fontFace: FontFace, color: Color ) {
    super();

    this.text = text;
    this._lineAnchor;

    this._origins = new Float32Array( this.length * 3 ).fill( 0 );
    this._tangents = new Float32Array( this.length * 3 ).fill( 0 );
    this._ups = new Float32Array( this.length * 3 ).fill( 0 );
    this._texCoords = new Float32Array( this.length * 4 ).fill( 0 );

    this._geometry = new InstancedBufferGeometry();
    this._geometry.instanceCount = this.length;

    this.fontFace = fontFace;
    this._color = color;

    this.updateMorphTargets();
  }

  // we need to make sure we have an actual font face ready before starting to work with it
  onBeforeRender( renderer: Renderer, scene: Scene, camera: Camera ) {
    if ( this._textChanged && this.fontFace.ready ) {
      this.updateText();
      this._needsLayout = true;
      this._textChanged = false;
    }

    if ( this._needsInitialLayout && this.fontFace.ready ) {
      this._needsLayout = true;
      this._needsInitialLayout = false;
      this.material = this.createShaderMaterial( this.fontFace.glyphTexture, this._color );
      //this._fontSize = 1 / this.fontFace.size;
    }

    if ( this._needsLayout && this.fontFace.ready ) {
      this.layout();
    }

    if ( this.projected )
      this.lookAt( camera.position );
  }

  private updateText() {
    this._geometry.instanceCount = this.length;
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
    const typesetResults = Typesetter.typeset( this, this.useUlrikeTypesetter );
    this.origins = typesetResults.origins;
    this.tangents = typesetResults.tangents;
    this.ups = typesetResults.ups;
    this.texCoords = typesetResults.texCoords;

    this.setupGeometry();
    this._needsLayout = false;
  }

  setupGeometry() {
    if ( this._geometry )
      this._geometry.dispose();

    this._geometry.setAttribute( 'position', new BufferAttribute( this._vertices, 3 ) );

    this._geometry = new InstancedBufferGeometry();
    this._geometry.instanceCount = this.length;

    this._originsAttribute = new InstancedBufferAttribute( this._origins, 3 );
    this._tangentsAttribute = new InstancedBufferAttribute( this._tangents, 3 );
    this._upsAttribute = new InstancedBufferAttribute( this._ups, 3 );
    this._texCoordsAttribute = new InstancedBufferAttribute( this._texCoords, 4 );

    this._geometry.setAttribute( 'position', new BufferAttribute( this._vertices, 3 ) );
    this._geometry.setAttribute( 'origin', this._originsAttribute );
    this._geometry.setAttribute( 'tangent', this._tangentsAttribute );
    this._geometry.setAttribute( 'up', this._upsAttribute );
    this._geometry.setAttribute( 'texCoords', this._texCoordsAttribute );
  }

  updateColor() {
    if ( !this.material )
      return;
    this.material.uniforms.color.value = this.color;
    // following line might not be necessary
    this.material.uniforms.color.value.needsUpdate = true;
  }

  createShaderMaterial( map: Texture, color: Color ): ShaderMaterial {
    return ( new ShaderMaterial( {
      uniforms: {
        color: { value: color },
        map: { value: map },
      },
      vertexShader,
      fragmentShader,

      side: DoubleSide,
    } ) );
  }

  attachTo( object: Object3D ) {
    const ogRotation = this.getWorldQuaternion( new Quaternion() );
    object.add( this );
    this.setGlobalRotation( ogRotation );
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

  protected get geometry(): InstancedBufferGeometry {
    return this._geometry;
  }
  protected set geometry( geometry: InstancedBufferGeometry ) {
    this._geometry = geometry;
  }

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

  get lineWidth(): number {
    if ( !this.fontFace.ready )
      return NaN;
    return this._lineWidth * this._fontFace!.size / this.fontSize;
  }
  set lineWidth( lineWidth: number ) {
    if ( this._lineWidth === lineWidth ) {
      return;
    }
    this._lineWidth = lineWidth;
    this._needsLayout;
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

  set wordWrap( flag: boolean ) {
    if ( this._wordWrap === flag )
      return;
    this._wordWrap = flag;
    this._needsLayout = true;
  }
  get wordWrap(): boolean {
    return this._wordWrap;
  }

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