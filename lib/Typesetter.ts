import { Vector2, Vector3, Vector4 } from "three";
import { Label } from "./Label";
import { Glyph } from "./Glyph";
import { FontFace } from "./FontFace";

type BufferArrays = { origins: Float32Array, tangents: Float32Array, ups: Float32Array, texCoords: Float32Array; };

// Setup common delimiters for wordwrapping
const delimiters = [ '\x0A', ' ', ',', '.', '-', '/', '(', ')', '[', ']', '<', '>', '.' ];
const isDelimiter = ( codepoint: number ): boolean => {
  return delimiters.includes( String.fromCodePoint( codepoint ) );
};

//Since space is technically renderable but we do not want to render it at the start of lines we have to handle it seperately
const isSpace = ( codepoint: number ): boolean => {
  return String.fromCodePoint( codepoint ) === ' ';
};

class Typesetter {
  // stores line information for every glyph based on index (maybe only store start of line indices?)
  protected _glyphLine: number[];

  static typeset( label: Label, useMyWay: boolean ): BufferArrays {
    return this.typesetMyWay( label );
  }

  static initArrays( size: number ): BufferArrays {
    const origins = new Float32Array( size * 3 ).fill( 0 );
    const tangents = new Float32Array( size * 3 ).fill( 0 );
    const ups = new Float32Array( size * 3 ).fill( 0 );
    const texCoords = new Float32Array( size * 4 ).fill( 0 );

    return { origins, tangents, ups, texCoords };
  }

