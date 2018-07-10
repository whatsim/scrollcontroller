const i2cBus = require('i2c-bus')

let ready = false

let bus = i2cBus.open(1, (a,b,c)=>{
	// console.log(a,b,c)
	ready = true
	init()
});

const _width = 17
const _height = 7

const _address = 0x74

const _MODE_REGISTER = 0x00
const _FRAME_REGISTER = 0x01
const _AUTOPLAY1_REGISTER = 0x02
const _AUTOPLAY2_REGISTER = 0x03
const _BLINK_REGISTER = 0x05
const _AUDIOSYNC_REGISTER = 0x06
const _BREATH1_REGISTER = 0x08
const _BREATH2_REGISTER = 0x09
const _SHUTDOWN_REGISTER = 0x0a
const _GAIN_REGISTER = 0x0b
const _ADC_REGISTER = 0x0c

const _CONFIG_BANK = 0x0b
const _BANK_ADDRESS = 0xfd

const _PICTURE_MODE = 0x00
const _AUTOPLAY_MODE = 0x08
const _AUDIOPLAY_MODE = 0x18

const _ENABLE_OFFSET = 0x00
const _BLINK_OFFSET = 0x12
const _COLOR_OFFSET = 0x24

const LED_GAMMA = [
0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,
2,  2,  2,  3,  3,  3,  3,  3,  4,  4,  4,  4,  5,  5,  5,  5,
6,  6,  6,  7,  7,  7,  8,  8,  8,  9,  9,  9,  10, 10, 11, 11,
11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18,
19, 19, 20, 21, 21, 22, 22, 23, 23, 24, 25, 25, 26, 27, 27, 28,
29, 29, 30, 31, 31, 32, 33, 34, 34, 35, 36, 37, 37, 38, 39, 40,
40, 41, 42, 43, 44, 45, 46, 46, 47, 48, 49, 50, 51, 52, 53, 54,
55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 88, 89,
90, 91, 93, 94, 95, 96, 98, 99,100,102,103,104,106,107,109,110,
111,113,114,116,117,119,120,121,123,124,126,128,129,131,132,134,
135,137,138,140,142,143,145,146,148,150,151,153,155,157,158,160,
162,163,165,167,169,170,172,174,176,178,179,181,183,185,187,189,
191,193,194,196,198,200,202,204,206,208,210,212,214,216,218,220,
222,224,227,229,231,233,235,237,239,241,244,246,248,250,252,255]

let currentFrame = 0

// read buttons
//								i2c address, button register
// _states = _bus.read_byte_data(0x3f, 0x00)

function init(){
	setBank(_CONFIG_BANK)
	write(_address, _MODE_REGISTER, [_PICTURE_MODE])
	write(_address, _AUDIOSYNC_REGISTER, [0])

	let validLEDs = [
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b01111111,
		0b01111111, 0b00000000,
	]

	for (let i = 0; i < 2; i++){
		setBank(i)
		write(_address, 0x00, validLEDs)
	}
	setBank(0)
}




function display(pixelArray, gammaAdjust = true){
	let output = new Array(144)
	output.fill(0)
	if(gammaAdjust){
		for(let i = 0; i < pixelArray.length; i++){
			let x = 16 - i % 17
			let y = Math.floor(i / 17)

			if (x > 8){
				x = x - 8
				y = 6 - (y + 8)	
			} else {
				x = 8 - x
			}

			// console.log(x + y * 17, i)
			output[x * 16 + y] = LED_GAMMA[pixelArray[i]]
		}
	}
	
	currentFrame = currentFrame == 0 ? 1 : 0
	let offset = 0

	// do the draw

	setBank(currentFrame,()=>{
		let chunks = chunker(output, 32)
		let i = 0;
		next()
		function next(e){
			if(e){
				next()
				// repeat on error
			} else {
				if(i === chunks.length - 1){
					var cb = ()=>{
						setFrame(currentFrame)	
					}
				} else {
					cb = next
				}
				write(_address, _COLOR_OFFSET + offset, chunks[i], cb)
				offset += 32
				i++
			}
		}
	})
	
}

function clear(){
	let blanker = new Array(117)
	blanker.fill(0)
	display(blanker)
}

function write(addr,cmd,word,cb){
	if(ready){
		const buf = Buffer.from(word);
		bus.writeI2cBlock(addr, cmd, buf.length, buf,(a,b,c)=>{
			// console.log(a,b,c)
			if(cb) cb()
		})
	}
	// console.log(addr,cmd,word)
}

function setBank(bank, cb){
	write(_address, _BANK_ADDRESS, [bank], cb)
}

function setFrame(frameID){
	setRegister(_CONFIG_BANK, _FRAME_REGISTER, frameID)
}

function setRegister(bank, register, value, cb){
	setBank(bank)
	write(_address,register,[value], cb)
}

function chunker(array, chunkSize){
	let chunks = []
	let chunkIndex = 0
	while (chunkIndex < array.length){
		let chunk = array.slice(chunkIndex, chunkIndex + chunkSize)
		chunkIndex += chunkSize
		chunks.push(chunk)
	}

	return chunks
}

module.exports = {
	display,
	clear
}
