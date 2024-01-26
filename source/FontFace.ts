import { Texture, Vector2 } from "three";
import { Glyph } from "./Glyph";

type Padding = { top: number, right: number, bottom: number, left: number; };

class FontFace {

  protected _size: number;
  protected _base: number;
  protected _ascent = 0.0;
  protected _descent = 0.0;
  protected _lineGap = 0.0;
  protected _glyphTextureExtent: Vector2 = new Vector2( 0.0, 0.0 );
  protected _glyphTexturePadding: Padding = { top: 0, right: 0, bottom: 0, left: 0 };
  protected _glyphTexture: Texture;

  private _ready = false;

  protected _glyphs = new Map<number, Glyph>;


  constructor() {
  };

  /**
     * Check if a glyph of a specific index is available.
     * @param index - Index of the glyph to access.
     * @returns - True if a glyph for the provided index was added.
     */
  hasGlyph( index: number ): boolean {
    return !!this._glyphs.get( index );
  }

  /**
   * Direct access to an indexed glyph. If the glyph does not exist, an empty glyph is returned without adding it
   * to glyphs. The glyph atlas might be loaded asynchronously, thus, new glyphs are expected to be added via
   * addGlyph.
   * @param index - Index of the glyph to access.
   * @returns - Glyph with the matching index or an empty glyph, if index has not match
   */
  glyph( index: number ): Glyph {
    const existingGlyph = this._glyphs.get( index );
    if ( existingGlyph ) {
      return existingGlyph;
    }
    const glyph = new Glyph();
    glyph.index = index;
    return glyph;
  }

  /**
   * Add a glyph to the font face's set of glyphs. If the glyph already exists, the existing glyph remains.
   * @param glyph - The glyph to add to the set of glyphs.
   */
  addGlyph( glyph: Glyph ): void {
    if ( this.hasGlyph( glyph.index ) ) {
      console.error( 'Expected glyph to not already exist' );
      return;
    }
    this._glyphs.set( glyph.index, glyph );
  }

  /**
     * Set the kerning for a glyph w.r.t. to a subsequent glyph in texture space (px). If the glyph is known to this
     * font face, the values are forwarded to the glyphs kerning setter (see Glyph for more information).
     * @param index - The target glyph index.
     * @param subsequentIndex - The glyph index of the respective subsequent/next glyph.
     * @param kerning - Kerning of the two glyphs in pixel.
     */
  setKerning( index: GLsizei, subsequentIndex: GLsizei, kerning: number ): void {
    const glyph = this._glyphs.get( index );
    if ( !glyph || !this.hasGlyph( subsequentIndex ) ) {
      console.error( `Expected glyph or glyph of subsequent index to exist, \
                given ${ index } and ${ subsequentIndex } respectively` );
      return;
    }
    glyph.setKerning( subsequentIndex, kerning );
  }

  /**
     * The size of the font in texture space (px).
     * @returns - The font size in texture space (px).
     */
  set size( size: number ) {
    if ( size <= 0 ) {
      console.error( `Expected size to be greater than 0.0, given ${ size }` );
      return;
    }
    this._size = size;
  }
  get size(): number {
    return this._size;
  }

  /**
   * Set the font's base in texture space (px). The base is the distance from the baseline to the top in pixel.
   * @param base - The distance from the baseline to the top of the line in pixel.
   */
  set base( base: number ) {
    if ( base <= 0 ) {
      console.error( `Expected base to be greater than 0.0, given ${ base }` );
      return;
    }
    this._base = base;
  }
  get base(): number {
    return this._base;
  }

  /**
   * Set the font's ascent in texture space (px). The ascent is the distance from the baseline to the tops of the
   * tallest glyphs (ascender) in pixel.
   * @param ascent - The distance from the baseline to the topmost ascender in pixel.
   */
  set ascent( ascent: number ) {
    if ( ascent <= 0 ) {
      console.error( `Expected ascent to be greater than 0.0, given ${ ascent }` );
      return;
    }
    this._ascent = ascent;
  }
  get ascent(): number {
    return this._ascent;
  }

  /**
   * Set the font's descent in texture space (px). The descent is the distance from the baseline to the lowest
   * descender in pixel. Please note that this value is usually negative (if the fonts lowest descender is below
   * the baseline).
   * @param descent - The distance from the baseline to the lowest descender in pixel.
   */
  set descent( descent: number ) {
    /* No assert here: there might be fonts with their lowest descender above baseline. */
    // assert(descent < 0.f, ...);
    this._descent = descent;
  }
  get descent(): number {
    return this._descent;
  }

