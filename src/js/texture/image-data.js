const canvas = document.createElement( 'canvas' );
const ctx    = canvas.getContext( '2d' );

export function createImageData( width, height ) {
  return ctx.createImageData( width, height );
}
