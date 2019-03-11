// Globals
var lastExtents = []; // extents of last drawing
var lastLines = []; // lines of last drawing
var currentLine = []; // all points in current line user has drawn
var existingLines = []; // previous lines user has drawn
var color = vec4(0, 0, 0, 1.0); // current color, black is default
var colorNum = 0; // 0 = black, 1 = red, 2 = green, 3 = blue
var fileFlag = 1; // Whether or not in file mode
var bFlag = 0; // Whether or not new-line mode is activated
var firstFlag = 1; // Whether or not this is the first point

// Rendering context for WebGL
var gl;

// Set up event listeners
function main () {
	window.onkeypress = function(event)
	{
		var key = event.key;
		switch(key)
		{
			// Change the color of the drawing
			case 'c':
				switch (colorNum) {
					case 0:
						color = vec4(1, 0, 0, 1.0);
						colorNum = 1;
						break;
					case 1:
						color = vec4(0, 1, 0, 1.0);
						colorNum = 2;
						break;
					case 2:
						color = vec4(0, 0, 1, 1.0);
						colorNum = 3;
						break;
					case 3:
						color = vec4(0, 0, 0, 1.0);
						colorNum = 0;
						break;
				}

				// Re-draw the drawing with the new color
				if (fileFlag) {
					draw(lastExtents, lastLines, true);
				} else {
					draw(["0", "400", "400", "0"], [currentLine], true);
					draw(["0", "400", "400", "0"], existingLines, false);

				}
				break;
			// Switch to drawing mode
			case 'd':
				// Clear the canvas
				if (gl) {
					gl.clear(gl.COLOR_BUFFER_BIT);
				}

				// Change title of page and flag
				document.getElementById('title').innerText = "Draw mode";
				fileFlag = 0;

				// Remove file event
				document.getElementById('file').removeEventListener("change", parseFile);

				// Add drawing events
				document.getElementById('webgl').addEventListener('mousedown', getLocation);

				break;
			case 'f':
				// Clear the canvas
				if (gl) {
					gl.clear(gl.COLOR_BUFFER_BIT);
				}
				// Change title of the page and flag
				document.getElementById('title').innerText = "File mode";
				fileFlag = 1;

				// Remove drawing events & clear array
				document.getElementById('file').removeEventListener("change", parseFile);
				drawArray = [];
				firstFlag = 1;
				document.body.style.cursor = "default";

				// Add file event
				document.getElementById('file').addEventListener("change", parseFile);
				break;
		}
	}

	// Add event for choosing a file
	document.getElementById('file').addEventListener("change", parseFile);

	// Add events for new-line mode
	// document.addEventListener("keydown", function(e) {
	// 	if (e.key === 'b') {
	// 		console.log("b");
	// 		bFlag = 1;
	// 	}
	// });
	document.addEventListener("keyup", function(e) {
		if (e.key === 'b') {
			if (bFlag) {
				document.body.style.cursor = "default";
				bFlag = 0;
			} else {
				document.body.style.cursor = "crosshair";
				bFlag = 1;
			}
		}
	});
}

// Parses the file chosen by the user and calls the draw function
function parseFile() {
	// Get and .dat file
	var file = this.files[0];

	if (file) {
		// Create reader and parse file
		var reader = new FileReader();
		reader.onload = function (progressEvent) {

			// Line by line
			var lines = this.result.split('\n');

			// Flags for parsing
			var asteriskFlag = 0;
			var extentFlag = 0;
			var polylinesFlag = 0;

			// Output of parsing
			var polylines = [];
			var polylinePoints = [];
			var extents = [];

			// Check for the special case of dino
			if (lines[0].split(' ')[0].toLowerCase() !== "file:") {
				asteriskFlag = 1;
				extentFlag = 1;
				extents = ["0", "480", "640", "0"];
			}

			for (var line = 0; line < lines.length; line++) {
				// Check for blank spaces
				if (lines[line] === "") {
					continue;
				}

				// Look for asterisk line so we can ignore everything above it
				if (lines[line].indexOf('*') > -1 && !asteriskFlag) {
					asteriskFlag = 1;
				} else if (asteriskFlag && !extentFlag) {
					var extentsParse = lines[line].split(" ");
					// Remove whitespace from array
					for (i = 0; i < extentsParse.length; i++) {
						// Get extents
						if (extentsParse[i] !== "") {
							extents.push(extentsParse[i]);
						}
					}
					extentFlag = 1;
				} else if (extentFlag && !polylinesFlag) {
					// Number of polylines
					polylinesFlag = 1;
				} else if (polylinesFlag && (lines[line].split(' ').length === 1)) {
					// Check if the current polyline has any points
					if (polylinePoints.length > 0) {
						// Add it to the polylines array
						polylines.push(polylinePoints);
					}
					// Reset the points array
					polylinePoints = [];
				} else if (polylinesFlag) {
					// This is a point, add it to the points array
					var pointsParse = lines[line].split(" ");
					var point = [];
					for (i = 0; i < pointsParse.length; i++) {
						// Remove whitespace from array
						if (pointsParse[i] !== "") {
							point.push(pointsParse[i]);
						}
					}
					// Add point to points array
					polylinePoints.push(point);
				}
			}

			// Add the last polyline
			polylines.push(polylinePoints);

			// Draw the lines we've parsed
			draw(extents, polylines, true);
		};
		reader.readAsText(file);
	}
}

