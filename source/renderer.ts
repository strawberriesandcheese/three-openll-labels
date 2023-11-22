import {
  auxiliaries,
  Camera,
  Context,
  DefaultFramebuffer,
  EventProvider,
  FontFace,
  Invalidate,
  Label,
  LabelRenderPass,
  Navigation,
  Position3DLabel,
  Renderer,
  Text,
  vec3,
  vec4,
} from 'webgl-operate';

export class Label3DRenderer extends Renderer {

  protected _extensions = false;

  protected _labelPass: LabelRenderPass;

  protected _labelWrap: Position3DLabel;
  protected _labelCentered: Position3DLabel;

  protected _camera: Camera;
  protected _navigation: Navigation;

  protected _defaultFBO: DefaultFramebuffer;

  protected _fontFace: FontFace | undefined;

  /**
   * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
   * @param context - valid context to create the object for.
   * @param identifier - meaningful name for identification of this instance.
   * @param eventProvider - required for mouse interaction
   * @returns - whether initialization was successful
   */
  protected onInitialize( context: Context, callback: Invalidate,
    eventProvider: EventProvider ): boolean {

    /* Create framebuffers, textures, and render buffers. */

    this._defaultFBO = new DefaultFramebuffer( this._context, 'DefaultFBO' );
    this._defaultFBO.initialize();

    /* Create and configure test navigation. */

    this._camera = new Camera();
    this._camera.eye = vec3.fromValues( 0.0, 0.0, 1.0 );
    this._camera.center = vec3.fromValues( 0.0, 0.0, 0.0 );
    this._camera.up = vec3.fromValues( 0.0, 1.0, 0.0 );
    this._camera.near = 0.1;
    this._camera.far = 4.0;

    this._navigation = new Navigation( callback, eventProvider );
    this._navigation.camera = this._camera;

    /* Create and configure label pass. */

    this._labelPass = new LabelRenderPass( context );
    this._labelPass.initialize();
    this._labelPass.camera = this._camera;
    this._labelPass.target = this._defaultFBO;
    this._labelPass.depthMask = false;

    FontFace.fromFiles(
      'https://fonts.varg.dev/api/fonts/opensans.ttf/fed681234eacf72d388020bf84d3b54d/fontdescription',
      new Map<number, string>( [ [ 0, 'https://fonts.varg.dev/api/fonts/opensans.ttf/fed681234eacf72d388020bf84d3b54d/distancefield' ] ] ),
      context
    )
      .then( ( fontFace ) => {
        for ( const label of this._labelPass.labels ) {
          label.fontFace = fontFace;
        }
        this._fontFace = fontFace;
        this.updateLabels();

        this.finishLoading();
        this.invalidate( true );
      } )
      .catch( ( reason ) => auxiliaries.log( auxiliaries.LogLevel.Error, reason ) );

    this.setupScene();

    return true;
  }

  /**
   * Uninitializes Buffers, Textures, and Program.
   */
  protected onUninitialize(): void {
    super.uninitialize();

    this._defaultFBO.uninitialize();
    this._labelPass.uninitialize();
  }

  protected onDiscarded(): void {
    this._altered.alter( 'canvasSize' );
    this._altered.alter( 'clearColor' );
    this._altered.alter( 'frameSize' );
    this._altered.alter( 'multiFrameNumber' );
  }

  /**
   * This is invoked in order to check if rendering of a frame is required by means of implementation specific
   * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
   * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
   * changed or the renderer was invalidated @see{@link invalidate}.
   * @returns whether to redraw
   */
  protected onUpdate(): boolean {
    this._navigation.update();

    for ( const label of this._labelPass.labels ) {
      if ( label.altered || label.color.altered ) {
        return true;
      }
    }
    return this._altered.any || this._camera.altered;
  }

  /**
   * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
   * camera-updates.
   */
  protected onPrepare(): void {

    if ( this._altered.canvasSize ) {
      this._camera.aspect = this._canvasSize[ 0 ] / this._canvasSize[ 1 ];
      this._camera.viewport = this._canvasSize;

      this.updateLabels();
    }

    if ( this._altered.clearColor ) {
      this._defaultFBO.clearColor( this._clearColor );
    }

    this._labelPass.update();

    this._altered.reset();
    this._camera.altered = false;
  }

  /**
   * After (1) update and (2) preparation are invoked, a frame is invoked. Renders both 2D and 3D labels.
   * @param frameNumber - for intermediate frames in accumulation rendering
   */
  protected onFrame( frameNumber: number ): void {
    const gl = this._context.gl;

    gl.viewport( 0, 0, this._camera.viewport[ 0 ], this._camera.viewport[ 1 ] );

    this._defaultFBO.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false );
    this._labelPass.frame();
  }

  /**
   * Sets up an example scene with 2D and 3D labels and sets the corresponding data on LabelGeometries. The
   * FontFace is set on each label by the LabelRenderPass.
   */
  protected setupScene(): void {

    /** Wrapped labels, showcasing Ellipsis and NewLine */

    const kafka = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in \
his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his \
brown belly, slightly domed and divided by arches into stiff sections.';

    this._labelWrap = new Position3DLabel( new Text( `Wrap: ${ kafka }` ), Label.Type.Dynamic );
    this._labelWrap.wrap = true;
    this._labelWrap.lineWidth = 0.8;

    this._labelCentered = new Position3DLabel( new Text( `Label.LineAnchor\n+\nLabel.Alignment.Center` ),
      Label.Type.Dynamic );
    this._labelCentered.lineAnchor = Label.LineAnchor.Center;
    this._labelCentered.alignment = Label.Alignment.Center;

    this._labelPass.labels = [ this._labelWrap, this._labelCentered ];

    for ( const label of this._labelPass.labels ) {
      label.fontSize = 0.05;
      label.color.fromHex( '#fff' );
      label.fontSizeUnit = Label.Unit.World;
    }
  }

  protected updateLabels(): void {
    if ( !this._labelWrap.valid ) {
      return;
    }

    this._labelWrap.position = [ -0.3, 0.0, 0.0 ];
    this._labelWrap.up = [ 0.0, 0.0, -1.0 ];

    this._labelCentered.position = [ 0.0, 0.0, 0.0 ];
  }

}