/*
JSNES, based on Jamie Sanders' vNES
Copyright (C) 2010 Ben Firshman

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

JSNES = {};

nes = {

    init:function(){

        this.fps = 0;
        this.status = '';

                    // Canvas
        
                    this.canvas = document.getElementById('jsnes');
        
                    this.canvas.width = 256;
                    this.canvas.height = 240;
        
                    this.canvasContext = this.canvas.getContext('2d');
                    
                    this.canvasImageData = this.canvasContext.getImageData(0, 0, 256, 240);
                    this.canvasContext.fillStyle = 'black';
                    this.canvasContext.fillRect(0, 0, 256, 240); // set alpha to opaque
                
                    // Set alpha
                    for (var i = 3; i < this.canvasImageData.data.length-3; i+=4) {
                        this.canvasImageData.data[i] = 0xFF;
                    }

                    // Sound
                    this.dynamicaudio = new DynamicAudio({
                        swf:'lib/dynamicaudio.swf'
                    });


        showDisplay = true;

        emulateSound = false;

        this.cpu = new JSNES.CPU(this);
        this.ppu = new JSNES.PPU(this);
        this.papu = new JSNES.PAPU(this);
        this.mmap = null; // set in loadRom()
        this.keyboard = new JSNES.Keyboard();
        
        this.updateStatus("Ready to load a ROM.");
    
    },

                updateStatus:function(){},
            
                writeAudio: function(samples) {
                    return this.dynamicaudio.writeInt(samples);
                },
            
                writeFrame: function(buffer, prevBuffer) {
                    var imageData = this.canvasImageData.data;
                    var pixel, i, j;

                    for (i=0; i<256*240; i++) {
                        pixel = buffer[i];

                        if (pixel != prevBuffer[i]) {
                            j = i*4;
                            imageData[j] = pixel & 0xFF;
                            imageData[j+1] = (pixel >> 8) & 0xFF;
                            imageData[j+2] = (pixel >> 16) & 0xFF;
                            prevBuffer[i] = pixel;
                        }
                    }

                    this.canvasContext.putImageData(this.canvasImageData, 0, 0);
                },

    active: false,
    fpsFrameCount: 0,
    limitFrames: true,
    romData: null,
    
    // Resets the system
    reset: function() {
        if (this.mmap !== null) {
            this.mmap.reset();
        }
        
        this.cpu.reset();
        this.ppu.reset();
        this.papu.reset();
    },
    
    start: function() {
        var self = this;
        
        if (this.rom !== null && this.rom.valid) {
            if (!this.active) {
                this.active = true;
                this.fpsInterval = setInterval(function(){document.getElementById('fps').innerHTML=nes.fps;},200);//<fpsUpdateInterval>
                this.frame();
            }
        }
        else {
            this.updateStatus("There is no ROM loaded, or it is invalid.");
        }
    },
    
    frame: function() {
        if(this.active){
            this.ppu.startFrame();
            var cycles = 0;
            var emulateSound = false;
            var cpu = this.cpu;
            var ppu = this.ppu;
            var papu = this.papu;
            FRAMELOOP: for (;;) {
                if (cpu.cyclesToHalt === 0) {
                    // Execute a CPU instruction
                    cycles = cpu.emulate();
                    if (emulateSound) {
                        papu.clockFrameCounter(cycles);
                    }
                    cycles *= 3;
                }
                else {
                    if (cpu.cyclesToHalt > 8) {
                        cycles = 24;
                        if (emulateSound) {
                            papu.clockFrameCounter(8);
                        }
                        cpu.cyclesToHalt -= 8;
                    }
                    else {
                        cycles = cpu.cyclesToHalt * 3;
                        if (emulateSound) {
                            papu.clockFrameCounter(cpu.cyclesToHalt);
                        }
                        cpu.cyclesToHalt = 0;
                    }
                }
                
                for (; cycles > 0; cycles--) {
                    if(ppu.curX === ppu.spr0HitX &&
                            ppu.f_spVisibility === 1 &&
                            ppu.scanline - 21 === ppu.spr0HitY) {
                        // Set sprite 0 hit flag:
                        ppu.setStatusFlag(ppu.STATUS_SPRITE0HIT, true);
                    }

                    if (ppu.requestEndFrame) {
                        ppu.nmiCounter--;
                        if (ppu.nmiCounter === 0) {
                            ppu.requestEndFrame = false;
                            ppu.startVBlank();
                            break FRAMELOOP;
                        }
                    }

                    ppu.curX++;
                    if (ppu.curX === 341) {
                        ppu.curX = 0;
                        ppu.endScanline();
                    }
                }
            }

            //Calculate the frames per second.
            var now = new Date().getTime();
            var frameDifference = this.lastFrameTime - now;
            this.fps = (-1000/frameDifference).toFixed(2);
            this.lastFrameTime = now;

            //Set the timeout for the next frame.
            setTimeout(function(){nes.frame()},20);//<frameRate>

        }

    },

    stop: function() {
        this.active = false;
        clearInterval(this.fpsInterval);
    },
    
    reloadRom: function() {
        if (this.romData !== null) {
            this.loadRom(this.romData);
        }
    },
    
    // Loads a ROM file into the CPU and PPU. The ROM file is validated first.
    loadRom: function(src) {

        //Stop the emulator if running.
        if(this.active){
            this.stop();
        }

        //Create a new http request.
        var request = new XMLHttpRequest();
        request.open('GET',src,false);

        //Set the mime type to binary.
        request.overrideMimeType('text/plain; charset=x-user-defined');

        //Send the request.
        request.send(null);

        //Save the response.
        var data = request.responseText;

        this.updateStatus("Loading ROM...");

        // Load ROM file:
        this.rom = new JSNES.ROM(this);
        this.rom.load(data);

        if (this.rom.valid) {
            this.reset();
            this.mmap = this.rom.createMapper();
            if (!this.mmap) {
                return;
            }
            this.mmap.loadROM();
            this.ppu.setMirroring(this.rom.getMirroringType());
            this.romData = data;
            
            this.updateStatus("Successfully loaded. Ready to be started.");
        }
        else {
            this.updateStatus("Invalid ROM!");
        }
        return this.rom.valid;
    },
    
    resetFps: function() {
        this.lastFpsTime = null;
        this.fpsFrameCount = 0;
    },
    
    setFramerate: function(rate){
        this.nes.opts.preferredFrameRate = rate;
        this.nes.frameTime = 1000 / rate;
        this.papu.setSampleRate(44100, false);
    },
    
    setLimitFrames: function(limit) {
        this.limitFrames = limit;
        this.lastFrameTime = null;
    }

};
