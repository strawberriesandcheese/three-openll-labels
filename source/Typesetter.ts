import { Vector2, Vector3, Vector4 } from "three";
import { Label } from "./label";
import { Glyph } from "./Glyph";
import { FontFace } from "./FontFace";
import { ReplaySubject } from "rxjs";

type BufferArrays = { origins: Float32Array, tangents: Float32Array, ups: Float32Array, texCoords: Float32Array; };

// Setup common delimiters for wordwrapping
const delimiters = [ '\x0A', ' ', ',', '.', '-', '/', '(', ')', '[', ']', '<', '>', '.' ];
const isDelimiter = ( character: string ): boolean => {
  return delimiters.includes( character );
};

class Typesetter {
  // stores line information for every glyph based on index (maybe only store start of line indices?)
  protected _glyphLine: number[];

  static typeset( label: Label ): BufferArrays {

    const origins = this.calculateOrigins( label );
    const tangents = this.calculateTangents( label );
    const ups = this.calculateUps( label );
    const texCoords = this.calculateTexCoords( label );

    texCoords;

    // const result = { origins, tangents, ups, texCoords };

    //const result = this.initArrays( label.length );
    const result = this.typesetLabel( label );
    // console.log( result.texCoords );
    return result;
  }

  static initArrays( size: number ): BufferArrays {
    const origins = new Float32Array( size * 3 ).fill( 0 );
    const tangents = new Float32Array( size * 3 ).fill( 0 );
    const ups = new Float32Array( size * 3 ).fill( 0 );
    const texCoords = new Float32Array( size * 4 ).fill( 0 );

    return { origins, tangents, ups, texCoords };
  }

  static typesetLabel( label: Label ): BufferArrays {
    type SegmentInformation =
      {
        firstDepictablePen: Vector3;
        lastDepictablePen: Vector3;
        startGlyphIndex: number;
      };

    // Get font face
    const fontFace = label.fontFace;

    // Append vertex cloud: the maximum number of visible glyphs is the size of the string
    const result = this.initArrays( label.length );

    let glyphStart = 0;

    const currentPen = new Vector3( 0, label.lineAnchorOffset );
    const currentLine: SegmentInformation = {
      firstDepictablePen: currentPen,
      lastDepictablePen: currentPen,
      startGlyphIndex: glyphStart
    };
    const lineForward: SegmentInformation = {
      firstDepictablePen: currentPen,
      lastDepictablePen: currentPen,
      startGlyphIndex: glyphStart
    };

    const lineWidth = Math.max( label.lineWidth * label.fontFace.size / label.fontSize, glyphStart );

    let firstDepictablePenInvalid = true;
    let index = glyphStart;
    for ( index; index < label.length; ) {
      const glyph = label.textGlyphs[ index ];
      let previousGlyph = new Glyph;
      if ( index > 0 )
        previousGlyph = fontFace.glyph( index - 1 );

      if ( firstDepictablePenInvalid && glyph.depictable() ) {
        currentLine.firstDepictablePen = currentPen;
        firstDepictablePenInvalid = false;
      }

      // Handle line feeds as well as word wrap for next word
      // (or next glyph if word width exceeds the max line width)
      const kerning = ( index != glyphStart ? previousGlyph.kerning( glyph.codepoint ) : 0 );
      const feedLine = label.lineFeedAt( index ) || ( label.wordWrap &&
        this.shouldWordWrap( label, lineWidth, currentPen, glyph, kerning ) );

      if ( feedLine ) {
        if ( index === glyphStart )
          console.warn( "trying to feed line at index 0" );

        // extent.x = glm:: max( currentLine.lastDepictablePen.x, extent.x );
        // extent.y += fontFace.lineHeight();

        const lineHeight = fontFace.lineHeight;
        currentPen.y -= lineHeight;

        // Handle newline and alignment
        this.typeset_align( currentLine.lastDepictablePen, label.alignment, currentLine.startGlyphIndex, lineForward.startGlyphIndex, result );

        // Omit relayouting
        let xOffset = currentLine.firstDepictablePen.x;

        for ( let j = lineForward.startGlyphIndex; j != index; ++j ) {
          // not sure if next line is necessary. discuss
          result.origins[ 3 * j + Typesetter.Components.x ] -= xOffset;
          result.origins[ 3 * j + Typesetter.Components.y ] -= lineHeight;
          //result.origins[ j ].x -= xOffset;
          //v.origin.y -= lineHeight;
        }

        currentPen.x = Math.max( lineForward.startGlyphIndex >= index ? 0 : currentPen.x - xOffset, 0 );
        currentLine.startGlyphIndex = lineForward.startGlyphIndex;
        lineForward.startGlyphIndex = index;

        currentLine.lastDepictablePen = currentPen;
        lineForward.firstDepictablePen = new Vector3( 0, currentPen.y, 0 );
        lineForward.lastDepictablePen = currentPen;
      }
      else {   // Apply kerning if no line feed precedes
        currentPen.x += kerning;
      }

      // Typeset glyphs in vertex cloud (only if renderable)
      if ( glyph.depictable() ) {
        //vertices.push_back( GlyphVertexCloud:: Vertex() );
        Typesetter.typeset_glyph( result, index, currentPen, glyph, fontFace );
      }
      ++index;

      currentPen.x += glyph.advance;

      if ( glyph.depictable() ) {
        lineForward.lastDepictablePen = currentPen;
      }

      if ( feedLine || isDelimiter( glyph.toChar() ) ) {
        currentLine.lastDepictablePen = lineForward.lastDepictablePen;
        firstDepictablePenInvalid = true;
        lineForward.startGlyphIndex = index;
      }

    }

    // Handle alignment (when last line of the label is processed)
    //extent.x = glm:: max( lineForward.lastDepictablePen.x, extent.x );
    //extent.y += fontFace.lineHeight();


    this.typeset_align( lineForward.lastDepictablePen, label.alignment, currentLine.startGlyphIndex, index, result );
    //vertex_transform( label.transform(), label.textColor(), vertices, glyphCloudStart, index );

    return result;
    //return extent_transform( label, extent );
  }