// Draws every line in a drawing given the extents and an array of coordinates
function draw (extents, lines, clear) {
	// Save extents and lines
	lastExtents = extents;
	lastLines = lines;

	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	// This function call will create a shader, upload the GLSL source, and compile the shader
	program = initShaders(gl, "vshader", "fshader");

	// We tell WebGL which shader program to execute.
	gl.useProgram(program);

	// Aspect ratio based on extents & canvas size
	var width = extents[2] - extents[0];
	var height = extents[1] - extents[3];

	// If extents are 1 to 1, keep it the same as the canvas
	var viewportWidth = canvas.width;
	var viewportHeight = canvas.height;

	// Calculate the opposite dimension based on which one is larger
	if (width > height) {
		viewportHeight = canvas.width / (width / height);
	} else if (height > width) {
		viewportWidth = canvas.height / (height / width);
	}

	//Set up the viewport
	//x, y - specify the lower-left corner of the viewport rectangle (in pixels)
	//In WebGL, x and y are specified in the <canvas> coordinate system
	//width, height - specify the width and height of the viewport (in pixels)
	//canvas is the window, and viewport is the viewing area within that window
	//This tells WebGL the -1 +1 clip space maps to 0 <-> gl.canvas.width for x and 0 <-> gl.canvas.height for y
	gl.viewport(0, 0, viewportWidth, viewportHeight);

	// Setting Extents
	var thisProj = ortho(parseFloat(extents[0]), parseFloat(extents[2]), parseFloat(extents[3]), parseFloat(extents[1]), -1, 1);

	var projMatrix = gl.getUniformLocation(program, 'projMatrix');
	gl.uniformMatrix4fv(projMatrix, false, flatten(thisProj));

	// Set clear color
	gl.clearColor(0.0, 0.0, 0.0, 0.0);

	// Clear <canvas> by clearing the color buffer IF we want to
	if (clear) {
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	// Draw each line in the drawing
	for (var line = 0; line < lines.length; line++) {
		drawLine(gl, lines[line]);
	}
}

// Draws an individual line given gl and an array of x,y coordinates
function drawLine (gl, line) {
	// Generate vertices and store in array
	var points = [];
	for (var i = 0; i < line.length; i++) {
		points.push(vec4(line[i][0], line[i][1], 0.0, 1.0));
	}

	//Create the buffer object
	var vBuffer = gl.createBuffer();

	//Bind the buffer object to a target
	//The target tells WebGL what type of data the buffer object contains,
	//allowing it to deal with the contents correctly
	//gl.ARRAY_BUFFER - specifies that the buffer object contains vertex data
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

	//Allocate storage and write data to the buffer
	//Write the data specified by the second parameter into the buffer object
	//bound to the first parameter
	//We use flatten because the data must be a single array of ints, uints, or floats (float32 or float64)
	//This is a typed array, and we can't use push() or pop() with it
	//
	//The last parameter specifies a hint about how the program is going to use the data
	//stored in the buffer object. This hint helps WebGL optimize performance but will not stop your
	//program from working if you get it wrong.
	//STATIC_DRAW - buffer object data will be specified once and used many times to draw shapes
	//DYNAMIC_DRAW - buffer object data will be specified repeatedly and used many times to draw shapes
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	//Get the location of the shader's vPosition attribute in the GPU's memory
	var vPosition = gl.getAttribLocation(program, "vPosition");

	//Specifies how shader should pull the data
	//A hidden part of gl.vertexAttribPointer is that it binds the current ARRAY_BUFFER to the attribute.
	//In other words now this attribute is bound to vColor. That means we're free to bind something else
	//to the ARRAY_BUFFER bind point. The attribute will continue to use vPosition.
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

	//Turns the attribute on
	gl.enableVertexAttribArray(vPosition);

	//Specify the vertex size
	var offsetLoc = gl.getUniformLocation(program, "vPointSize");
	gl.uniform1f(offsetLoc, 10.0);

	/*** COLOR DATA ***/
	var colors = [];
	for (var numColors = 0; numColors < line.length; numColors++) {
		// Use current color selected by user
		colors.push(color);
	}

	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

	var vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vColor);

	// Draw the line
	gl.drawArrays(gl.LINE_STRIP, 0, points.length);
}