  /**
   * Set the font's leading/linegap in texture space (px). The leading is the distance from the lowest descender to
   * the topmost ascender of a subsequent text line in pixel.
   * @param lineGap - The gap between two subsequent lines of text in pixel.
   */
  set lineGap( lineGap: number ) {
    this._lineGap = lineGap;
  }
  get lineGap(): number {
    return this._lineGap;
  }

  /**
     * Set the baseline-to-baseline distance in texture space (px). Negative values will result in negative linegap.
     * The line height is derived as follows: line_height = size + line_gap, or alternatively:
     * line_height = size * line_space
     * @param lineHeight - The line height (baseline-to-baseline distance) in pixel.
     */
  set lineHeight( lineHeight: number ) {
    if ( this.size <= 0 ) {
      console.error( 'Expected size to be greater than zero to derive line gap from line height' );
      return;
    }
    this.lineGap = lineHeight - this.size;
  }
  get lineHeight(): number {
    return this.size + this.lineGap;
  }

  /**
     * Set the relative baseline-to-baseline distance w.r.t. the font's size. The line space is mapped to line gap
     * as follows: line_gap = size * (line_space - 1). A space < 1.0 will result in a negative line gap.
     * @param lineSpace - The relative baseline-to-baseline distance w.r.t. the font's size.
     */
  set lineSpace( lineSpace: number ) {
    this._lineGap = this.size * ( lineSpace - 1 );
  }
  /**
   * The relative baseline-to-baseline distance w.r.t. the font's size. The relative line space is derived as
   * follows: line_space = size / line_height; Note that the descent is usually a negative value.
   * @returns - The relative baseline-to-baseline distance w.r.t. the font's size.
   */
  get lineSpace(): number {
    if ( this.lineHeight === 0.0 ) {
      return this.lineHeight;
    }
    return this.size / this.lineHeight;
  }

  /**
   * Sets the glyph texture atlas extent.
   * @param extent - The texture extent in px
   */
  set glyphTextureExtent( extent: Vector2 ) {
    if ( extent.x <= 0 ) {
      console.error( `Expected extent.x to be greater than 0.0, given ${ extent.x }` );
      return;
    }
    if ( extent.y <= 0 ) {
      console.error( `Expected extent.y to be greater than 0.0, given ${ extent.y }` );
      return;
    }
    this._glyphTextureExtent = extent;
  }
  /**
   * The size/extent of the glyph texture in px.
   * @returns - The size/extent of the glyph texture in px.
   */
  get glyphTextureExtent(): Vector2 {
    return this._glyphTextureExtent;
  }

  /**
   * The padding applied to every glyph in px. This can only be set via setGlyphTexture.
   * @param padding - CSS style (top, right, bottom, left) padding applied to every glyph within the texture in
   * px.
   */
  set glyphTexturePadding( padding: Padding ) {
    if ( padding.top < 0 ) {
      console.error( `expected padding.top to be greater than 0.0, given ${ padding.top }` );
      return;
    }
    if ( padding.right < 0 ) {
      console.error( `Expected padding.right to be greater than 0.0, given ${ padding.right }` );
      return;
    }
    if ( padding.bottom < 0 ) {
      console.error( `expected padding.bottom to be greater than 0.0, given ${ padding.bottom }` );
      return;
    }
    if ( padding.left < 0 ) {
      console.error( `Expected padding.left to be greater than 0.0, given ${ padding.left }` );
      return;
    }
    this._glyphTexturePadding = padding;
  }
  get glyphTexturePadding(): { top: number, right: number, bottom: number, left: number; } {
    return this._glyphTexturePadding;
  }

  /**
   * The font face's associated glyph atlas. All glyph data is associated to this texture atlas.
   * @param texture - The new texture atlas for all glyphs
   */
  set glyphTexture( texture: Texture ) {
    // disposed previous texture to prevent memory leak
    if ( this._glyphTexture ) {
      this._glyphTexture.dispose();
    }

    this._glyphTexture = texture;
  }
  get glyphTexture(): Texture {
    return this._glyphTexture;
  }

  set ready( ready: boolean ) {
    this._ready = ready;
  }
  get ready(): boolean {
    return this._ready;
  }
}

export { FontFace };