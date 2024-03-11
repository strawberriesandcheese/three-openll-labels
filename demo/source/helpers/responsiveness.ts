export function resizeRendererToDisplaySize( renderer: THREE.WebGLRenderer ) {
  const canvas = renderer.domElement;
  // on high dpi devices, these are reduced
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  // adjust with pixel ratio
  const widthScaled = Math.floor(width * window.devicePixelRatio);
  const heightScaled = Math.floor(height * window.devicePixelRatio);
  // check against adjsuted size
  const needResize = canvas.width !== widthScaled || canvas.height !== heightScaled;
  if ( needResize ) {
    // rescale with raw size (three seems to adjust this with device pixel ratio)
    renderer.setSize( width, height, false );
  }
  return needResize;
}
