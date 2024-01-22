import { Texture, Vector2, Vector4 } from "three";

export class FontFace {

  protected _size: number;
  protected _base: number;
  protected _ascent = 0.0;
  protected _descent = 0.0;
  protected _lineGap = 0.0;
  protected _glyphTextureExtent: Vector2 = new Vector2( 0.0, 0.0 );
  protected _glyphTexturePadding: Vector4 = new Vector4( 0.0, 0.0, 0.0, 0.0 );
  protected _glyphTexture: Texture;

  private _ready = false;


  constructor() {
  };

  /**
     * The size of the font in texture space (px).
     * @returns - The font size in texture space (px).
     */
  set size( size: number ) {
    if ( size <= 0 ) {
      console.warn( `Expected size to be greater than 0.0, given ${ size }` );
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
      console.warn( `Expected base to be greater than 0.0, given ${ base }` );
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
      console.warn( `Expected ascent to be greater than 0.0, given ${ ascent }` );
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
      console.warn( 'Expected size to be greater than zero to derive line gap from line height' );
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
      console.warn( `Expected extent.x to be greater than 0.0, given ${ extent.x }` );
      return;
    }
    if ( extent.y <= 0 ) {
      console.warn( `Expected extent.y to be greater than 0.0, given ${ extent.y }` );
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
  set glyphTexturePadding( padding: Vector4 ) {
    if ( padding.x < 0 ) {
      console.warn( `expected padding.x to be greater than 0.0, given ${ padding.x }` );
      return;
    }
    if ( padding.y < 0 ) {
      console.warn( `Expected padding.y to be greater than 0.0, given ${ padding.y }` );
      return;
    }
    if ( padding.z < 0 ) {
      console.warn( `expected padding.z to be greater than 0.0, given ${ padding.z }` );
      return;
    }
    if ( padding.w < 0 ) {
      console.warn( `Expected padding.w to be greater than 0.0, given ${ padding.w }` );
      return;
    }
    this._glyphTexturePadding = padding;
  }
  get glyphTexturePadding(): Vector4 {
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