# three-openll-labels

This extension adds 2D labels to three.js, allowing users to easily create annotations in their 3D scenes with minimal rendering overhead. It was developed as part of a university seminar at Hasso Plattner Institute.

The labelling API is based on [webgl-operate](https://github.com/cginternals/webgl-operate/tree/master/source/text) and [openll-cpp](https://github.com/cginternals/openll-cpp/tree/master) implementations of [OpenLL](https://openll.org/).

## Why do I need it?

Three.js offers [different options to create text](https://threejs.org/docs/#manual/en/introduction/Creating-text), but most are not easy to seamlessly use in a scene. An alternative is using [TextGeometry](https://threejs.org/docs/#examples/en/geometries/TextGeometry), a vertex-based geometry whose complexity rises when trying to have smooth round letters without aliasing effects. Additionally TextGeometry results in 3D text which is unnecessarily distracting when just trying to visualize data.

Since three.js is supposed to facillitate fast prototyping and creating 3D scenes without the need for an extensive background in computer graphics, a straight forward way to label scenes is very important. This extension provides a simple way to add high-quality 2D labels to a three.js scene.

## What can I do with it?

<video src="../media/demo.webm" controls></video>

Please check out the <a href="./documentation.html" target="_self">Docs</a> for information on how to use these feature in your own projects.

## How does it work?

This plugin uses [Signed-Distance-Field](https://en.wikipedia.org/wiki/Signed_distance_function#Applications) based font rendering. Each font needs to be converted into a description file and a texture atlas by the [font service](https://fonts.varg.dev/) beforehand. The description file contains size properties for each glyph (A, b, ?, etc.) which can be used to calculate most of the instance data for the vertex shader. It also contains the position at which the glyph can be found in the texture atlas.
Here you can see an example texture atlas (left) and an example description (right):

<div class="columns">
<img src="../media/roboto-regular-atlas.png">

```elm
info face="Roboto Regular" size=64 bold=0 italic=0 charset="unic" unicode=1 padding=4,4,4,4 spacing=0,0 
common lineHeight=75 base=59.375 ascent=52.875 descent=-15.625 scaleW=512 scaleH=512 pages=1 packed=0
page id=0 file="Unknown.png"
chars count=95
char id=32 x=354 y=348 width=9 height=9 xoffset=0 yoffset=59.375 xadvance=15.8438 page=1 chnl=15
char id=33 x=474 y=242 width=15 height=54 xoffset=5 yoffset=13.875 xadvance=16.4688 page=1 chnl=15
char id=34 x=241 y=348 width=21 height=24 xoffset=4.25 yoffset=11.375 xadvance=20.4688 page=1 chnl=15
[...]
kernings count=578
kerning first=32 second=32 amount=-0.3244
kerning first=33 second=34 amount=-1.43296
kerning first=34 second=32 amount=-1.8736
[...]
```
</div>

Every label consists of a number of glyphs. Glyphs are the individual letters and symbols that make up a font like "a", "B", "?", etc. Since a label can contain a high number of glyphs we want to prevent seperate draw calls by using instancing. Every glyph is rendered by creating a quad based on the same initial vertices, stretching (or compressing) the quad to the individual glyphs extent. These transformations are done in the vertex shader and result in glyph-sized rectangles.

The texture atlas is used in the fragment shader to convert our previous glyph-sized rectangles to actual symbols. We sample the texture using the position supplied in the description file and compare the result to a threshold to decide whether a fragment is inside or outside the glyph. We discard all outside fragments and color only the inside fragments based on the label color.

Each instanced glyph needs to be moved to its position in the text. When a label is created or when its text changes it uses the ```Typesetter``` to calculate these positions. The typesetter iterates over all glyphs in a label, placing characters based on the font information such as advance and kerning. It also implements automatic and manual line wrapping.

Following is a simplified version of the typesetter logic. 
```wren
pen = (x: 0, y: lineAnchor)
for glyph in label
  if newline
    alignPreviousLine()
    pen.x = 0
    pen.y -= lineHeight
  
  origin = pen + glyph.offset
  tangent = glyph.width
  up = glyph.height
  texCoords = glyph.texCoords

  pen.x += glyph.advance - glyph.kerning

alignPreviousLine()
```