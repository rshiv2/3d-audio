/**
 * @file EE267 Virtual Reality
 * Homework 4
 * Build your HMD, Implement Stereo Rendering and Lens Distortion Correction
 *
 * In our homework, we heavily rely on THREE.js library for rendering.
 * THREE.js is a wonderful library to render a complicated scene without
 * cumbersome raw WebGL/OpenGL programming related to GPU use. Furthermore,
 * it also hides most of the math of computer graphics to allow designers to
 * focus on the scene creation. However, this homework does not use such
 * capabilities. We will compute them manually to understand the mathematics
 * behind the rendering pipeline!
 *
 * Instructor: Gordon Wetzstein <gordon.wetzstein@stanford.edu>
 *
 * The previous C++/OpenGL version was developed by Robert Konrad in 2016, and
 * the JavaScript/WebGL version was developed by Hayato Ikoma in 2017.
 *
 * @copyright The Board of Trustees of the Leland Stanford Junior University
 * @version 2022/05/05
 * This version uses Three.js (r127), stats.js (r17) and jQuery (3.2.1).
 */

// Global variables to control the rendering mode
const STEREO_MODE = 0;
const STEREO_UNWARP_MODE = 1;

var renderingMode = STEREO_UNWARP_MODE;


// Set up display parameters.
// The display parameters are hard-coded in the class since all teams have
// the same HMD.
var dispParams = new DisplayParameters();


// Create an instance for Javascript performance monitor.
// In our class, we would like to visualize the number of frames rendered
// in every second. For this purpose, stats.js is a handy tool to achieve it.
// https://github.com/mrdoob/stats.js/
var stats = new Stats();

// Add a DOM element of the performance monitor to HTML.
$( ".renderCanvas" ).prepend( stats.dom );


// Create a THREE's WebGLRenderer instance.
// Since we are not going to use stencil and depth buffers in this
// homework, those buffers are turned off. These two buffers are commonly
// used for more advanced rendering.
var webglRenderer = new THREE.WebGLRenderer( {
	antialias: false,
	stencil: false,
	depth: true,
} );


// Add a DOM element of the renderer to HTML.
$( ".renderCanvas" ).prepend( webglRenderer.domElement );


// Set the size of the renderer based on the current window size.
webglRenderer.setSize( dispParams.canvasWidth, dispParams.canvasHeight );


// add teapots with different shaders
var teapots = [];

var teapot1 =
	new Teapot( new THREE.Vector3( 1, 1, 1 ),
		$( "#vShaderMultiPhong" ).text(),
		$( "#fShaderMultiPhong" ).text() );

teapots.push( teapot1 );


// Create an instance of our StateCoontroller class.
// By using this class, we store the mouse movement to change the scene to be
// rendered.
var sc = new StateController( dispParams );


// Set the teapots to the renderer
var standardRenderer =
	new StandardRenderer( webglRenderer, teapots, dispParams );

var stereoUnwarpRenderer =
	new StereoUnwarpRenderer( webglRenderer, dispParams );


// Instantiate our MVPmat class
var mat = new MVPmat( dispParams );


// Load the SOFA file.
const SOFA_FILE = "hrtfs/Subject2_HRIRs.sofa";
var handle = null;

const request = new XMLHttpRequest();
request.responseType = "arraybuffer";
request.open("GET", SOFA_FILE);

request.onload = () => {
	// Update the global SOFA file handle.
	handle = sofaLoadFile(request.response);
	console.log("SOFA file loaded and the global file handle is ready to use")
	// Start rendering!
	animate();
}

request.send()

// downsample2
//
// Downsample ArrayBuffer by factor of 2
//
function downsample2(array) {
	const new_array = new Float32Array(array.length / 2);
	for (var i = 0; i < new_array.length; i += 1) {
		new_array[i] = array[2 * i];
	}
	return new_array;
}

// animate
// This function is the main function to render the scene repeatedly.
//
// Note:
// This function uses some global variables.
//
// Advanced note:
// requestAnimationFrame() is a WebAPI which is often used to perform animation.
// Importantly, requestAnimationFrame() is asynchronous, which makes this
// rendering loop not recursive. requestAnimationFrame immediately returns, and
// the following codes are executed continuously. After a certain amount of
// time, which is determined by a refresh rate of a monitor, the passed callback
// function is executed. In addition, when the window is not displayed (i.e.
// another tab of your browser is displayed), requestAnimationFrame
// significantly reduces its refresh rate to save computational resource and
// battery.
//
// If you are interested, please check out the documentation of
// requestAnimationFrame().
// https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame

