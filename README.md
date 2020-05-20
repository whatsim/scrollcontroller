Scroll HD Controller
====================

a small nodejs module to communicate with a Pimonroni Scroll HD Pi Hat, ported from 
[pimoroni's library](https://github.com/pimoroni/scroll-phat-hd)

requires `i2c-bus` \[[git](https://github.com/fivdi/i2c-bus)\] and has ONLY been
tested on a Raspberry Pi Zero W with node v9.10.1. >v8 will probably work, but
I again haven't tested.

only provides the ability to display pixel arrays, and has no higher level
functionality.

DOES NOT SUPPORT ANYTHING OTHER THAN THE SCROLL HD. sorry for shouting.

Installation
============

this will only work on a linux system with an i2c bus. on raspbian i2c
is not enabled by default, [here's some information on enabling it.](https://learn.sparkfun.com/tutorials/raspberry-pi-spi-and-i2c-tutorial#i2c-on-pi)

```
$ npm install git+https://git@github.com/whatsim/scrollcontroller.git
```

API
===

scrollController exports a class with three methods:

```javascript

init()

// will return a promise which will be resolved when the display will be initialized
// you must call this method before any call to other methods

```
```javascript

display(pixelArray, gammaAdjust = true)

// takes a pixel array, that is: a 119 length int array bounded between
// [0-255] where 255 is white and 0 is black. if you omit or pass `gammaAdjust` 
// as true, the display function will process the input array to conform to 
// the gamma curve from pimoroni. if you set it to false, the values are
// displayed as is. the pixel array starts in the upper left, goes across left
// to right, and then row by row.
// this method also return a promise which will be resolved when the display has been updated

```
```javascript

clear()

// clear takes no arguments and blanks the display.
// this method return a similar promise than the display method

```

Usage
=====

Here's a minimal example that shows an alternating field of pixels.

```javascript
// get a reference to scrollcontroller
const scrollController = new(require('scroll-controller'))()

// make an array of 0-255 pixels
let arr = []

for(var i = 0; i < 119; i++){
    arr[i] = i%2 == 0 ? 255 : 0
}

scrollController.init().then(() => {
    scrollController.display(arr)
})
```

I've primarily used this library with [node-canvas](https://github.com/Automattic/node-canvas), like so:

```javascript
// get a reference to scrollcontroller
const scrollController = new(require('scroll-controller'))()

// setup a canvas
const canvas = new Canvas(17,7)
const context = canvas.getContext('2d')

// draw something
context.fillStyle = 'rgba(255,255,255,1)'
context.fillRect(0,0,5,5)

// get a reference to the buffer backing the canvas and cast it to Unsigned Int
let imageBuffer = new Uint8Array(canvas.toBuffer('raw'))
let displayArray = []

// copy pixels out of the buffer into an array suitable to sending to 
// scrollController, note that the buffer from node canvas is ARGB, so
// we only copy one value for each 4 bytes in the buffer.

for(let i = 1; i < imageBuffer.length; i += 4){
	displayArray.push(imageBuffer[i])
}

// init and display
scrollController.init().then(() => {
    scrollController.display(displayArray)
})

```

Support
=======

Hey so, this works for me. If you fix a bug and would like to share it back, 
please do a PR, but I may not be timely in replying. This is the 'put it on 
the internet in case it solves someones problem as is' sort of open source not
'be responsible for the continued function of other peoples projects for 
forever' sort of open source.

License
=======

MIT 2018 http://whatsim.mit-license.org
