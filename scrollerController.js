const i2cBus = require('i2c-bus')

module.exports = class ScrollController {
  constructor() {
    this.bus = null

    this.defaultAddress = 0x74
    this.BANK_ADDRESS = 0xfd
    this.SHUTDOWN_REGISTER = 0x0a
    this.CONFIG_BANK = 0x0b
    this.AUDIOSYNC_REGISTER = 0x06
    this.MODE_REGISTER = 0x00
    this.FRAME_REGISTER = 0x01
    this.PICTURE_MODE = 0x00
    this.COLOR_OFFSET = 0x24

    this.LED_GAMMA = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2,
      2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
      6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11,
      11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18,
      19, 19, 20, 21, 21, 22, 22, 23, 23, 24, 25, 25, 26, 27, 27, 28,
      29, 29, 30, 31, 31, 32, 33, 34, 34, 35, 36, 37, 37, 38, 39, 40,
      40, 41, 42, 43, 44, 45, 46, 46, 47, 48, 49, 50, 51, 52, 53, 54,
      55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
      71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 88, 89,
      90, 91, 93, 94, 95, 96, 98, 99, 100, 102, 103, 104, 106, 107, 109, 110,
      111, 113, 114, 116, 117, 119, 120, 121, 123, 124, 126, 128, 129, 131, 132, 134,
      135, 137, 138, 140, 142, 143, 145, 146, 148, 150, 151, 153, 155, 157, 158, 160,
      162, 163, 165, 167, 169, 170, 172, 174, 176, 178, 179, 181, 183, 185, 187, 189,
      191, 193, 194, 196, 198, 200, 202, 204, 206, 208, 210, 212, 214, 216, 218, 220,
      222, 224, 227, 229, 231, 233, 235, 237, 239, 241, 244, 246, 248, 250, 252, 255
    ]

    this.currentFrame = 0
    
  }

  write(addr, cmd, data) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(data);
      this.bus.writeI2cBlock(
        addr,
        cmd,
        buffer.length,
        buffer,
        error => {
          if (error !== null) {
            console.log('I2C write error: ', error)
            reject()
          } else {
            resolve()
          }
        }
      )
    })
  }

  setBank(bank) {
    return this.write(
      this.defaultAddress,
      this.BANK_ADDRESS,
      [bank]
    )
  }

  async setRegister(bank, register, value) {
    await this.setBank(bank)
    await this.write(
      this.defaultAddress,
      register,
      [value]
    )
  }

  sleep(goToSleep) {
    return this.setRegister(
      this.CONFIG_BANK,
      this.SHUTDOWN_REGISTER,
      !goToSleep
    )
  }

  async reset() {
    await this.sleep(true)
    await this.sleep(false)
  }

  /**
   * Initiate the i2c bus
   */
  init() {
    return new Promise((resolve, reject) => {
      this.bus = i2cBus.open(1, async err => {
        if (!err) {
          await this.reset()
          await this.setBank(this.CONFIG_BANK)
          await this.write(
            this.defaultAddress,
            this.MODE_REGISTER,
            [this.PICTURE_MODE]
          )
          await this.write(
            this.defaultAddress, 
            this.AUDIOSYNC_REGISTER, 
            [0]
          )

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

          for (let i = 0; i < 2; i++) {
            await this.setBank(i)
            await this.write(
              this.defaultAddress,
              0x00,
              validLEDs
            )
          }
          await this.setBank(0)

          return resolve()
        } else {
          console.log('ERR: unable to open i2c bus')
          return reject(err)
        }
      })
    })
  }

  chunker(array, chunkSize){
    let chunks = []
    let chunkIndex = 0
    while (chunkIndex < array.length){
      let chunk = array.slice(chunkIndex, chunkIndex + chunkSize)
      chunkIndex += chunkSize
      chunks.push(chunk)
    }
    return chunks
  }

  async setFrame(frameId) {
    await this.setRegister(
      this.CONFIG_BANK, 
      this.FRAME_REGISTER,
      frameId
    )
  }

  async display(pixelArray, gammaAdjust = true) {
    let output = new Array(161)
    output.fill(0)
    if (gammaAdjust) {
      for (let i = 0; i < pixelArray.length; i++) {
        let x = 16 - i % 17
        let y = Math.floor(i / 17)

        if (x > 8) {
          x = x - 8
          y = 6 - (y + 8)
        } else {
          x = 8 - x
        }
        // console.log(x + y * 17, i)
        output[x * 16 + y] = this.LED_GAMMA[pixelArray[i]]
      }
    }
    this.currentFrame = this.currentFrame == 0 ? 1 : 0
    

    await this.setBank(this.currentFrame)

    let chunkSize = 32
    let chunks = this.chunker(output, chunkSize)
    let currentChunk = 0

    while (currentChunk < chunks.length - 1) {
      
      await this.write(
        this.defaultAddress, 
        this.COLOR_OFFSET + currentChunk * chunkSize,
        chunks[currentChunk]
      )
      
      currentChunk++
    }
    await this.setFrame(this.currentFrame)
  }

  async clear() {
    let blanker = new Array(117)
    blanker.fill(0)
    await this.display(blanker)
  }
}
