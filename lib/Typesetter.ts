import { Vector2, Vector3 } from "three";
import { Label } from "./Label";
import { Glyph } from "./Glyph";

type BufferArrays = { origins: Float32Array, tangents: Float32Array, ups: Float32Array, texCoords: Float32Array; };
type Extent = { min: Vector2, max: Vector2; };
type TypesetResults = { bufferArrays: BufferArrays; extent: Extent; };

// Setup common delimiters for wordwrapping
const delimiters = [ '\x0A', ' ', '-', '/', '(', ')', '[', ']', '<', '>' ];
const isDelimiter = ( codepoint: number ): boolean => {
  return delimiters.includes( String.fromCodePoint( codepoint ) );
};

//Since space is technically renderable but we do not want to render it at the start and end of lines we have to handle it seperately
const isSpace = ( codepoint: number ): boolean => {
  return String.fromCodePoint( codepoint ) === ' ';
};

class Typesetter {
  static initArrays( size: number ): BufferArrays {
    const origins = new Float32Array( size * 3 ).fill( 0 );
    const tangents = new Float32Array( size * 3 ).fill( 0 );
    const ups = new Float32Array( size * 3 ).fill( 0 );
    const texCoords = new Float32Array( size * 4 ).fill( 0 );

    return { origins, tangents, ups, texCoords };
  }

  static typeset( label: Label ): TypesetResults {
    let { origins, tangents, ups, texCoords } = this.initArrays( label.length );

    const penStartPosition = new Vector3( 0, label.lineAnchorOffset * label.scalingFactor, 0 );
    let pen = new Vector3;
    pen.copy( penStartPosition );
    let glyphStart = 0;
    let lineStartGlyphIndex = glyphStart;
    let lastWordEndIndex = label.length;
    let lastWordEndPen = new Vector3();
    lastWordEndPen.copy( pen );
    let firstWordOfNewLine = true;

    let extent: Extent = { min: new Vector2( Infinity, Infinity ), max: new Vector2( -Infinity, -Infinity ) };

    extent.max.y = label.fontFace.lineHeight * label.scalingFactor;

    for ( let i = glyphStart; i < label.length; i++ ) {
      let glyph = label.textGlyphs[ i ];
      const lineHeight = label.fontFace.lineHeight;

      const newWordAt = ( index: number ): boolean => {
        return ( index < label.length - 1 ? ( !label.textGlyphs[ index ].depictable() || isDelimiter( label.textGlyphs[ index ].codepoint ) ) : false );
      };

      // first let's check if we reached a line break
      let kerning = ( i != glyphStart ? label.textGlyphs[ i - 1 ].kerning( glyph.codepoint ) : 0 );
      const feedLine = label.lineFeedAt( i ) || ( label.wrap && this.shouldWrap( label, pen, glyph, kerning ) );

      if ( !firstWordOfNewLine && feedLine ) {
        // a line break as a start would be weird but not unheard of
        if ( i === 0 )
          console.warn( "trying to feed line at index 0" );

        // since we reached a line break we need to go back to wrap our whole word not just its letters
        i = lastWordEndIndex + 1;
        // this glyph is the space character before the word that is on a new line
        let glyph = label.textGlyphs[ i ];
        kerning = ( i != glyphStart ? label.textGlyphs[ i - 1 ].kerning( glyph.codepoint ) : 0 );

        // do alignment stuff for previous line
        this.alignLine( lastWordEndPen, label.alignment, lineStartGlyphIndex, i, origins, extent );

        pen.y -= lineHeight * label.scalingFactor;

        lineStartGlyphIndex = i;
        pen.x = penStartPosition.x;

        firstWordOfNewLine = true;

        // we don't want to render spaces at the beginning of a line after a line feed due to alignment issues
        if ( isSpace( glyph.codepoint ) ) {
          this.dontDisplay( i, tangents, ups );
          continue;
        }

      } else {
        // check for kerning only if not at last glyph of text and no line feed preceeded
        if ( i < label.length - 1 ) {
          const nextGlyph = label.textGlyphs[ i + 1 ];
          pen.x += glyph.kerning( nextGlyph.codepoint ) * label.scalingFactor;
        }
      }

      // we only need to process renderable glyphs
      if ( glyph.depictable() ) {
        this.calculateOrigin( pen, label, i, origins );
        this.calculateTangent( label, i, tangents );
        this.calculateUp( label, i, ups );
        this.calculateTexCoords( label, i, texCoords );
      }

      pen.x += glyph.advance * label.scalingFactor;

      if ( newWordAt( i + 1 ) ) {
        lastWordEndIndex = i;
        lastWordEndPen.copy( pen );
        firstWordOfNewLine = false;
      }
    }

    // handle alignment for last line
    this.alignLine( pen, label.alignment, lineStartGlyphIndex, label.length, origins, extent );

    return { bufferArrays: { origins, tangents, ups, texCoords }, extent };
  }