  static shouldWordWrap( label: Label, lineWidth: number, pen: Vector3, glyph: Glyph, kerning: number ): boolean {
    if ( !glyph.depictable() || ( glyph.advance > lineWidth && pen.x <= 0.0 ) ) {
      return false;
    }

    return pen.x + glyph.advance + kerning > lineWidth;
  }

  static typeset_align( pen: Vector3, alignment: Label.Alignment, begin: number, end: number, bufferArrays: BufferArrays ) {
    if ( alignment === Label.Alignment.Left ) {
      return;
    }

    let penOffset = -pen.x;

    if ( alignment == Label.Alignment.Center ) {
      penOffset *= 0.5;
    }

    // Origin is expected to be in 'font face space' (not transformed)
    for ( let i = begin; i != end; ++i ) {
      bufferArrays.origins[ 3 * i + Typesetter.Components.x ] += penOffset;
    }
  }

  static typeset_glyph(
    bufferArrays: BufferArrays, index: number, pen: Vector3, glyph: Glyph, fontFace: FontFace ) {
    // if ( pen.x < 0 ) {
    //   console.error( `Could not typeset glyph because pen was at x position ${ pen.x }` );
    //   return;
    // }

    console.log( glyph.toChar(), ": ", glyph );

    const padding = fontFace.glyphTexturePadding;
    const extent = glyph.subTextureExtent;
    const textureOrigin = glyph.subTextureOrigin;
    const penOrigin = new Vector3( glyph.bearing.x - padding.left, glyph.bearing.y - extent.y - padding.bottom, 0 );
    const penTangent = new Vector3( extent.x + padding.right + padding.left, 0, 0 );
    const penUp = new Vector3( 0, extent.y + padding.top + padding.bottom );
    const texCoords = new Vector4( textureOrigin.x, textureOrigin.y, textureOrigin.x + extent.x, textureOrigin.y + extent.y );

    //console.log( penOrigin, penTangent, penUp, texCoords );

    this.setOrigin( index, bufferArrays, pen.add( penOrigin ) );
    this.setTangent( index, bufferArrays, penTangent );
    this.setUp( index, bufferArrays, penUp );
    this.setTexChoords( index, bufferArrays, texCoords );

    console.log( bufferArrays.texCoords );
  }

