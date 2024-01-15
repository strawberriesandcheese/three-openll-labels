import {
  BufferAttribute,
  BufferGeometry,
  InstancedBufferGeometry,
} from 'three';

class LabelGeometry extends BufferGeometry {

  /**
    * These 2D vertices are equal for all quads, used for instanced rendering. Their actual position will be changed
    * in the vertex shader, based on origins, tangents and up-vector attributes.
    * 2-------4
    * |  \    |
    * |    \  |
    * 1-------3
    */
  protected static readonly VERTICES = new Float32Array(
    [ 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0 ] );

  protected static GLYPHBASEGEOMETRY = ( () => {
    let geom = new InstancedBufferGeometry();
    geom.setAttribute( 'position', new BufferAttribute( LabelGeometry.VERTICES, 2 ) );
    return geom;
  } )();

  constructor( numberOfGlyphs: number ) {
    LabelGeometry.GLYPHBASEGEOMETRY.instanceCount += numberOfGlyphs;
    super();
  };
}