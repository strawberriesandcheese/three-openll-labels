import { Vector3 } from "three";
import { Label } from "./Label";
import { Glyph } from "./Glyph";

type BufferArrays = { origins: Float32Array, tangents: Float32Array, ups: Float32Array, texCoords: Float32Array; };

class Typesetter {
  // stores line information for every glyph based on index (maybe only store start of line indices?)
  protected _glyphLine: number[];

  static typeset( label: Label ): BufferArrays {
    const origins = this.calculateOrigins( label );
    const tangents = this.calculateTangents( label );
    const ups = this.calculateUps( label );
    const texCoords = this.calculateTexCoords( label );



    return { origins, tangents, ups, texCoords };
  }

  static calculateOrigins( label: Label ): Float32Array {
    let pen = new Vector3().copy( label.position );

    const origins = new Float32Array( label.length * 3 );

    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      origins[ 3 * i + 0 ] = pen.x + ( glyph.bearing.x - label.fontFace.glyphTexturePadding.left ) * label.scalingFactor;
      origins[ 3 * i + 1 ] = pen.y + ( glyph.bearing.y - glyph.extent.y ) * label.scalingFactor;
      origins[ 3 * i + 2 ] = pen.z;

      pen.x = pen.x + glyph.advance * label.scalingFactor;

      // check for kerning only if not at last glyph of text
      if ( i < label.length - 1 ) {
        const nextGlyph = label.textGlyphs[ i + 1 ];
        pen.x = pen.x + ( glyph.kerning( nextGlyph.index ) ) * label.scalingFactor;
      }
    } );

    return origins;
  }

  static calculateTangents( label: Label ): Float32Array {
    const tangents = new Float32Array( label.length * 3 );
    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      tangents[ 3 * i + 0 ] = glyph.extent.width * label.scalingFactor;
      tangents[ 3 * i + 1 ] = 0;
      tangents[ 3 * i + 2 ] = 0;
    } );
    return tangents;
  }

  static calculateUps( label: Label ): Float32Array {
    const ups = new Float32Array( label.length * 3 );
    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      ups[ 3 * i + 0 ] = 0;
      ups[ 3 * i + 1 ] = glyph.extent.height * label.scalingFactor;
      ups[ 3 * i + 2 ] = 0;
    } );
    return ups;
  }

  static calculateTexCoords( label: Label ): Float32Array {
    const texCoords = new Float32Array( label.length * 4 );
    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      texCoords[ 4 * i + 0 ] = glyph.subTextureOrigin.x;
      texCoords[ 4 * i + 1 ] = glyph.subTextureOrigin.y;
      texCoords[ 4 * i + 2 ] = glyph.subTextureOrigin.x + glyph.subTextureExtent.x;
      texCoords[ 4 * i + 3 ] = glyph.subTextureOrigin.y + glyph.subTextureExtent.y;
    } );
    return texCoords;
  }
}

export { Typesetter };