// Does everything needed to be done in draw mode
function drawMode(coords) {
	// Check if b is being pressed OR first line being drawn
	if (bFlag || firstFlag) {
		// Add current line to array
		if (bFlag) {
			existingLines.push(currentLine)
		}

		// Draw a point for a new line, and set the current line to have this
		firstFlag = 0;
		currentLine = [];
		currentLine.push(coords);
		drawPoint(["0", "0", "400", "400"], coords);
	} else {
		// Add coordinates to currentLine, then draw it
		currentLine.push(coords);
		draw(["0", "400", "400", "0"], [currentLine], true);
	}

	// Draw all lines in existing array
	if (existingLines.length > 0) {
		draw(["0", "400", "400", "0"], existingLines, false)
	}

}

function drawPoint(extents, coords) {
	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Get the rendering context for WebGL
	var gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	// This function call will create a shader, upload the GLSL source, and compile the shader
	program = initShaders(gl, "vshader", "fshader");

	// We tell WebGL which shader program to execute.
	gl.useProgram(program);

	//Set up the viewport
	//x, y - specify the lower-left corner of the viewport rectangle (in pixels)
	//In WebGL, x and y are specified in the <canvas> coordinate system
	//width, height - specify the width and height of the viewport (in pixels)
	//canvas is the window, and viewport is the viewing area within that window
	//This tells WebGL the -1 +1 clip space maps to 0 <-> gl.canvas.width for x and 0 <-> gl.canvas.height for y
	gl.viewport(0, 0, canvas.width, canvas.height);

	// Setting Extents
	var thisProj = ortho(parseFloat(extents[0]), parseFloat(extents[2]), parseFloat(extents[3]), parseFloat(extents[1]), -1, 1);

	var projMatrix = gl.getUniformLocation(program, 'projMatrix');
	gl.uniformMatrix4fv(projMatrix, false, flatten(thisProj));

	// Set clear color
	gl.clearColor(0.0, 0.0, 0.0, 0.0);

	// Clear <canvas> by clearing the color buffer
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Generate points "array"
	var points = [vec4(coords[0], canvas.height - coords[1], 0.0, 1.0)];

	//Create the buffer object
	var vBuffer = gl.createBuffer();

	//Bind the buffer object to a target
	//The target tells WebGL what type of data the buffer object contains,
	//allowing it to deal with the contents correctly
	//gl.ARRAY_BUFFER - specifies that the buffer object contains vertex data
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

	//Allocate storage and write data to the buffer
	//Write the data specified by the second parameter into the buffer object
	//bound to the first parameter
	//We use flatten because the data must be a single array of ints, uints, or floats (float32 or float64)
	//This is a typed array, and we can't use push() or pop() with it
	//
	//The last parameter specifies a hint about how the program is going to use the data
	//stored in the buffer object. This hint helps WebGL optimize performance but will not stop your
	//program from working if you get it wrong.
	//STATIC_DRAW - buffer object data will be specified once and used many times to draw shapes
	//DYNAMIC_DRAW - buffer object data will be specified repeatedly and used many times to draw shapes
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	//Get the location of the shader's vPosition attribute in the GPU's memory
	var vPosition = gl.getAttribLocation(program, "vPosition");

	//Specifies how shader should pull the data
	//A hidden part of gl.vertexAttribPointer is that it binds the current ARRAY_BUFFER to the attribute.
	//In other words now this attribute is bound to vColor. That means we're free to bind something else
	//to the ARRAY_BUFFER bind point. The attribute will continue to use vPosition.
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

	//Turns the attribute on
	gl.enableVertexAttribArray(vPosition);

	//Specify the vertex size
	var offsetLoc = gl.getUniformLocation(program, "vPointSize");
	gl.uniform1f(offsetLoc, 5.0);

	/*** COLOR DATA ***/
	// Use the color selected by user
	var colors = [color];

	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

	var vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vColor);

	// Draw the line
	gl.drawArrays(gl.POINTS, 0, points.length);
}

// Gets the location on a canvas
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: canvas.height - (evt.clientY - rect.top)
	};
}

// Starts the draw mode workflow
function getLocation (evt) {
	var canvas = document.getElementById('webgl');
	var mousePos = getMousePos(canvas, evt);

	var coords = [mousePos.x, mousePos.y];
	drawMode(coords);
}
