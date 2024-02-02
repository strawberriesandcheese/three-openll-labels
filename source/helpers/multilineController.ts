import { Controller, GUI } from 'lil-gui';

// adapted from https://codepen.io/georgealways/pen/oNPRrGb
class MultilineController extends Controller {
  $textarea: HTMLTextAreaElement;

  constructor( parent: GUI, object: any, property: string, rows: number ) {

    super( parent, object, property, 'multiline-controller' );

    this.$textarea = document.createElement( 'textarea' );
    this.$textarea.setAttribute( 'rows', rows.toString() );
    this.$textarea.setAttribute( 'style',
      `.lil - gui.multiline - controller textarea {
      border: none;
      width: 100 %;
    }`);
    //this.$textarea.setAttribute( 'type', 'text' );
    this.$textarea.setAttribute( 'aria-labelledby', this.$name.id );

    this.$textarea.addEventListener( 'input', () => {
      this.setValue( this.$textarea.value );
    } );

    this.$textarea.addEventListener( 'keydown', e => {
      if ( e.code === 'Enter' ) {
        this.$textarea.blur();
      }
    } );

    this.$textarea.addEventListener( 'blur', () => {
      this._callOnFinishChange();
    } );

    this.$widget.append( this.$textarea );

    //this.$widget;

    this.updateDisplay();

  }

  updateDisplay() {
    this.$textarea.value = this.getValue();
    return this;
  }
}

export { MultilineController };

// usage:
// instead of gui.add( ... )
// new MultilineController( gui, object, 'prop' );