  static getComponentOfBufferArray( index: number, component: Typesetter.Components, bufferArray: Float32Array ): number {
    if ( 3 * index + component >= bufferArray.length ) {
      console.error( `Index out of bounds for BufferArray` );
      return 0;
    }
    return bufferArray[ 3 * index + component ];
  };

  static setOrigin( index: number, bufferArrays: BufferArrays, value: Vector3 ) {
    for ( let i = Typesetter.Components.x as number; i <= ( Typesetter.Components.y as number ); i++ )
      bufferArrays.origins[ 3 * index + i ] = value.getComponent( i );
  }

  static setTangent( index: number, bufferArrays: BufferArrays, value: Vector3 ) {
    for ( let i = Typesetter.Components.x; i <= Typesetter.Components.y; i++ )
      bufferArrays.tangents[ 3 * index + i ] = value.getComponent( i );
  }

  static setUp( index: number, bufferArrays: BufferArrays, value: Vector3 ) {
    for ( let i = Typesetter.Components.x; i <= Typesetter.Components.y; i++ )
      bufferArrays.ups[ 3 * index + i ] = value.getComponent( i );
  }

  static setTexChoords( index: number, bufferArrays: BufferArrays, value: Vector4 ) {
    for ( let i = Typesetter.Components.x; i <= Typesetter.Components.w; i++ )
      bufferArrays.texCoords[ 4 * index + i ] = value.getComponent( i );
  }

  static calculateOrigins( label: Label ): Float32Array {
    let pen = new Vector3( 0, 0, 0 );

    const origins = new Float32Array( label.length * 3 );

    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      origins[ 3 * i + 0 ] = pen.x + ( glyph.bearing.x - label.fontFace.glyphTexturePadding.left ) * label.fontSize;
      origins[ 3 * i + 1 ] = pen.y + ( glyph.bearing.y - glyph.extent.y ) * label.fontSize;
      origins[ 3 * i + 2 ] = pen.z;

      pen.x = pen.x + glyph.advance * label.fontSize;

      // check for kerning only if not at last glyph of text
      if ( i < label.length - 1 ) {
        const nextGlyph = label.textGlyphs[ i + 1 ];
        pen.x = pen.x + ( glyph.kerning( nextGlyph.codepoint ) ) * label.fontSize;
      }
    } );

    return origins;
  }

  static calculateTangents( label: Label ): Float32Array {
    const tangents = new Float32Array( label.length * 3 );
    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      tangents[ 3 * i + 0 ] = glyph.extent.width * label.fontSize;
      tangents[ 3 * i + 1 ] = 0;
      tangents[ 3 * i + 2 ] = 0;
    } );
    return tangents;
  }

  static calculateUps( label: Label ): Float32Array {
    const ups = new Float32Array( label.length * 3 );
    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      ups[ 3 * i + 0 ] = 0;
      ups[ 3 * i + 1 ] = glyph.extent.height * label.fontSize;
      ups[ 3 * i + 2 ] = 0;
    } );
    return ups;
  }

  static calculateTexCoords( label: Label ): Float32Array {
    const texCoords = new Float32Array( label.length * 4 );
    label.textGlyphs.forEach( ( glyph: Glyph, i: number ) => {
      console.log( "working: ", glyph.toChar(), ": ", glyph );
      texCoords[ 4 * i + 0 ] = glyph.subTextureOrigin.x;
      texCoords[ 4 * i + 1 ] = glyph.subTextureOrigin.y;
      texCoords[ 4 * i + 2 ] = glyph.subTextureOrigin.x + glyph.subTextureExtent.x;
      texCoords[ 4 * i + 3 ] = glyph.subTextureOrigin.y + glyph.subTextureExtent.y;
    } );
    console.log( "working: ", texCoords );
    return texCoords;
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