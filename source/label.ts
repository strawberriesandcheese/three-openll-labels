import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three';

import { FontFace } from './FontFace';

import vertexShader from './shaders/font.vert?raw';
import fragmentShader from './shaders/font.frag?raw';
import { Glyph } from './Glyph';

class Label extends Mesh {

  readonly geometry: InstancedBufferGeometry;

  protected _fontFace: FontFace;
  protected _needsInitialLayout = true;
  protected _needsLayout = false;
  protected _color = new Color( 0x000000 );
  protected _text: string;
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

  private _scalingFactor = 1;

  constructor( text: string, fontFace: FontFace, color: Color ) {
    super();

    this._text = text;

    this._origins = new Float32Array( this.length * 3 );
    this._tangents = new Float32Array( this.length * 3 );
    this._ups = new Float32Array( this.length * 3 );
    this._texCoords = new Float32Array( this.length * 4 );

    this.geometry = new InstancedBufferGeometry();
    this.geometry.instanceCount = this.length;

    this._fontFace = fontFace;
    this._color = color;

    this.initBuffers();

    this.updateMorphTargets;
  }

  onBeforeRender() {
    if ( this._needsInitialLayout && this._fontFace.ready ) {
      this._needsLayout = true;
      this._needsInitialLayout = false;
      this.material = this.createShaderMaterial( this._fontFace.glyphTexture, this._color );
      this.updateTextGlyphs();
      this._scalingFactor = 1 / this._fontFace.size;
    }
    if ( this._needsLayout ) {
      this.layout();
    }
  }

  initBuffers() {
    this.geometry.setAttribute( 'position', new BufferAttribute( this._vertices, 3 ) );
    this.geometry.setAttribute( 'origin', new InstancedBufferAttribute( this._origins, 3 ) );
    this.geometry.setAttribute( 'tangent', new InstancedBufferAttribute( this._tangents, 3 ) );
    this.geometry.setAttribute( 'up', new InstancedBufferAttribute( this._ups, 3 ) );
    this.geometry.setAttribute( 'texCoords', new InstancedBufferAttribute( this._texCoords, 4 ) );
  }

  updateOrigins() {
    console.log( this.position );
    let pen = new Vector3().copy( this.position );

    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];

      this._origins[ 3 * i + 0 ] = pen.x + ( glyph.bearing.x - this._fontFace.glyphTexturePadding.left ) * this._scalingFactor;
      this._origins[ 3 * i + 1 ] = pen.y + ( glyph.bearing.y - glyph.extent.y ) * this._scalingFactor;
      this._origins[ 3 * i + 2 ] = pen.z;

      pen.x = pen.x + glyph.advance * this._scalingFactor;

      if ( i < this.geometry.instanceCount - 1 ) {
        const nextGlyph = this.textGlyphs[ i + 1 ];
        pen.x = pen.x + ( glyph.kerning( nextGlyph.index ) ) * this._scalingFactor;
      }
    }

    this.geometry.getAttribute( 'origin' ).needsUpdate = true;
  }

  updateTangents() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];
      this._tangents[ 3 * i + 0 ] = glyph.extent.width * this._scalingFactor;
      this._tangents[ 3 * i + 1 ] = 0;
      this._tangents[ 3 * i + 2 ] = 0;
    }

    this.geometry.getAttribute( 'tangent' ).needsUpdate = true;
  }

  updateUps() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];
      this._ups[ 3 * i + 0 ] = 0;
      this._ups[ 3 * i + 1 ] = glyph.extent.height * this._scalingFactor;
      this._ups[ 3 * i + 2 ] = 0;
    }

    this.geometry.getAttribute( 'up' ).needsUpdate = true;
  }

  updateTexCoords() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      const glyph = this.textGlyphs[ i ];
      this._texCoords[ 4 * i + 0 ] = glyph.subTextureOrigin.x;
      this._texCoords[ 4 * i + 1 ] = glyph.subTextureOrigin.y;
      this._texCoords[ 4 * i + 2 ] = glyph.subTextureOrigin.x + glyph.subTextureExtent.x;
      this._texCoords[ 4 * i + 3 ] = glyph.subTextureOrigin.y + glyph.subTextureExtent.y;
    }

    this.geometry.getAttribute( 'texCoords' ).needsUpdate = true;
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

  layout() {
    console.log( this._fontFace.size );
    this.updateTexCoords();
    this.updateTangents();
    this.updateUps();
    this.updateOrigins();
    this._needsLayout = false;
  }

  get length(): number {
    return this._text.length;
  }

  set text( text: string ) {
    this._text = text;
  }
  get text(): string {
    return this._text;
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

  private get textGlyphs(): Array<Glyph> {

    return this._textGlyphs;
  }
  private set textGlyphs( glyphArray: Array<Glyph> ) {
    this._textGlyphs = glyphArray;
  }
}

export { Label };