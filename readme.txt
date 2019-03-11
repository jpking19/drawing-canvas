Jason King
Computer Graphics CS4731 - Project 1

In this project, I worked with WebGL to implement an interface that allowed both the drawing of lines within a canvas and uploading of dat files to be displayed on a canvas.

My program structure beings with event listeners (listening for key events such as the upload of a .dat file or clicking on the canvas) that call major functions, such as draw (which handles drawing lines in general) and drawPoint(which draws a singular point).

I encountered two issues with my project:
-there is a slight pause before the user can click onto the canvas in draw mode
-I could not get the new-line mode(when the user presses down b) to work as intended, so I decided to have it be a toggle instead (and indicated so with a cursor style change)

I hope these are not serious issues, thank you for your patience.