  static typesetMyWay( label: Label ): BufferArrays {
    let { origins, tangents, ups, texCoords } = this.initArrays( label.length );

    const penStartPosition = new Vector3( 0, label.lineAnchorOffset * label.scalingFactor, 0 );
    let pen = new Vector3;
    pen.copy( penStartPosition );
    let glyphStart = 0;
    let lineStartGlyphIndex = glyphStart;

    for ( let i = glyphStart; i < label.textGlyphs.length; i++ ) {
      let glyph = label.textGlyphs[ i ];
      const lineHeight = label.fontFace.lineHeight;

      // first let's check if we reached a line break
      const kerning = ( i != glyphStart ? label.textGlyphs[ i - 1 ].kerning( glyph.codepoint ) : 0 );

      const afterDelimiter = ( i != glyphStart ? isDelimiter( label.textGlyphs[ i - 1 ].codepoint ) : false );
      const newWord = ( i != lineStartGlyphIndex ? ( !label.textGlyphs[ i ].depictable() || afterDelimiter ) : false );
      const feedLine = label.lineFeedAt( i ) || ( label.wrap && newWord && this.shouldWrap( label, pen, glyph, kerning ) );

      if ( feedLine ) {
        // a line break as a start would be weird but not unheard of
        if ( i === 0 )
          console.warn( "trying to feed line at index 0" );

        pen.y -= lineHeight * label.scalingFactor;

        // do alignment stuff
        this.alignLine( pen, label.alignment, lineStartGlyphIndex, i, origins );

        lineStartGlyphIndex = i;
        pen.x = penStartPosition.x;

        if ( isSpace( glyph.codepoint ) )
          continue;

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
    }

    // handle alignment for last line
    this.alignLine( pen, label.alignment, lineStartGlyphIndex, label.textGlyphs.length, origins );

    return { origins, tangents, ups, texCoords };
  }

  // static typesetLabel( label: Label ): BufferArrays {
  //   type SegmentInformation =
  //     {
  //       firstDepictablePen: Vector3;
  //       lastDepictablePen: Vector3;
  //       startGlyphIndex: number;
  //     };

  //   // Get font face and label scaling factor
  //   const fontFace = label.fontFace;
  //   const scalingFactor = label.scalingFactor;

  //   // Append vertex cloud: the maximum number of visible glyphs is the size of the string
  //   const result = this.initArrays( label.length );

  //   let glyphStart = 0;

  //   const currentPen = new Vector3( 0, label.lineAnchorOffset * scalingFactor, 0 );
  //   const currentLine: SegmentInformation = {
  //     firstDepictablePen: currentPen,
  //     lastDepictablePen: currentPen,
  //     startGlyphIndex: glyphStart
  //   };
  //   const lineForward: SegmentInformation = {
  //     firstDepictablePen: currentPen,
  //     lastDepictablePen: currentPen,
  //     startGlyphIndex: glyphStart
  //   };

  //   const lineWidth = Math.max( label.lineWidth * scalingFactor, glyphStart );

  //   let firstDepictablePenInvalid = true;
  //   let index = glyphStart;
  //   for ( index; index < label.length; ) {
  //     const glyph = label.textGlyphs[ index ];
  //     let previousGlyph = new Glyph;
  //     if ( index > currentLine.startGlyphIndex )
  //       previousGlyph = label.textGlyphs[ index - 1 ];

  //     if ( firstDepictablePenInvalid && glyph.depictable() ) {
  //       currentLine.firstDepictablePen = currentPen;
  //       firstDepictablePenInvalid = false;
  //     }

  //     // Handle line feeds as well as word wrap for next word
  //     // (or next glyph if word width exceeds the max line width)
  //     const kerning = ( index != glyphStart ? previousGlyph.kerning( glyph.codepoint ) : 0 );
  //     const feedLine = label.lineFeedAt( index ) || ( label.wrap &&
  //       this.shouldWordWrap( label, lineWidth, currentPen, glyph, kerning ) );

  //     if ( feedLine ) {
  //       if ( index === glyphStart )
  //         console.warn( "trying to feed line at index 0" );

  //       // extent.x = glm:: max( currentLine.lastDepictablePen.x, extent.x );
  //       // extent.y += fontFace.lineHeight();

  //       const lineHeight = fontFace.lineHeight;
  //       currentPen.y -= lineHeight * scalingFactor;

  //       // Handle newline and alignment
  //       this.typeset_align( currentLine.lastDepictablePen, label.alignment, currentLine.startGlyphIndex, lineForward.startGlyphIndex, result );

  //       // Omit relayouting
  //       let xOffset = currentLine.firstDepictablePen.x;

  //       for ( let j = lineForward.startGlyphIndex; j != index; ++j ) {
  //         // not sure if next line is necessary. discuss
  //         result.origins[ 3 * j + Typesetter.Components.x ] -= xOffset * scalingFactor;
  //         result.origins[ 3 * j + Typesetter.Components.y ] -= lineHeight * scalingFactor;
  //         //result.origins[ j ].x -= xOffset;
  //         //v.origin.y -= lineHeight;
  //       }

  //       currentPen.x = Math.max( lineForward.startGlyphIndex >= index ? 0 : currentPen.x - xOffset, 0 ) * scalingFactor;
  //       currentLine.startGlyphIndex = lineForward.startGlyphIndex;
  //       lineForward.startGlyphIndex = index;

  //       currentLine.lastDepictablePen = currentPen;
  //       lineForward.firstDepictablePen = new Vector3( 0, currentPen.y, 0 );
  //       lineForward.lastDepictablePen = currentPen;
  //     }
  //     else {   // Apply kerning if no line feed precedes
  //       currentPen.x += kerning * scalingFactor;
  //     }

  //     // Typeset glyphs in vertex cloud (only if renderable)
  //     if ( glyph.depictable() ) {
  //       //vertices.push_back( GlyphVertexCloud:: Vertex() );
  //       Typesetter.typeset_glyph( result, index, currentPen, glyph, fontFace, scalingFactor );
  //     }
  //     ++index;

  //     currentPen.x += glyph.advance * scalingFactor;

  //     if ( glyph.depictable() ) {
  //       lineForward.lastDepictablePen = currentPen;
  //     }

  //     if ( feedLine || isDelimiter( glyph.toChar() ) ) {
  //       currentLine.lastDepictablePen = lineForward.lastDepictablePen;
  //       firstDepictablePenInvalid = true;
  //       lineForward.startGlyphIndex = index;
  //     }

  //   }

  //   // Handle alignment (when last line of the label is processed)
  //   //extent.x = glm:: max( lineForward.lastDepictablePen.x, extent.x );
  //   //extent.y += fontFace.lineHeight();

  //   this.typeset_align( lineForward.lastDepictablePen, label.alignment, currentLine.startGlyphIndex, index, result );
  //   //vertex_transform( label.transform(), label.textColor(), vertices, glyphCloudStart, index );

  //   return result;
  //   //return extent_transform( label, extent );
  // }

  static shouldWrap( label: Label, pen: Vector3, glyph: Glyph, kerning: number ): boolean {
    if ( !glyph.depictable() || ( glyph.advance * label.scalingFactor > ( label.lineWidth ) && pen.x <= 0.0 ) ) {
      return false;
    }

    return pen.x + ( glyph.advance + kerning ) * label.scalingFactor > ( label.lineWidth );
  }

  static alignLine( pen: Vector3, alignment: Label.Alignment, begin: number, end: number, origins: Float32Array ) {
    if ( alignment === Label.Alignment.Left ) {
      return;
    }

    let penOffset = -pen.x;

    if ( alignment == Label.Alignment.Center ) {
      penOffset *= 0.5;
    }

    // Origin is expected to be in 'font face space' (not transformed)
    for ( let i = begin; i != end; ++i ) {
      origins[ 3 * i + Typesetter.Components.x ] += penOffset;
    }
  }

  static calculateOrigin( pen: Vector3, label: Label, glyphIndex: number, origins: Float32Array ) {
    const glyph = label.textGlyphs[ glyphIndex ];
    const padding = label.fontFace.glyphTexturePadding;
    const penOrigin = new Vector2(
      ( glyph.bearing.x - padding.left ) * label.scalingFactor,
      ( glyph.bearing.y - glyph.extent.height ) * label.scalingFactor );

    origins[ 3 * glyphIndex + 0 ] += pen.x + penOrigin.x;
    origins[ 3 * glyphIndex + 1 ] += pen.y + penOrigin.y;
    origins[ 3 * glyphIndex + 2 ] += pen.z;
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