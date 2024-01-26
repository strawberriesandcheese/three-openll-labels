import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Texture,
  TypedArray,
  Vector3,
} from 'three';

import { FontFace } from './FontFace';

import vertexShader from './shaders/font.vert?raw';
import fragmentShader from './shaders/font.frag?raw';
import { Glyph } from './Glyph';

class Label extends Mesh {

  _geometry: InstancedBufferGeometry;
  declare public material: ShaderMaterial;

  protected _fontFace: FontFace;
  protected _needsInitialLayout = true;
  protected _needsLayout = false;
  protected _textChanged = false;
  protected _color = new Color( 0x000000 );
  protected _text: string;

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

  private _scalingFactor = 1;

  constructor( text: string, fontFace: FontFace, color: Color ) {
    super();

    this.text = text;

    this._origins = new Float32Array( this.length * 3 );
    this._tangents = new Float32Array( this.length * 3 );
    this._ups = new Float32Array( this.length * 3 );
    this._texCoords = new Float32Array( this.length * 4 );

    this._geometry = new InstancedBufferGeometry();
    this._geometry.instanceCount = this.length;

    this.fontFace = fontFace;
    this._color = color;

    this._geometry.setAttribute( 'position', new BufferAttribute( this._vertices, 3 ) );

    this.updateMorphTargets();
  }

  // we need to make sure we have an actual font face ready before starting to work with it
  onBeforeRender() {
    if ( this._textChanged && this.fontFace.ready ) {
      this.updateText();
      this._needsLayout = true;
      this._textChanged = false;
    }

    if ( this._needsInitialLayout && this.fontFace.ready ) {
      this._needsLayout = true;
      this._needsInitialLayout = false;
      this.material = this.createShaderMaterial( this.fontFace.glyphTexture, this._color );
      this._scalingFactor = 1 / this.fontFace.size;
    }

    if ( this._needsLayout /*&& this.fontFace.ready*/ ) {
      this.layout();
    }
  }

  private updateText() {
    this._geometry.instanceCount = this.length;
    this.updateTextGlyphs();
  }

  private updateTextGlyphs() {
    let glyphArray = new Array<Glyph>( this.text.length );
    for ( let i = 0; i < this.text.length; i++ ) {
      const charIndex = this.text.codePointAt( i );
      if ( charIndex ) {
        glyphArray[ i ] = this._fontFace.glyph( charIndex );
      }
    }
    this.textGlyphs = glyphArray;
  }

  layout() {
    this.updateTexCoords();
    this.updateTangents();
    this.updateUps();
    this.updateOrigins();
    this.setupGeometry();
    this._needsLayout = false;
  }

  setupGeometry() {
    if ( this._geometry )
      this._geometry.dispose();

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

  updateOrigins() {
    let pen = new Vector3().copy( this.position );

    const origins = new Float32Array( this.length * 3 );

    for ( let i = 0; i < this._geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];

      origins[ 3 * i + 0 ] = pen.x + ( glyph.bearing.x - this.fontFace.glyphTexturePadding.left ) * this._scalingFactor;
      origins[ 3 * i + 1 ] = pen.y + ( glyph.bearing.y - glyph.extent.y ) * this._scalingFactor;
      origins[ 3 * i + 2 ] = pen.z;

      pen.x = pen.x + glyph.advance * this._scalingFactor;

      if ( i < this._geometry.instanceCount - 1 ) {
        const nextGlyph = this.textGlyphs[ i + 1 ];
        pen.x = pen.x + ( glyph.kerning( nextGlyph.index ) ) * this._scalingFactor;
      }
    }

    this.origins = origins;
  }

  updateTangents() {
    const tangents = new Float32Array( this.length * 3 );
    for ( let i = 0; i < this._geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];
      tangents[ 3 * i + 0 ] = glyph.extent.width * this._scalingFactor;
      tangents[ 3 * i + 1 ] = 0;
      tangents[ 3 * i + 2 ] = 0;
    }
    this.tangents = tangents;
  }

  updateUps() {
    const ups = new Float32Array( this.length * 3 );
    for ( let i = 0; i < this._geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];
      ups[ 3 * i + 0 ] = 0;
      ups[ 3 * i + 1 ] = glyph.extent.height * this._scalingFactor;
      ups[ 3 * i + 2 ] = 0;
    }
    this.ups = ups;
  }

  updateTexCoords() {
    const texCoords = new Float32Array( this.length * 4 );
    for ( let i = 0; i < this._geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];
      texCoords[ 4 * i + 0 ] = glyph.subTextureOrigin.x;
      texCoords[ 4 * i + 1 ] = glyph.subTextureOrigin.y;
      texCoords[ 4 * i + 2 ] = glyph.subTextureOrigin.x + glyph.subTextureExtent.x;
      texCoords[ 4 * i + 3 ] = glyph.subTextureOrigin.y + glyph.subTextureExtent.y;
    }
    this.texCoords = texCoords;
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

  get fontFace(): FontFace {
    return this._fontFace;
  }
  set fontFace( fontFace: FontFace ) {
    this._fontFace = fontFace;
  }

  get length(): number {
    return this._text.length;
  }

  set text( text: string ) {
    this._text = text;
    this._textChanged = true;
  }
  get text(): string {
    return this._text;
  }

  private get textGlyphs(): Array<Glyph> {
    return this._textGlyphs;
  }
  private set textGlyphs( glyphArray: Array<Glyph> ) {
    this._textGlyphs = glyphArray;
  }

  get origins(): TypedArray {
    return this._origins;
  }
  private set origins( origins: Float32Array ) {
    this._origins = origins;
  }

  get tangents(): TypedArray {
    return this._tangents;
  }
  private set tangents( tangents: Float32Array ) {
    this._tangents = tangents;
  }

  get ups(): TypedArray {
    return this._ups;
  }
  private set ups( ups: Float32Array ) {
    this._ups = ups;
  }

  get texCoords(): TypedArray {
    return this._tangents;
  }
  private set texCoords( texCoords: Float32Array ) {
    this._texCoords = texCoords;
  }

  protected get geometry(): InstancedBufferGeometry {
    return this._geometry;
  }
  protected set geometry( geometry: InstancedBufferGeometry ) {
    this._geometry = geometry;
  }

}

export { Label };