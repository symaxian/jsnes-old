//===================================
//== Nintendo Entertainment System ==
//===================================

JSNES = {};

nes = {

//Properties

    active:false,

    fps:0,
    lastFrameTime:0,
    fpsDisplay:null,

//Methods

    init:function nes_init(){

        //Get the fps display.
        this.fpsDisplay = document.getElementById('fps');

        //Replace the fps display with a placeholder if its null.
        if(this.fpsDisplay === null){
            this.fpsDisplay = {innerHTML:''};
        }

        //Initiate the screen.
        this.screen.init();

        //Initiate the controllers.
        this.controllers.init();

        //Initiate the audio wrapper, FIXME
        //this.dynamicAudio = new DynamicAudio({swf:'lib/dynamicaudio.swf'});

        this.ppu = new JSNES.PPU(this);
        this.mmap = null;

        //Reset the system.
        this.reset();

    },

    reset:function nes_reset(){

        //Reset the cpu.
        this.cpu.reset();

        //Reset the ppu.
        this.ppu.reset();

        //Reset the apu, FIXME.
        //this.apu.reset(true);

        //Reset the mmc if its loaded.
        if(this.mmap !== null){
            this.mmap.reset();
        }

    },

    start:function nes_start(){

        //Check if a valid rom is loaded.
        if(this.rom !== null && this.rom.valid){

            //Set the nes to active.
            this.active = true;

            //Start the fps update interval.
            this.fpsInterval = setInterval(function(){nes.fpsDisplay.innerHTML=nes.fps;},200);//<fpsUpdateInterval>

            //Run the first frame.
            this.frame();

        }
        else{

            //Else no rom loaded.
            this.updateStatus('Cannot start, there is no ROM loaded, or it is invalid.');

        }
    
    },

    frame:function nes_frame(){

        //Check if the nes is active.
        if(this.active){

            //Clear the ppu buffer.
            this.ppu.startFrame();

            //Reset the cycle count to 0.
            var cycles = 0;

            //Start the frame loop.
            FRAMELOOP:for(;;){

                //Check if no cycles are to be halted.
                if(this.cpu.cyclesToHalt === 0){

                    //Execute a CPU instruction.
                    cycles = this.cpu.emulate();

                    //Set the cycles to the apu if active, FIXME.
                    //this.apu.clockFrameCounter(cycles);

                    //???
                    cycles *= 3;

                }

                //Else check if the number of cycles to halt is less than or equal to 8.
                else if(this.cpu.cyclesToHalt < 9){

                    //???
                    cycles = this.cpu.cyclesToHalt*3;

                    //Set the cycles to halt to the apu if active, FIXME.
                    //this.apu.clockFrameCounter(this.cpu.cyclesToHalt);

                    //Set the cycles to halt to 0.
                    this.cpu.cyclesToHalt = 0;

                }

                //Else the number of cycles to halt is greater than 8.
                else{

                    //Set the cycles to 24.
                    cycles = 24;

                    //Set the cycles to halt to the apu if active, FIXME.
                    //this.apu.clockFrameCounter(8);

                    //Remove 8 from the cycles to halt counter.
                    this.cpu.cyclesToHalt -= 8;

                }

                //Loop for every cycle executed by the cpu.
                for(;cycles>0;cycles--){

                    //Check for a sprite 0 hit.
                    if(this.ppu.curX === this.ppu.spr0HitX && this.ppu.f_spVisibility === 1 && this.ppu.scanline - 21 === this.ppu.spr0HitY){
                        this.ppu.setStatusFlag(this.ppu.STATUS_SPRITE0HIT,true);
                    }

                    //Check if the ppu is done rendering.
                    if(this.ppu.requestEndFrame){

                        //Decrement the non-maskable interrupt counter.
                        this.ppu.nmiCounter--;

                        //???
                        if(this.ppu.nmiCounter === 0){

                            //Reset the end of frame flag.
                            this.ppu.requestEndFrame = false;

                            //Start the vBlank period.
                            this.ppu.startVBlank();

                            //Break the frame loop.
                            break FRAMELOOP;

                        }

                    }

                    //Increment the current x.
                    this.ppu.curX++;

                    //???
                    if(this.ppu.curX === 341){
                        this.ppu.curX = 0;
                        this.ppu.endScanline();
                    }

                }
            }

            //Calculate the frames per second.
            var now = new Date().getTime();
            var frameDifference = this.lastFrameTime - now;
            this.fps = (-1000/frameDifference).toFixed(2);//<fpsPrecision>
            this.lastFrameTime = now;

            //Set the timeout for the next frame.
            setTimeout(function(){nes.frame()},20);//<frameRate>

        }

    },

    stop:function nes_stop(){

        //Set the active flag to false.
        this.active = false;

        //Clear the fps update interval.
        clearInterval(this.fpsInterval);

    },

    restart:function nes_restart(){

        //Stop the nes.
        this.stop();

        //Reset the nes.
        this.reset();

        //Start the nes.
        this.start();

    },

    loadRom:function nes_loadRom(src){

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

        //Cache the rom data.
        var data = request.responseText;

        //Check the rom validity.
        if(data.indexOf("NES\x1a") !== -1){

            //Create a new rom object.
            this.rom = new JSNES.ROM(this);

            //Set the valid flag, REMOVE.
            this.rom.valid = true;

            //Load the data.
            this.rom.load(data);

            //Reset the nes.
            this.reset();

            //Get the mmc needed by the rom.
            this.mmap = this.rom.createMapper();

            //Check if the mmc is valid.
            if(!this.mmap){
                return;
            }

            //Load the rom data.
            this.mmap.loadROM();

            //Set the ppu mirroring from the rom.
            if(this.rom.fourScreen){
                this.ppu.setMirroring(this.rom.FOURSCREEN_MIRRORING);
            }
            else if(this.rom.mirroring === 0){
                this.ppu.setMirroring(this.rom.HORIZONTAL_MIRRORING);
            }
            else{
                this.ppu.setMirroring(this.rom.VERTICAL_MIRRORING);
            }

            //Return true, the rom was succesfully loaded.
            return true;

        }

        //Return false, the rom was not valid.
        return false;

    },

    updateStatus:function(){},

    writeAudio:function(samples){

        //Write the samples to the audio wrapper, FIXME.
        return this.dynamicAudio.writeInt(samples);

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
