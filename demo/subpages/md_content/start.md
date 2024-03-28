# three-openll-labels

This extension adds 2D Labels to three.js, allowing users to easily create annotations in their 3D scenes with minimal rendering overhead. It was developed as part of a university seminar at Hasso Plattner Institute.

The labelling API is based on [webgl-operate](https://github.com/cginternals/webgl-operate/tree/master/source/text) and [openll-cpp](https://github.com/cginternals/openll-cpp/tree/master) implementations of [OpenLL](https://openll.org/).

## Why do we need it?

Three.js offers [different options to create text](https://threejs.org/docs/#manual/en/introduction/Creating-text) but most are not easy to seamlessly use in a scene. An alternative is using [TextGeometry](https://threejs.org/docs/#examples/en/geometries/TextGeometry), a vertex-based geometry whose complexity rises when trying to have smooth round letters without aliasing effects. Additionally TextGeometry results in 3D text which is unnecessarily distracting when just trying to visualize data.

Since three.js is supposed to facillitate fast prototyping and creating 3D scenes without the need for an extensive background in computer graphics

## What can I do with it?

## How does it work?

## Demo Video
maybe single videos used to highlight specific videos in previous section
![test](../media/screenshot_wip.png)