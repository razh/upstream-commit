import THREE from 'three';
import SimplexNoise from 'simplex-noise';

import ao from './../texture/ao';
import displacement from './../texture/displacement';
import grayscale from './../texture/grayscale';
import fbm from './../texture/fbm';
import normal from './../texture/normal';
import sobel from './../texture/sobel';
import specular from './../texture/specular';

const WIDTH  = 256;
const HEIGHT = 256;

function createCanvas( width, height ) {
  const canvas = document.createElement( 'canvas' );
  const ctx    = canvas.getContext( '2d' );
  document.body.appendChild( canvas );

  canvas.width  = width;
  canvas.height = height;

  return { canvas, ctx };
}

function noiseTest() {
  const { canvas, ctx } = createCanvas( WIDTH, HEIGHT );

  const simplex = new SimplexNoise();
  const noise2D = simplex.noise2D.bind( simplex );

  console.time( 'noise' );
  const imageData = fbm( canvas.width, canvas.height, noise2D, {
    octaves: Math.ceil( Math.log2( canvas.width ) ),
    period:  canvas.width / 2
  });
  console.timeEnd( 'noise' );

  ctx.putImageData( imageData, 0, 0 );

  return ctx;
}

function aoTest( ctx ) {
  const { canvas } = ctx;
  const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );

  console.time( 'ao' );
  const aoImageData = ao( imageData, {
    strength: 2.5
  });
  console.timeEnd( 'ao' );

  const { ctx: aoCtx } = createCanvas( canvas.width, canvas.height );
  aoCtx.putImageData( aoImageData, 0, 0 );
}

function specularTest( ctx ) {
  const { canvas } = ctx;
  const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );

  console.time( 'specular' );
  const specularImageData = specular( imageData );
  console.timeEnd( 'specular' );

  const { ctx: specularCtx } = createCanvas( canvas.width, canvas.height );
  specularCtx.putImageData( specularImageData, 0, 0 );
}

function displacementTest( ctx ) {
  const { canvas } = ctx;
  const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );

  console.time( 'displacement' );
  const {
    imageData: displacementImageData,
    bias
  } = displacement( imageData );
  console.timeEnd( 'displacement' );

  const { ctx: displacementCtx } = createCanvas( canvas.width, canvas.height );
  displacementCtx.putImageData( displacementImageData, 0, 0 );
  console.log( 'displacement bias:', bias );
}

function normalTest( ctx ) {
  const { canvas } = ctx;
  const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );

  console.time( 'normal' );
  const normalImageData = normal( imageData );
  console.timeEnd( 'normal' );

  const { ctx: normalCtx } = createCanvas( canvas.width, canvas.height );
  normalCtx.putImageData( normalImageData, 0, 0 );
}

export default function() {
  const noiseCtx = noiseTest();
  aoTest( noiseCtx );
  specularTest( noiseCtx );
  displacementTest( noiseCtx );
  normalTest( noiseCtx );
}
