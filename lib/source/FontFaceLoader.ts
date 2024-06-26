import { FontFace } from './FontFace';
import { Loader, FileLoader, LoadingManager, Cache, TextureLoader, Vector2 } from 'three';
import { Glyph } from './Glyph';

type StringPairs = Map<string, string>;

class FontFaceLoader extends Loader {

  constructor( manager?: LoadingManager ) {

    manager ? super( manager ) : super();

  }

  load( fontName: string, onLoad?: ( ( data: FontFace ) => void ), onProgress?: ( ( event: ProgressEvent<EventTarget> ) => void ), onError?: ( ( err: unknown ) => void ) ): FontFace {

    const descString = `${ fontName }.fnt`;
    const atlasString = `${ fontName }.png`;

    return ( this.loadFromUrls( descString, atlasString, onLoad, onProgress, onError ) );
  }

  loadFromUrls( descriptionUrl: string, atlasUrl: string, onLoad?: ( ( data: FontFace ) => void ), onProgress?: ( ( event: ProgressEvent<EventTarget> ) => void ), onError?: ( ( err: unknown ) => void ) ): FontFace {
    Cache.enabled = true;

    let fontFace = new FontFace;

    const descriptionLoader = new FileLoader( this.manager );
    descriptionLoader.setPath( this.path );
    descriptionLoader.setRequestHeader( this.requestHeader );
    descriptionLoader.setWithCredentials( this.withCredentials );
    descriptionLoader.load(
      descriptionUrl,
      ( descData ) => {
        try {

          let status = this.processDescription( descData, fontFace );
          if ( status !== true )
            throw new Error( 'Description file could not be parsed correctly.' );

          const texture = new TextureLoader( this.manager )
            .setPath( this.path )
            .setRequestHeader( this.requestHeader )
            .setWithCredentials( this.withCredentials )
            .load( atlasUrl,
              () => {
                fontFace.glyphTexture = texture;
                if ( status === true )
                  fontFace.ready = true;
                if ( onLoad )
                  onLoad( fontFace );
              }, onProgress, onError );

        } catch ( e ) {

          if ( onError ) {
            onError( e );
          } else {
            console.error( e );
          }
          this.manager.itemError( descriptionUrl );

        }
      }, onProgress, onError );

    return fontFace;
  }

  loadFromAPI( url: string ): FontFace {
    let path = url;
    const descString = '/fontdescription';
    const atlasString = '/distancefield';
    if ( url.endsWith( descString ) || url.endsWith( atlasString ) ) {
      const lastIndex = url.lastIndexOf( '/' );
      path = url.substring( 0, lastIndex );
    }
    return this.loadFromUrls( path + descString, path + atlasString );
  }

  protected processDescription( data: string | ArrayBuffer, fontFace: FontFace ): boolean {
    let text = '';
    text = data.toString();

    const lines = text.split( '\n' );
    let status = true;

    for ( const line of lines ) {
      let attributes = line.split( ' ' );
      const identifier = attributes[ 0 ];
      attributes = attributes.slice( 1 );

      switch ( identifier ) {
        case 'info':
          status = this.processInfo( attributes, fontFace );
          break;

        case 'common':
          status = this.processCommon( attributes, fontFace );
          break;

        case 'char':
          status = this.processChar( attributes, fontFace );
          break;

        case 'kerning':
          this.processKerning( attributes, fontFace );
          break;

        default:
          break;
      }

      if ( status === false ) {
        break;
      }
    }
    /*
    this.findAscentAndDescentIfNoneProvided( fontFace, fontFace.size );
    if ( fontFace.size <= 0.0 ) {
      console.warn( `Expected fontFace.size to be greater than 0, given ${ fontFace.size }` );
    }
    */
    return status;
  }

  /**
       * Parses the info fields for padding values and stores them in the font face
       * @param stream - The stream of the 'info' identifier.
       * @param fontFace - The font face in which the padding is stored.
       */
  processInfo( stream: Array<string>, fontFace: FontFace ): boolean {
    const pairs: StringPairs = new Map<string, string>();
    const success = this.readKeyValuePairs( stream,
      [ 'size', 'padding' ], pairs );
    if ( !success ) {
      return false;
    }

    fontFace.size = parseFloat( pairs.get( 'size' )! );

    const values = pairs.get( 'padding' )!.split( ',' );
    if ( values.length !== 4 ) {
      console.warn( `Expected 4 values for padding, given ${ values } (${ values.length })` );
      return false;
    }

    const padding = {
      top: parseFloat( values[ 0 ] ),
      right: parseFloat( values[ 1 ] ),
      bottom: parseFloat( values[ 2 ] ),
      left: parseFloat( values[ 3 ] )
    };

    fontFace.glyphTexturePadding = padding;

    return true;
  }