// Don't change the convolver node buffers on every frame because this causes
// "clicking" audio artifacts. Instead, change the buffers every n frames. This
// still sounds okay because our auditory systems are less sensitive than our
// visual systems, and the updates are still pretty fast.
const FILTER_CHANGE_FRAMES = 20;
var frames_until_next_filter_change = 0;

// Convert radians to degrees
function rad2deg(radians) {
	return radians * 180 / Math.PI;
}

function animate() {

	if (frames_until_next_filter_change == 0) {
		const {listener, lNode, rNode} = standardRenderer.getNodes();

		// compute position of teapots in view space
		var position = new THREE.Vector4(teapot1.position.x, teapot1.position.y, teapot1.position.z, 1.0);
		position.applyMatrix4(mat.stereoViewMat.C);

		// convert EE 267 coordinate system to 3D3A coordinate system (i.e., the AES69-2015 coordinate system)
		x = -position.z;
		y = -position.x;
		z = position.y;

		// compute Euler angles
		var yaw = rad2deg(Math.atan2(y, x));
		var radius = Math.sqrt(x*x + y*y + z*z);
		var pitch = rad2deg((z / radius));

		// retrieve left and right HRTFs and downsample to 48 kHz
		const _filter = sofaGetFilterSpherical(handle, yaw, pitch, radius);
		var l32 = downsample2(new Float32Array(_filter.Left));
		var r32 = downsample2(new Float32Array(_filter.Right));
		
		// load left HRTF into left ConvolverNode
		const LaudioBuffer = listener.context.createBuffer(1, l32.length, listener.context.sampleRate);
		const LchannelData = LaudioBuffer.getChannelData(0);
		for (var i = 0; i < LaudioBuffer.length; i++) { 
			LchannelData[i] = l32[i];
		}
		lNode.buffer = LaudioBuffer;
	
		// load right HRTF into right ConvolverNode
		const RaudioBuffer = listener.context.createBuffer(1, r32.length, listener.context.sampleRate);
		const RchannelData = RaudioBuffer.getChannelData(0);
		for (var i = 0; i < RaudioBuffer.length; i++) { 
			RchannelData[i] = r32[i];
		}
		rNode.buffer = RaudioBuffer;

		// Reset counter
		frames_until_next_filter_change = FILTER_CHANGE_FRAMES;
	} else {
		// Decrement counter
		frames_until_next_filter_change--;
	}

	requestAnimationFrame( animate );

	// Start performance monitoring
	stats.begin();

	// update model/view/projection matrices
	mat.update( sc.state );

	if ( renderingMode === STEREO_MODE ) {

		if ( webglRenderer.autoClear ) webglRenderer.clear();

		webglRenderer.setScissorTest( true );

		// Render for the left eye on the left viewport
		webglRenderer.setScissor(
			0, 0, dispParams.canvasWidth / 2, dispParams.canvasHeight );

		webglRenderer.setViewport(
			0, 0, dispParams.canvasWidth / 2, dispParams.canvasHeight );

		standardRenderer.render(
			sc.state, mat.modelMat, mat.stereoViewMat.L, mat.stereoProjectionMat.L );

		// Render for the right eye on the right viewport
		webglRenderer.setScissor(
			 dispParams.canvasWidth / 2, 0,
			 dispParams.canvasWidth / 2, dispParams.canvasHeight );

		webglRenderer.setViewport(
			dispParams.canvasWidth / 2, 0,
			dispParams.canvasWidth / 2, dispParams.canvasHeight );

		standardRenderer.render(
			sc.state, mat.modelMat, mat.stereoViewMat.R, mat.stereoProjectionMat.R );

		webglRenderer.setScissorTest( false );

	} else if ( renderingMode === STEREO_UNWARP_MODE ) {

		// Render for the left eye on frame buffer object
		standardRenderer.renderOnTarget( stereoUnwarpRenderer.renderTargetL,
			sc.state, mat.modelMat, mat.stereoViewMat.L, mat.stereoProjectionMat.L );

		// Render for the right eye on frame buffer object
		standardRenderer.renderOnTarget( stereoUnwarpRenderer.renderTargetR,
			sc.state, mat.modelMat, mat.stereoViewMat.R, mat.stereoProjectionMat.R );

		stereoUnwarpRenderer.render( sc.state );

	}

	// End performance monitoring
	stats.end();

	// Display parameters used for rendering.
	sc.display();

}
