# three-openll-labels

Adds labelling capabilities using signed distance field rendering of fonts to three.js

Based on [webgl-operate]() and [openll-cpp]() implementations of labelling.
  
- [Demo](https://strawberriesandcheese.github.io/three-openll-labels/)
- [Jump to Usage](#usage)

## Usage

### 0. Acquire font resource files
1. Host file yourself (recommended)
	- We need both a texture atlas and a font description to correctly render the glyphs of an arbitrary font.
	- Download them [here](https://fonts.varg.dev/), you only need a font file. Be mindful that this service hosts all fonts that it converted.
	- Place the two files ```font-name.png``` and ```font-name.fnt``` you downloaded in your project's asset/public directory.
2. Dynamically embedd files from API
	- You can also use the API [this](https://fonts.varg.dev/) font service offers. Just copy either the font description or the glyph atlas url found at the bottom of the page for the font you want.
	- Unfortunately we cannot guarantee the availability of the service, therefore generating your own files with it and serving them with your server is recommended.
### 1. Load a font 
1.  Host file yourself (recommended)
	- We use a FontFaceLoader to load the font face into the project. This loader can be used like any other ```THREE.Loader```.
	- **Heads up:** the texture atlas and font face description **must** have the same name and be in the same directory. The loader only gets one path for both (without file endings!)
	```ts
	import { FontFaceLoader } from three-openll-labels;
	
	const fontFace = fontFaceLoader(loadingManager).load('path/to/your/font-name');
	```
2. Dynamically embedd files from API
	```ts
	import { FontFaceLoader } from three-openll-labels;
	
	// you can use either of the links the API supplies directly or you can point to their parent directory
	const fontFace = fontFaceLoader(loadingManager).loadFromAPI('https://fonts.varg.dev/api/fonts/[font name]/[hash]/distancefield');
	const fontFace = fontFaceLoader(loadingManager).loadFromAPI('https://fonts.varg.dev/api/fonts/[font name]/[hash]/fontdescription');
	// if you point to the parent directory forgo the ending slash
	const fontFace = fontFaceLoader(loadingManager).loadFromAPI('https://fonts.varg.dev/api/fonts[font name]/[hash]');

	// example working link
	const fontFace = fontFaceLoader(loadingManager).loadFromAPI('https://fonts.varg.dev/api/fonts/roboto-regular.ttf/5b932794dbdddf34e80eca00ba9a0b93/distancefield');
	```
### 2. Create a label
- At creation a Label gets the text it displays, the font face which is used and its text color. By default the color is black.
```ts
import { FontFaceLoader, Label } from three-openll-labels;

const fontFace = fontFaceLoader(loadingManager).load('path/to/your/font-name');
const color = new THREE.Color('red');

const redLabel = new Label('I am a label', fontFace, color);
const blackLabel = new Label('I am also a label', fontFace);
```
### 3. (optional) Attach label to other objects in scene
- You can add Labels to other ```THREE.Object3D``` in the scene. It is recommended to use the Labels ```label.addTo(object)``` method because it preserves the previous rotation and transfers the previous world position to the local position.
```ts
import { FontFaceLoader, Label } from three-openll-labels;

const cube = new THREE.Mesh(new THREE.BoxGeometry);
const fontFace = fontFaceLoader(loadingManager).load('path/to/your/font-name');
const label = new Label('I am also a label', fontFace);
label.position.set(1, 0, 0);
label.rotateX( -Math.PI / 2 );

label.addTo(cube); //-> label will be offset (1, 0, 0) from cube position and still rotated

cube.add(label); //-> previous position and rotation will be reset
```
### 4. (optional) Adjust position and rotation of label in scene
1. Label is unattached in scene
	- You can use the same methods you usually do when handling objects in your scene.
2. Label is attached to different object in scene
	- If you want to move/rotate the Label independent to its parent object but still want to keep its animation attached (e.g. when annotation animation bones) you can use the methods ```label.setGlobalRotation(THREE.Quaternion)``` and ```label.translateGlobal(THREE.Vector3)```.
### 5. Add label to scene
- Depending on whether you attached your label to a parent object or kept it by itself you have to add it to your scene just like any other ```THREE.Object3D```.
```ts
import { FontFaceLoader, Label } from three-openll-labels;

const cube = new THREE.Mesh(new THREE.BoxGeometry);
const fontFace = fontFaceLoader(loadingManager).load('path/to/your/font-name');
const attachedlabel = new Label("I'm attached to the cube", fontFace);
attachedlabel.addTo(cube); 
const lonelyLabel = new Label("I'm all alone", fontFace);

scene.add(lonelyLabel);
scene.add(cube); //attached label is automatically also added to scene
```
### 6. Settings
- ```aa```: anti-aliasing on when true
- ```alignment```: set text alignment to left, center or right
- ```color```: change text color
- ```debugMode```: draws green borders around all glyphs
- ```fontface```: change font
- ```fontsize```: change font size (can be used as an alternativ to scaling)
- ```lineAnchor```: set line anchor to baseline, descendant, ascendant and others
- ```lineFeed```: set line feed character (default is normal new line)
- ```wrap```: set label to wrap mode in which line breaks are inserted if the lineWidth is exceeded
- ```lineWidth```: set line width after which there is an automatic line feed
- ```projected```: labels automatically turn to camera viewport when true
- ```text```: change text content

## Tech Stack

- Three.js
- TypeScript
- GLSL
- Vite
- OpenLL

## CLI Commands

Library Installation

```bash
npm i
```

Run dev mode

```bash
npm run dev
```

Build

```bash
npm run build
```

Build library only

```bash
npm run build -w lib
```

Build demo only

```bash
npm run build -w demo
```

Run demo build

```bash
npm run preview
```
