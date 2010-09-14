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

//Properties

    active:false,
    fps:0,
    status:'',
    romData:null,
    emulateSound:false,

//Methods

    init:function nes_init(){

        //Initiate the screen.
        this.screen.init();

        //Initiate the controllers.
        this.controllers.init();

        // Sound
        this.dynamicaudio = new DynamicAudio({swf:'lib/dynamicaudio.swf'});

        this.cpu = new JSNES.CPU(this);
        this.ppu = new JSNES.PPU(this);
        this.papu = new JSNES.PAPU(this);
        this.mmap = null; // set in loadRom()

        this.updateStatus("Ready to load a ROM.");
    
    },

    updateStatus:function(){},

    writeAudio:function(samples){
        return this.dynamicaudio.writeInt(samples);
    },

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

    setFramerate: function(rate){
        this.nes.opts.preferredFrameRate = rate;
        this.nes.frameTime = 1000 / rate;
        this.papu.setSampleRate(44100, false);
    },

    //============
    //== Screen ==
    //============

    screen:{

    //Properties

        canvas:null,
        context:null,

        imageData:null,
        pixelData:null,
        buffer:null,

    //Methods

        init:function nes_screen_init(){

            //Get the canvas element.
            this.canvas = document.getElementById('jsnes');

            //Set the width and height.
            this.canvas.width = 256;
            this.canvas.height = 240;

            //Get the canvas context.
            this.context = this.canvas.getContext('2d');

            //Fill the canvas black.
            this.context.fillStyle = 'black';
            this.context.fillRect(0,0,256,240);

            //Get the image data.
            this.imageData = this.context.getImageData(0,0,256,240);

            //Get the pixel data.
            this.pixelData = this.imageData.data;

            //Create the buffer.
            this.buffer = new Array(61440);

        },

        writeFrame:function nes_screen_writeFrame(buffer){

            //Loop through each pixel.
            for(var i=0;i<61440;i++){

                //Cache the new color.
                var pixel = buffer[i];

                //Check if the new and old colors are different.
                if(pixel !== this.buffer[i]){
    
                    //Set the red color component.
                    this.pixelData[i*4] = pixel&0xFF;

                    //Set the green color component.
                    this.pixelData[i*4+1] = (pixel>>8)&0xFF;

                    //Set the blue color component.
                    this.pixelData[i*4+2] = (pixel>>16)&0xFF;

                    //Set the new color in the buffer.
                    this.buffer[i] = pixel;

                }
            }

            //Place the image data onto the canvas.
            this.context.putImageData(this.imageData,0,0);

        },

    },

    //=================
    //== Controllers ==
    //=================

    controllers:{

    //Properties

        //Controller States

        state1:[64,64,64,64,64,64,64,64,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
        state2:[64,64,64,64,64,64,64,64,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],

        //Controller Key Bindings

        keys1:[
            88,     //A         X
            90,     //B         Z
            17,     //Select    Right Ctrl
            13,     //Start     Enter
            38,     //Up        Up
            40,     //Down      Down
            37,     //Left      Left
            39,     //Right     Right
        ],

        keys2:[
            103,    //A         Numpad-7
            105,    //B         Numpad-9
            99,     //Select    Numpad-3
            97,     //Start     Numpad-1
            104,    //Up        Numpad-8
            98,     //Down      Numpad-2
            100,    //Left      Numpad-4
            102,    //Right     Numpad-6
        ],

    //Methods

        init:function nes_controller(){

            //Define the key down event handler.
            document.onkeydown = function document_onkeydown(event){
                //Loop through the key codes.
                for(var i=0;i<nes.controllers.keys1.length;i++){
                    //Check the controller 1 code.
                    if(event.keyCode === nes.controllers.keys1[i]){
                        nes.controllers.state1[i] = 65;
                        break;
                    }
                    //Else check the controller 2 code.
                    else if(event.keyCode === nes.controllers.keys2[i]){
                        nes.controllers.state2[i] = 65;
                        break;
                    }
                }
            }

            //Define the key up event handler.
            document.onkeyup = function document_onkeyup(event){
                //Loop through the key codes.
                for(var i=0;i<nes.controllers.keys1.length;i++){
                    //Check the controller 1 code.
                    if(event.keyCode === nes.controllers.keys1[i]){
                        nes.controllers.state1[i] = 64;
                        break;
                    }
                    //Else check the controller 2 code.
                    else if(event.keyCode === nes.controllers.keys2[i]){
                        nes.controllers.state2[i] = 64;
                        break;
                    }
                }
            }

        },

    },

};
