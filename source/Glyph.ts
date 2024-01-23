import { Vector2 } from "three";

/**
 * Glyph related data for glyph based text rendering. Most of the glyph data (except the advance) refers to the font
 * face's glyph-texture. This class does not provide dpi awareness. This has to be handled outside of this class, e.g.,
 * during layouting and rendering.
 * The following definitions are applied: http://chanae.walon.org/pub/ttf/ttf_glyphs.htm
 */
export class Glyph {

  protected _index: number;
  protected _advance: number;
  protected _bearing: Vector2 = new Vector2( 0, 0 );
  protected _extent: Vector2 = new Vector2( 0, 0 );
  protected _kernings = new Map<number, number>();
  protected _subTextureOrigin: Vector2 = new Vector2( 0.0, 0.0 );
  protected _subTextureExtent: Vector2 = new Vector2( 0.0, 0.0 );

  constructor( index: number = 0, advance: number = 0 ) {
    this._index = index;
    this._advance = advance;
  }

  /**
   * Check if a glyph is depictable/renderable. If the glyph's sub texture vertical or horizontal extent is zero the
   * glyph does not need to be depicted/rendered. E.g., spaces, line feeds, other control sequences as well as
   * unknown glyphs do not need to be processed for rendering.
   * @returns - True if the glyph needs to be depicted/rendered.
   */
  depictable(): boolean {
    return this._subTextureExtent.x > 0 && this._subTextureExtent.y > 0;
  }

  /**
   * The glyph's kernel w.r.t. a subsequent glyph in pt. The kerning provides a(usually negative) offset along the
   * baseline that can be used to move the pen-position respectively, i.e., the subsequent pen-position is computed
   * as follows: pen-position + advance + kerning
   * @param subsequentIndex - The subsequent glyph's index.
   * @returns - The kerning w.r.t. to the subsequent glyph in pt. If no kerning data is available for the subsequent
   * glyph, the return value is zero indicating no kerning.
   */
  kerning( subsequentIndex: number ): number {
    const kerning = this._kernings.get( subsequentIndex );
    if ( kerning !== undefined ) {
      return kerning;
    }
    return 0.0;
  }

  /**
   * Set the glyph's kernel w.r.t. a subsequent glyph in pt. @see {@link kerning}
   * @param subsequentIndex - The subsequent glyph's index.
   * @param kerning - The kerning value w.r.t. to the subsequent glyph in pt. Note that the kerning should be a
   * negative value but is not enforced to be in terms of assertion or clamping. If kerning data for the subsequent
   * glyph is already available it will be updated to the provided value.
   */
  setKerning( subsequentIndex: number, kerning: number ): void {
    this._kernings.set( subsequentIndex, kerning );
  }


  /**
   * Set the index of one single distinguishable character.
   */
  set index( index: number ) {
    this._index = index;
  }
  get index(): number {
    return this._index;
  }

  /**
   * Upper left position of the glyph's sub-texture. The upper left position refers to the glyph-texture that is
   * specified by a font face (@see {@link FontFace}). It is the u and v coordinates pointing to the glyphs
   * sub-texture within the texture atlas. The coordinates are normalized in [0;1].
   * @param origin - Normalized coordinates pointing to the upper left texel of the glyph's sub-texture.
   */
  set subTextureOrigin( origin: Vector2 ) {
    const clamped = origin.clamp( new Vector2( 0, 0 ), new Vector2( 1, 1 ) );
    if ( !origin.equals( clamped ) ) {
      console.warn( `Glyph texture origin clamped to [${ clamped }], given [${ origin }]` );
    }
    this._subTextureOrigin = clamped;
  }
  get subTextureOrigin(): Vector2 {
    return this._subTextureOrigin;
  }

  /**
   * Width and height of the glyph's sub-texture. In combination with the sub-texture offset (subTextureOffset) the
   * sub-texture rectangle is implicitly fully specified in normalized texture coordinates. Note: the extent
   * comprises the font face's padding.
   * @param extent - Normalized width and height of the glyph's sub-texture.
   */
  set subTextureExtent( extent: Vector2 ) {
    const clamped = extent.clamp( new Vector2( 0, 0 ), new Vector2( 1, 1 ) );
    if ( !extent.equals( clamped ) ) {
      console.warn( `Glyph texture extent clamped to [${ clamped }], given [${ origin }]` );
    }
    this._subTextureExtent = clamped;
  }
  get subTextureExtent(): Vector2 {
    return this._subTextureExtent;
  }

  /**
   * The x and y offsets w.r.t. to the pen-position on the baseline. The horizontal bearing does not comprise the
   * glyph-texture's padding provided by the owning font face (@see {@link FontFace}). The vertical bearing also does
   * not comprises the glyph texture's padding and is the measured w.r.t. baseline.
   * @param bearing - Horizontal and vertical bearing based on the glyph's origin/pen-position placed on the
   * baseline in pt.
   */
  set bearing( bearing: Vector2 ) {
    this._bearing = bearing;
  }
  get bearing(): Vector2 {
    return this._bearing;
  }

  /**
   * Convenience setter for the x and y bearings. The horizontal bearing does not comprise the glyph-texture's
   * padding provided by the owning font face (see FontFace). The vertical bearing also does not comprise the glyph-
   * texture's padding and is the measured w.r.t. baseline. Padding is expected to be handled by the typesetter.
   * The vertical bearing is computed as follows: bearingY = fontBase - yOffset
   * The horizontal bearing equals the xOffset: bearingX = xOffset:
   * @param fontBase - The font face's (FontFace) base-to-top distance in pt.
   * @param xOffset - The glyphs horizontal offset without left padding.
   * @param yOffset - The glyphs vertical offset w.r.t. the font's topmost ascenders, without the font's top
   * padding in pt.
   */
  bearingFromFontBaseAndOffset( fontBase: number, xOffset: number, yOffset: number ): void {
    this._bearing.x = xOffset;
    this._bearing.y = fontBase - yOffset;
  }

  /**
   * Width and height of the glyph in pt.
   * @param extent - The glyph's extent by means of width and height in pt.
   */
  set extent( extent: Vector2 ) {
    this._extent = extent;
  }
  get extent(): Vector2 {
    return this._extent;
  }

  /**
   * Set the glyph's horizontal overall advance in pt. The horizontal advance comprises the font face's left and
   * right padding, the glyphs (inner) width as well as the horizontal bearing (and often a glyph specific gap).
   * E.g., advance = subTextureExtent_width + xOffset (+ gap), or alternatively:
   * advance = xOffset + padding_left + glyph_width + padding_right (+ gap)
   * @param advance - The glyphs horizontal advance (along the baseline) in pt.
   */
  set advance( advance: number ) {
    this._advance = advance;
  }
  get advance(): number {
    return this._advance;
  }

}