//===================================
//== Nintendo Entertainment System ==
//===================================

//Todo

    //Optimization
        //Compile the ppu color palette[s]?
        //Merge the 4 tile rendering routines into one?

    //Implement saving the battery ram as a cookie.
        //Must split up the cookie, max size is 4kb.
        //Use run-length compression?

//Notes

    //Mirroring Types
    //VERTICAL_MIRRORING:0,
    //HORIZONTAL_MIRRORING:1,
    //FOURSCREEN_MIRRORING:2,
    //SINGLESCREEN_MIRRORING:3,
    //SINGLESCREEN_MIRRORING2:4,
    //SINGLESCREEN_MIRRORING3:5,
    //SINGLESCREEN_MIRRORING4:6,
    //CHRROM_MIRRORING:7,

    //PPU Status Flags
    //STATUS_VRAMWRITE: 4,
    //STATUS_SLSPRITECOUNT: 5,
    //STATUS_SPRITE0HIT: 6,
    //STATUS_VBLANK: 7,

JSNES = {PAPU:{}};

nes = {

//Properties

    //Frame Interval
    frameRate:60,
    frameInterval:null,

    //Frames Per Second
    fps:0,

    //The mmc needed for the rom.
    mmc:null,

    //The source of the current rom.
    romSource:null,

    //Battery ram duration, the duration of the cookie used to save the battery ram in days.
    batteryRamDuration:7,

    //Mapper Names
    mapperNames:["Direct Access","Nintendo MMC1","UNROM","CNROM","Nintendo MMC3","Nintendo MMC5","FFE F4xxx","AOROM","FFE F3xxx","Nintendo MMC2","Nintendo MMC4","Color Dreams Chip","FFE F6xxx","Unknown Mapper","Unknown Mapper","100-in-1 switch","Bandai chip","FFE F8xxx","Jaleco SS8806 chip","Namcot 106 chip","Famicom Disk System","Konami VRC4a","Konami VRC2a","Konami VRC2a","Konami VRC6","Konami VRC4b","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Irem G-101 chip","Taito TC0190/TC0350","32kB ROM switch","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Tengen RAMBO-1 chip","Irem H-3001 chip","GNROM switch","SunSoft3 chip","SunSoft4 chip","SunSoft5 FME-7 chip","Unknown Mapper","Camerica chip","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Irem 74HC161/32-based","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Pirate HK-SF3 chip"],

//Methods

    init:function nes_init(){

        //Initiate the screen.
        this.screen.init();

        //Initiate the controllers.
        this.controllers.init();

        //Initiate the audio wrapper.
        this.dynamicAudio = new DynamicAudio({swf:'lib/dynamicaudio.swf'});

        //Reset the system.
        this.reset();

    },

    reset:function nes_reset(){

        //Stop the nes.
        this.stop();

        //Reset the cpu.
        this.cpu.reset();

        //Reset the ppu.
        this.ppu.reset();

        //Reset the apu.
        this.apu.reset();

        //Reset(remove) the mmc.
        this.mmc = null;

    },

    start:function nes_start(){

        //Check if a valid rom is loaded.
        if(this.hasRom()){

            //Start the frame interval.
            this.frameInterval = setInterval(function(){nes.frame()},1000/nes.frameRate);

        }

    },

    stop:function nes_stop(){

        //Clear the frame interval.
        clearInterval(this.frameInterval);

    },

    restart:function nes_restart(){

        //Stop the nes.
        this.stop();

        //Reset the nes.
        this.reset();

        //Load the rom.
        this.loadRom(this.romSource);

        //Start the nes.
        this.start();

    },

    frame:function nes_frame(){

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

                //Set the cycles to the apu if active.
                if(this.apu.active){
                    this.apu.clockFrameCounter(cycles);
                }

                //???
                cycles *= 3;

            }

            //Else check if the number of cycles to halt is less than or equal to 8.
            else if(this.cpu.cyclesToHalt < 9){

                //???
                cycles = this.cpu.cyclesToHalt*3;

                //Set the cycles to halt to the apu if active.
                if(this.apu.active){
                    this.apu.clockFrameCounter(this.cpu.cyclesToHalt);
                }

                //Set the cycles to halt to 0.
                this.cpu.cyclesToHalt = 0;

            }

            //Else the number of cycles to halt is greater than 8.
            else{

                //Set the cycles to 24.
                cycles = 24;

                //Set the cycles to halt to the apu if active.
                if(this.apu.active){
                    this.apu.clockFrameCounter(8);
                }

                //Remove 8 from the cycles to halt counter.
                this.cpu.cyclesToHalt -= 8;

            }

            //Loop for every cycle executed by the cpu.
            for(;cycles>0;cycles--){

                //Check for a sprite 0 hit.
                if(this.ppu.curX === this.ppu.spr0HitX && this.ppu.f_spVisibility === 1 && this.ppu.scanline-21 === this.ppu.spr0HitY){
                    //Set the sprite 0 hit flag.
                    nes.cpu.mem[0x2002] |= 64;
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
                        this.ppu.endFrame();

                        //Break the frame loop.
                        break FRAMELOOP;

                    }

                }

                //Increment the horizontal pixel counter.
                this.ppu.curX++;

                //Check if 341 pixels have been drawn, even though the scanlines are only 256 pixels wide.
                if(this.ppu.curX === 341){
                    //If so reset the horizontal pixel counter to 0 and have the ppu end the scanline.
                    this.ppu.curX = 0;
                    this.ppu.endScanline();
                }

            }
        }

        //Calculate the fps.
        var now = new Date().getTime();
        var frameDifference = this.lastFrameTime-now;
        this.fps = -1000/frameDifference;
        this.lastFrameTime = now;

    },

    hasRom:function nes_hasRom(){

        //Return whether the current rom is not null, FIXME.
        return this.rom !== null;

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

            //Create a blank object for the rom data.
            this.rom = {};

            //Reset the header.
            this.rom.header = new Array(16);

            //Load the header.
            for(var i=0;i<16;i++){
                this.rom.header[i] = data.charCodeAt(i)&0xFF;
            }

            //Get the rom count.
            this.rom.romCount = this.rom.header[4];

            //Get the number of 4kb vrom banks, not 8kb.
            this.rom.vromCount = this.rom.header[5]*2;

            //Get the mirroring type.
            this.rom.mirroring = (this.rom.header[6]&1);

            //Check whether the rom has battery ram.
            this.rom.hasBatteryRam = (this.rom.header[6]&2) !== 0;

            //Get the trainer flag.
            this.rom.trainer = (this.rom.header[6]&4) !== 0;

            //Get the four screen flag.
            this.rom.fourScreen = (this.rom.header[6]&8) !== 0;

            //Get the mapper needed.
            this.rom.mapperType = (this.rom.header[6]>>4) | (this.rom.header[7]&0xF0);

            //Check whether any byte 8-15 is not a zero.
            for(var i=8;i<16;i++){
                if(this.rom.header[i] !== 0){
                    //Ignore byte 7.
                    this.rom.mapperType &= 0xF;
                }
            }

            //Load PRG-ROM banks.
            this.rom.rom = new Array(this.rom.romCount);
            var offset = 16;
            for(var i=0;i<this.rom.romCount;i++){
                this.rom.rom[i] = new Array(16384);
                for(var j=0;j<16384;j++){
                    if(offset+j >= data.length){
                        break;
                    }
                    this.rom.rom[i][j] = data.charCodeAt(offset+j)&0xFF;
                }
                offset += 16384;
            }

            //Reset the vrom and vrom tiles.
            this.rom.vrom = new Array(this.rom.vromCount);
            this.rom.vromTile = new Array(this.rom.vromCount);

            //Loop through the vrom banks.
            for(var i=0;i<this.rom.vromCount;i++){

                //Create the tiles.
                this.rom.vromTile[i] = new Array(256);
                for(var j=0;j<256;j++){
                    this.rom.vromTile[i][j] = new Tile();
                }

                //Load the bank.
                this.rom.vrom[i] = new Array(4096);
                for(var j=0;j<4096;j++){
                    if(offset+j >= data.length){
                        break;
                    }
                    this.rom.vrom[i][j] = data.charCodeAt(offset+j)&0xFF;
                }
                offset += 4096;

                //Convert the bank to the tile.
                for(var j=0;j<4096;j++){
                    if((j%16)<8){
                        this.rom.vromTile[i][j>>4].setScanline(j%16,this.rom.vrom[i][j],this.rom.vrom[i][j+8]);
                    }
                    else{
                        this.rom.vromTile[i][j>>4].setScanline((j%16)-8,this.rom.vrom[i][j-8],this.rom.vrom[i][j]);
                    }
                }

            }

            //Reset the nes.
            this.reset();

            //Check the mapper needed.
            if(typeof this.mappers[this.rom.mapperType] !== 'undefined'){

                //Save the rom's source.
                this.romSource = src;

                //Save the rom's filename, not including the extension.
                this.romName = src.substring(src.lastIndexOf('/')+1);
                this.romName = this.romName.substring(0,this.romName.lastIndexOf('.'));

                //Get the mapper.
                this.mmc = new this.mappers[this.rom.mapperType]();

                //Load the rom data.
                this.mmc.loadROM();

                //Set the ppu mirroring from the rom.
                if(this.rom.fourScreen){
                    //Set fourscreen mirroring.
                    this.ppu.setMirroring(2);
                }
                else if(this.rom.mirroring === 0){
                    //Set horizontal mirroring.
                    this.ppu.setMirroring(1);
                }
                else{
                    //Set vertical mirroring.
                    this.ppu.setMirroring(0);
                }

                //Rom was successfully loaded, return true.
                return true;

            }

            //Rom requires an unknown mapper, return false.
            return false;

        }

        //Rom is not valid, return false.
        return false;

    },

    loadBatteryRam:function nes_loadBatteryRam(){
        //Check if the rom has batteryRAM.
        if(nes.rom.hasBatteryRam){
            //Check if the save file exists.
            if(this.hasSave(this.romName)){
                //Get the save data.
                var data = this.getSave(this.romName);
                //Check the length of the data is valid.
                if(data.length === 8192){
                    //Loop through the characters in the data.
                    for(var i=0;i++;i<8192){
                        //Set the corresponding address in memory as the character code minus 100.
                        nes.cpu.mem[0x6000+i] = data.charCodeAt(i)-100;
                    }
                }
            }
        }
    },

    saveBatteryRam:function nes_saveBatteryRam(){
        //Check if the rom has battery ram.
        if(nes.rom.hasBatteryRam){
            //Create a string for storing the battery ram in the window.name property.
            var batteryRam = '';
            //Loop through the battery ram data.
            for(var i=0x6000;i<0x8000;i++){
                //Add the battery ram data into the string by using characters to encode the numbers.
                //The extra value is added to keep odd characters from being used, as well as the semicolon which would skewer the data.
                batteryRam += String.fromCharCode(nes.cpu.mem[i]+100);
            }
            //Set the save data.
            this.setSave(this.romName,batteryRam);
        }
    },

    hasSave:function nes_hasSave(name){
        //Return whether the name is in the divided window.name data.
        return (window.name.split(';').indexOf(name) !== -1);
    },

    setSave:function nes_setSave(name,value){
        //Check if the name exists in the save data.
        if(this.hasSave(name)){
            //Get the save data.
            var data = window.name.split(';');
            //Remove the extra element added by split().
            data.pop();
            //Clear the window.name property.
            window.name = '';
            //Replace the old data associated with the name.
            data[data.indexOf(name)+1] = value;
            //Loop through the data elements and add them back into window.name property.
            for(var i=0;i<data.length;i++){
                window.name += data[i]+';';
            }
        }
        else{
            //Else add the save data to the window.name property.
            window.name += name+';'+value+';';
        }
    },

    getSave:function nes_getSave(name){
        //Check if the name exists in the save data.
        if(this.hasSave(name)){
            //Get the save data.
            var data = window.name.split(';');
            //Return the element right after the name, the data.
            return data[data.indexOf(name)+1];
        }
        //Name not in the save data, return null.
        return null;
    },

    clearSave:function nes_clearSave(name){
        //Get the save data.
        var data = window.name.split(';');
        //Clear the window.name property.
        window.name = '';
        //Check if the name exists in the save data.
        if(data.indexOf(name)){
            //Remove the name and following element from the array.
            data.splice(data.indexOf(name),2);
        }
        //Loop through the data elements and add them back into window.name property.
        for(var i=0;i++;i<data.length){
            window.name += data[i]+';';
        }
    },

    clearSaves:function nes_clearSaves(){
        //Clear the window.name property.
        window.name = '';
    },

    copyArrayElements:function nes_copyArrayElements(srcArray,srcPos,destArray,destPos,length){
        //Loop through the length of elements to copy.
        for(var i=0;i<length;++i){
            //Copy the element.
            destArray[destPos+i] = srcArray[srcPos+i];
        }
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

            //Create a pixel buffer.
            this.buffer = new Array(61440);

        },

        writeFrame:function nes_screen_writeFrame(buffer){

            //Loop through each pixel.
            for(var i=0;i<61440;i++){

                //Check if the new and old colors are different.
                if(buffer[i] !== this.buffer[i]){

                    //Cache the new color.
                    var pixel = buffer[i];
    
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