  static shouldWrap( label: Label, pen: Vector3, glyph: Glyph, kerning: number ): boolean {
    if ( !glyph.depictable() || ( glyph.advance * label.scalingFactor > ( label.lineWidth ) && pen.x <= 0.0 ) ) {
      return false;
    }

    return pen.x + ( glyph.advance + kerning ) * label.scalingFactor > ( label.lineWidth );
  }

  static alignLine( pen: Vector3, alignment: Label.Alignment, begin: number, end: number, origins: Float32Array, extent: Extent ) {
    let penOffset = 0;
    if ( !( alignment === Label.Alignment.Left ) ) {
      penOffset = -pen.x;
    }

    if ( alignment == Label.Alignment.Center ) {
      penOffset *= 0.5;
    }

    extent.min.x = Math.min( extent.min.x, penOffset );
    extent.min.y = Math.min( extent.min.y, pen.y );

    // Origin is expected to be in 'font face space' (not transformed)
    for ( let i = begin; i != end; ++i ) {
      origins[ 3 * i + Typesetter.Components.x ] += penOffset;
    }

    extent.max.x = Math.max( extent.max.x, pen.x + penOffset );
  }

  static calculateOrigin( pen: Vector3, label: Label, glyphIndex: number, origins: Float32Array ) {
    const glyph = label.textGlyphs[ glyphIndex ];
    const padding = label.fontFace.glyphTexturePadding;
    const penOrigin = new Vector2(
      ( glyph.bearing.x - padding.left ) * label.scalingFactor,
      ( glyph.bearing.y - glyph.extent.height ) * label.scalingFactor );

    origins[ 3 * glyphIndex + 0 ] = pen.x + penOrigin.x;
    origins[ 3 * glyphIndex + 1 ] = pen.y + penOrigin.y;
    origins[ 3 * glyphIndex + 2 ] = pen.z;
  }

  static calculateTangent( label: Label, glyphIndex: number, tangents: Float32Array ) {
    const glyph = label.textGlyphs[ glyphIndex ];
    tangents[ 3 * glyphIndex + 0 ] = glyph.extent.width * label.scalingFactor;
    tangents[ 3 * glyphIndex + 1 ] = 0;
    tangents[ 3 * glyphIndex + 2 ] = 0;
  }

  static calculateUp( label: Label, glyphIndex: number, ups: Float32Array ) {
    const glyph = label.textGlyphs[ glyphIndex ];
    ups[ 3 * glyphIndex + 0 ] = 0;
    ups[ 3 * glyphIndex + 1 ] = glyph.extent.height * label.scalingFactor;
    ups[ 3 * glyphIndex + 2 ] = 0;
  }

  static calculateTexCoords( label: Label, glyphIndex: number, texCoords: Float32Array ) {
    const glyph = label.textGlyphs[ glyphIndex ];
    texCoords[ 4 * glyphIndex + 0 ] = glyph.subTextureOrigin.x;
    texCoords[ 4 * glyphIndex + 1 ] = glyph.subTextureOrigin.y;
    texCoords[ 4 * glyphIndex + 2 ] = glyph.subTextureOrigin.x + glyph.subTextureExtent.x;
    texCoords[ 4 * glyphIndex + 3 ] = glyph.subTextureOrigin.y + glyph.subTextureExtent.y;
  }

  static dontDisplay( glyphIndex: number, tangents: Float32Array, ups: Float32Array ) {
    tangents[ 3 * glyphIndex + 0 ] = 0;
    ups[ 3 * glyphIndex + 1 ] = 0;
  }
}

namespace Typesetter {
  export enum Components {
    x = 0,
    y = 1,
    z = 2,
    w = 3
  }
}

export { Typesetter };