  /**
     * Parses the common fields for lineHeight, base, ascent, descent, scaleW and scaleH to store them
     * in the font face. If ascent and/or descent are not available, they can be computed using the largest y-offset
     * (ascent = baseline - max_yoffset) and descent can be derived as well (descent = - fontsize + ascent).
     * @param stream - The stream of the 'common' identifier.
     * @param fontFace - The font face in which the parsed values are stored.
     */
  protected processCommon( stream: Array<string>, fontFace: FontFace ): boolean {
    const pairs: StringPairs = new Map<string, string>();
    const success = this.readKeyValuePairs( stream,
      [ 'lineHeight', 'base', 'scaleW', 'scaleH' ], pairs );
    if ( !success ) {
      return false;
    }

    fontFace.base = parseFloat( pairs.get( 'base' )! );
    if ( pairs.has( 'ascent' ) ) {
      fontFace.ascent = parseFloat( pairs.get( 'ascent' )! );
    }
    if ( pairs.has( 'descent' ) ) {
      fontFace.descent = parseFloat( pairs.get( 'descent' )! );
    }

    fontFace.lineHeight = parseFloat( pairs.get( 'lineHeight' )! );

    fontFace.glyphTextureExtent = new Vector2(
      parseFloat( pairs.get( 'scaleW' )! ),
      parseFloat( pairs.get( 'scaleH' )! )
    );

    return true;
  }

  /**
     * Parses the char fields for character id (code point), x, y, width, height, xoffset, yoffset, xadvance to
     * store them in the font face as instances of Glyph.
     * This relies on fontFace.base and fontFace.glyphTextureExtent, so execute processCommon() first.
     * @param stream - The stream of the 'char' identifier.
     * @param fontFace - The font face in which the loaded glyph texture is stored.
     */


  protected processChar( stream: Array<string>, fontFace: FontFace ): boolean {
    const pairs: StringPairs = new Map<string, string>();
    const success = this.readKeyValuePairs( stream,
      [ 'id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance' ], pairs );
    if ( !success ) {
      return false;
    }

    const codepoint: number = parseInt( pairs.get( 'id' )!, 10 );
    if ( codepoint <= 0.0 ) {
      console.warn( `Expected glyph index to be greater than 0, given ${ codepoint }` );
      return false;
    }

    const glyph = new Glyph();
    glyph.codepoint = codepoint;

    const extentScale: Vector2 = new Vector2(
      1.0 / fontFace.glyphTextureExtent.x,
      1.0 / fontFace.glyphTextureExtent.y,
    );
    const extent: Vector2 = new Vector2(
      parseFloat( pairs.get( 'width' )! ),
      parseFloat( pairs.get( 'height' )! ),
    );

    glyph.subTextureOrigin = new Vector2(
      parseFloat( pairs.get( 'x' )! ) * extentScale.x,
      1.0 - ( parseFloat( pairs.get( 'y' )! ) + extent.y ) * extentScale.y,
    );

    glyph.extent = extent;

    glyph.subTextureExtent.x = extent.x * extentScale.x;
    glyph.subTextureExtent.y = extent.y * extentScale.y;

    glyph.bearingFromFontBaseAndOffset( fontFace.base,
      parseFloat( pairs.get( 'xoffset' )! ),
      parseFloat( pairs.get( 'yoffset' )! ),
    );

    glyph.advance = parseFloat( pairs.get( 'xadvance' )! );

    fontFace.addGlyph( glyph );
    return true;
  }

  /**
     * Parses the kerning fields for first and second character and the amount, to store them in the font face.
     * @param stream The stream of the 'kerning' identifier.
     * @param fontFace The font face in which the kerning tuples are stored.
     */
  protected processKerning( stream: Array<string>, fontFace: FontFace ): boolean {
    const pairs: StringPairs = new Map<string, string>();
    const success = this.readKeyValuePairs( stream, [ 'first', 'second', 'amount' ], pairs );
    if ( !success ) {
      return false;
    }

    const first: number = parseInt( pairs.get( 'first' )!, 10 );
    if ( first <= 0.0 ) {
      console.warn( `Expected kerning's first to be greater than 0, given ${ first }` );
      return false;
    }

    const second: number = parseInt( pairs.get( 'second' )!, 10 );
    if ( second <= 0.0 ) {
      console.warn( `Expected kerning's second to be greater than 0, given ${ second }` );
      return false;
    }

    const kerning: number = parseFloat( pairs.get( 'amount' )! );
    fontFace.setKerning( first, second, kerning );

    return true;
  }

  protected readKeyValuePairs( stream: Array<string>, mandatoryKeys: Array<string>,
    resultPairs: StringPairs ): boolean {

    let key: string;
    let value: string;

    for ( const s of stream ) {
      const pair = s.split( '=' );
      key = pair[ 0 ];
      value = pair[ 1 ];
      resultPairs.set( key, value );
    }

    /* check if all required keys are provided */
    let valid = true;
    mandatoryKeys.forEach( ( key ) => valid = valid && resultPairs.has( key ) );
    if ( !valid ) {
      console.warn( `Not all required keys are provided! Mandatory keys: ${ mandatoryKeys }` );
    }
    return valid;
  }
}


export { FontFaceLoader };