import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Texture,
} from 'three';

import { FontFace } from './FontFace';

import vertexShader from './shaders/font.vert?raw';
import fragmentShader from './shaders/font.frag?raw';

class Label extends Mesh {

  readonly geometry: InstancedBufferGeometry;

  protected fontFace: FontFace;
  protected needsInitialLayout = true;
  protected needsLayout = false;
  protected color = new Color( 0x000000 );

  readonly vertices = new Float32Array( [
    0.0, 0.0, 0.0, // v0
    1.0, 0.0, 0.0, // v1
    0.0, 1.0, 0.0, // v2

    0.0, 1.0, 0.0, // v3
    1.0, 0.0, 0.0, // v4
    1.0, 1.0, 0.0  // v5
  ] );

  origins: Float32Array;
  tangents: Float32Array;
  ups: Float32Array;
  texCoords: Float32Array;

  constructor( fontFace: FontFace, count: number, color: Color ) {
    super();

    this.origins = new Float32Array( count * 3 );
    this.tangents = new Float32Array( count * 3 );
    this.ups = new Float32Array( count * 3 );
    this.texCoords = new Float32Array( count * 4 );

    this.geometry = new InstancedBufferGeometry();
    this.geometry.instanceCount = count;

    this.fontFace = fontFace;
    this.color = color;

    this.initBuffers();

    this.updateMorphTargets;
  }

  onBeforeRender() {
    if ( this.needsInitialLayout && this.fontFace.ready ) {
      this.needsLayout = true;
      this.needsInitialLayout = false;
      this.material = this.createShaderMaterial( this.fontFace.glyphTexture, this.color );
    }
    if ( this.needsLayout ) {
      this.layout();
    }
  }

  initBuffers() {
    this.initOrigins();
    this.randomlyInitTangents();
    this.randomlyInitUps();
    this.randomlyInitTexCoords();

    this.geometry.setAttribute( 'position', new BufferAttribute( this.vertices, 3 ) );
    this.geometry.setAttribute( 'origin', new InstancedBufferAttribute( this.origins, 3 ) );
    this.geometry.setAttribute( 'tangent', new InstancedBufferAttribute( this.tangents, 3 ) );
    this.geometry.setAttribute( 'up', new InstancedBufferAttribute( this.ups, 3 ) );
    this.geometry.setAttribute( 'texCoords', new InstancedBufferAttribute( this.texCoords, 4 ) );
  }

  initOrigins() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      this.origins[ 3 * i + 0 ] = ( ( i % 3 ) - 1 ) * 2;
      this.origins[ 3 * i + 1 ] = Math.floor( i / 3 ) * 2;
      this.origins[ 3 * i + 2 ] = 0;
    }
  }

  randomlyInitTangents() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      this.tangents[ 3 * i + 0 ] = Math.random();
      this.tangents[ 3 * i + 1 ] = 0;
      this.tangents[ 3 * i + 2 ] = 0;
    }
  }

  randomlyInitUps() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      this.ups[ 3 * i + 0 ] = 0;
      this.ups[ 3 * i + 1 ] = Math.random();
      this.ups[ 3 * i + 2 ] = 0;
    }
  }

  randomlyInitTexCoords() {
    for ( let i = 0; i < this.geometry.instanceCount; i++ ) {
      this.texCoords[ 4 * i + 0 ] = Math.random() * 0.5;
      this.texCoords[ 4 * i + 1 ] = Math.random() * 0.5;
      this.texCoords[ 4 * i + 2 ] = this.texCoords[ 4 * i + 0 ] + Math.random() * 0.5;
      this.texCoords[ 4 * i + 3 ] = this.texCoords[ 4 * i + 1 ] + Math.random() * 0.5;
    }
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
    console.log( this.fontFace.size );
    this.needsLayout = false;
  }
}

export { Label };