//=============================
//== Picture Processing Unit ==
//=============================

nes.ppu = {

//Properties

    clipToTvSize:true,
    showSpr0Hit:false,

//Methods

    reset:function(){

        //Reset the vram.
        this.vramMem = new Array(0x8000);
        for(var i=0;i<this.vramMem.length;i++){
            this.vramMem[i] = 0;
        }

        //Reset the sprite memory.
        this.spriteMem = new Array(0x100);
        for(var i=0;i<this.spriteMem.length;i++){
            this.spriteMem[i] = 0;
        }

        //VRAM I/O:
        this.vramAddress = null;
        this.vramTmpAddress = null;
        this.vramBufferedReadValue = 0;
        this.firstWrite = true;       //VRAM/Scroll Hi/Lo latch

        //SPR-RAM I/O:
        this.sramAddress = 0; //8-bit only.

        this.mapperIrqCounter = 0;
        this.requestEndFrame = false;
        this.dummyCycleToggle = false;
        this.validTileData = false;
        this.nmiCounter = 0;

        //Control Register
        this.f_nmiOnVblank = 0;    //NMI on VBlank. 0=disable, 1=enable
        this.f_spriteSize = 0;     //Sprite size. 0=8x8, 1=8x16
        this.f_bgPatternTable = 0; //Background Pattern Table address. 0=0x0000,1=0x1000
        this.f_spPatternTable = 0; //Sprite Pattern Table address. 0=0x0000,1=0x1000
        this.f_addrInc = 0;        //PPU Address Increment. 0=1,1=32
        this.f_nTblAddress = 0;    //Name Table Address. 0=0x2000,1=0x2400,2=0x2800,3=0x2C00

        //Masking Register
        this.f_color = 0;         //Background color. 0=black, 1=blue, 2=green, 4=red
        this.f_spVisibility = 0;   //Sprite visibility. 0=not displayed,1=displayed
        this.f_bgVisibility = 0;   //Background visibility. 0=Not Displayed,1=displayed
        this.f_spClipping = 0;     //Sprite clipping. 0=Sprites invisible in left 8-pixel column,1=No clipping
        this.f_bgClipping = 0;     //Background clipping. 0=BG invisible in left 8-pixel column, 1=No clipping
        this.f_dispType = 0;       //Display type. 0=color, 1=monochrome

        //Counters
        this.cntFV = 0;
        this.cntV = 0;
        this.cntH = 0;
        this.cntVT = 0;
        this.cntHT = 0;

        //Registers
        this.regFV = 0;
        this.regV = 0;
        this.regH = 0;
        this.regVT = 0;
        this.regHT = 0;
        this.regFH = 0;
        this.regS = 0;

        //These are temporary variables used in rendering and sound procedures.
        //Their states outside of those procedures can be ignored.
        //TODO: the use of this is a bit weird, investigate
        this.curNt = null;

        //Variables used when rendering.
        this.attrib = new Array(32);
        this.buffer = new Array(256*240);
        this.bgbuffer = new Array(256*240);
        this.pixrendered = new Array(256*240);

        this.validTileData = null;

        this.scantile = new Array(32);

        //Initialize misc vars.
        this.scanline = 0;
        this.lastRenderedScanline = -1;
        this.curX = 0;

        //Sprite data.
        this.sprX = new Array(64); //X coordinate
        this.sprY = new Array(64); //Y coordinate
        this.sprTile = new Array(64); //Tile Index (into pattern table)
        this.sprCol = new Array(64); //Upper two bits of color
        this.vertFlip = new Array(64); //Vertical Flip
        this.horiFlip = new Array(64); //Horizontal Flip
        this.bgPriority = new Array(64); //Background priority
        this.spr0HitX = 0; //Sprite #0 hit X coordinate
        this.spr0HitY = 0; //Sprite #0 hit Y coordinate
        this.hitSpr0 = false;

        //Palette data.
        this.sprPalette = new Array(16);
        this.imgPalette = new Array(16);

        //Create pattern table tile buffers.
        this.ptTile = new Array(512);
        for(var i=0;i<512;i++){
            this.ptTile[i] = new Tile();
        }

        //Create nametable buffers:
        //Name table data:
        this.ntable1 = new Array(4);
        this.nameTable = new Array(4);
        for(var i=0;i<4;i++){
            this.nameTable[i] = new JSNES.PPU.NameTable(32,32);
        }

        //Initialize mirroring lookup table:
        this.vramMirrorTable = new Array(0x8000);
        for (var i=0; i<0x8000; i++) {
            this.vramMirrorTable[i] = i;
        }

        this.palTable = new JSNES.PPU.PaletteTable();
        this.palTable.loadNTSCPalette();

        this.setControlRegister(0);
        this.setMaskingRegister(0);

    },

    setMirroring:function(mirroring){

        //??
        this.triggerRendering();

        //Remove mirroring
        this.vramMirrorTable = new Array(0x8000);
        for(var i=0;i<0x8000;i++){
            this.vramMirrorTable[i] = i;
        }

        //Palette mirroring
        this.defineMirrorRegion(0x3f20,0x3f00,0x20);
        this.defineMirrorRegion(0x3f40,0x3f00,0x20);
        this.defineMirrorRegion(0x3f80,0x3f00,0x20);
        this.defineMirrorRegion(0x3fc0,0x3f00,0x20);

        //Additional mirroring
        this.defineMirrorRegion(0x3000,0x2000,0xf00);
        this.defineMirrorRegion(0x4000,0x0000,0x4000);

        //Horizontal mirroring
        if(mirroring === 0){
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2400,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2800,0x400);
        }

        //Vertical mirroring
        else if (mirroring === 0){
            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 0;
            this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2800,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2400,0x400);
        }

        //Single Screen mirroring
        else if(mirroring === 3){
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 0;
            this.ntable1[3] = 0;
            this.defineMirrorRegion(0x2400,0x2000,0x400);
            this.defineMirrorRegion(0x2800,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2000,0x400);
        }

        //Single Screen mirroring 2
        else if(mirroring === 4){
            this.ntable1[0] = 1;
            this.ntable1[1] = 1;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2400,0x2400,0x400);
            this.defineMirrorRegion(0x2800,0x2400,0x400);
            this.defineMirrorRegion(0x2c00,0x2400,0x400);
        }

        //Assume Four-screen mirroring
        else{
            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 2;
            this.ntable1[3] = 3;
        }

    },

    //Defines a mirrored area in the address lookup table.
    //Assumes the regions don't overlap.
    //The 'to' region is the region that is physically in memory.
    defineMirrorRegion:function(from,to,size){
        for(var i=0;i<size;i++){
            this.vramMirrorTable[from+i] = to+i;
        }
    },

    startVBlank:function(){

        //Do NMI.
        nes.cpu.requestIrq(1);

        //Make sure everything is rendered.
        if(this.lastRenderedScanline < 239){
            this.renderFramePartially(this.lastRenderedScanline+1,240-this.lastRenderedScanline);
        }

        //Draw spr0 hit coordinates.
        //if(this.showSpr0Hit){
        //   //Spr 0 position
        //   if(this.sprX[0] >= 0 && this.sprX[0] < 256 && this.sprY[0] >= 0 && this.sprY[0] < 240){
        //       for(var i=0;i<256;i++){
        //           buffer[(this.sprY[0]<<8)+i] = 0xFF5555;
        //       }
        //       for(var i=0;i<240;i++){
        //           buffer[(i<<8)+this.sprX[0]] = 0xFF5555;
        //       }
        //   }
        //   //Hit position
        //   if(this.spr0HitX >= 0 && this.spr0HitX < 256 && this.spr0HitY >= 0 && this.spr0HitY < 240){
        //       for(var i=0;i<256;i++){
        //           buffer[(this.spr0HitY<<8)+i] = 0x55FF55;
        //       }
        //       for(var i=0;i<240;i++){
        //           buffer[(i<<8)+this.spr0HitX] = 0x55FF55;
        //       }
        //   }
        //}

        //Check to clip the buffer to the tv size.
        if(this.clipToTvSize){
            //Clip the left and right pixels.
            for(var y=0;y<240;y++){
                for(var x=0;x<8;x++){
                    //Left
                    this.buffer[(y<<8)+x] = 0;
                    //Right
                    this.buffer[(y<<8)+255-x] = 0;
                }
            }
            //Clip the top and bottom pixels.
            for(var y=0;y<8;y++){
                for(var x=0;x<256;x++){
                    //Top
                    this.buffer[(y<<8)+x] = 0;
                    //Bottom
                    this.buffer[((239-y)<<8)+x] = 0;
                }
            }
        }

        //Else check to clip the sprites or background, FIXME, does not selectively clip the sprites or background.
        else if(this.f_bgClipping === 0 || this.f_spClipping === 0){
            //Clip left 8 pixels column.
            for(var y=0;y<240;y++){
                for(var x=0;x<8;x++){
                    this.buffer[(y<<8)+x] = 0;
                }
            }
        }

        //Write the buffer to the screen.
        nes.screen.writeFrame(this.buffer);

        //Reset scanline counter.
        this.lastRenderedScanline = -1;

    },

    endScanline:function(){
        switch(this.scanline){
            case 19:
                //Dummy scanline.
                //May be variable length:
                if (this.dummyCycleToggle) {

                    //Remove dead cycle at end of scanline,
                    //for next scanline:
                    this.curX = 1;
                    this.dummyCycleToggle = !this.dummyCycleToggle;

                }
                break;
                
            case 20:
                //Clear VBlank flag:
                this.setStatusFlag(7,false);

                //Clear Sprite #0 hit flag:
                this.setStatusFlag(6,false);
                this.hitSpr0 = false;
                this.spr0HitX = -1;
                this.spr0HitY = -1;

                if (this.f_bgVisibility == 1 || this.f_spVisibility==1) {

                    //Update counters:
                    this.cntFV = this.regFV;
                    this.cntV = this.regV;
                    this.cntH = this.regH;
                    this.cntVT = this.regVT;
                    this.cntHT = this.regHT;

                    if (this.f_bgVisibility==1) {
                        //Render dummy scanline:
                        this.renderBgScanline(this.buffer,0);
                    }   

                }

                if (this.f_bgVisibility==1 && this.f_spVisibility==1) {

                    //Check sprite 0 hit for first scanline:
                    this.checkSprite0(0);

                }

                if (this.f_bgVisibility==1 || this.f_spVisibility==1) {
                    //Clock mapper IRQ Counter:
                    nes.mmc.clockIrqCounter();
                }
                break;
                
            case 261:
                //Dead scanline, no rendering.
                //Set VINT:
                this.setStatusFlag(7,true);
                this.requestEndFrame = true;
                this.nmiCounter = 9;

                //Reset the scanline counter, will be incremented to 0.
                this.scanline = -1;

                break;

            default:
                if(this.scanline >= 21 && this.scanline <= 260){

                    //Render normally:
                    if (this.f_bgVisibility == 1) {

                        //update scroll:
                        this.cntHT = this.regHT;
                        this.cntH = this.regH;
                        this.renderBgScanline(this.bgbuffer,this.scanline+1-21);

                        //Check for sprite 0 (next scanline):
                        if(!this.hitSpr0 && this.f_spVisibility == 1){
                            if(this.sprX[0] >= -7 && this.sprX[0] < 256 && this.sprY[0] + 1 <= (this.scanline - 20) && (this.sprY[0] + 1 + (this.f_spriteSize === 0 ? 8 : 16)) >= (this.scanline - 20)){
                                if(this.checkSprite0(this.scanline - 20)){
                                    this.hitSpr0 = true;
                                }
                            }
                        }

                    }

                    if(this.f_bgVisibility==1 || this.f_spVisibility==1){
                        //Clock mapper IRQ Counter:
                        nes.mmc.clockIrqCounter();
                    }

                }
        }

        this.scanline++;
        this.regsToAddress();
        this.cntsToAddress();

    },

    startFrame:function ppu_startFrame(){

        //Set the default bg color to black.
        var bgColor = 0;

        //Check if monochrome.
        if(this.f_dispType === 0){
            //No, use first entry of image palette as bg color.
            bgColor = this.imgPalette[0];
        }
        else{
            //Yes, color emphasis determines the bg color.
            switch(this.f_color){
                case 1:
                    //Green
                    bgColor = 0x00FF00;
                    break;
                case 2:
                    //Blue
                    bgColor = 0xFF0000;
                    break;
                case 4:
                    //Red
                    bgColor = 0x0000FF;
                    break;
            }
        }

        //Loop through each pixel.
        for(var i=0;i<61440;i++){
            //Set the bg color.
            this.buffer[i] = bgColor;
            //???
            this.pixrendered[i] = 65;
        }

    },

    writeRegister:function(address,value){
        switch(address&7){

            //Write 0x2000, PPU Control Register
            case 0:
                nes.cpu.mem[0x2000] = value;
                nes.ppu.setControlRegister(value);
                break;

            //Write 0x2001, PPU Masking Register
            case 1:
                nes.cpu.mem[0x2001] = value;
                nes.ppu.setMaskingRegister(value);
                break;

            //Write 0x2003, Sprite RAM Address
            case 3:
                this.sramAddress = value;
                break;

            //Write 0x2004, Sprite RAM
            //Writes to the sprite RAM at the address set to 0x2003, increments the address afterwards.
            case 4:
                this.spriteMem[this.sramAddress] = value;
                this.spriteRamWriteUpdate(this.sramAddress,value);
                this.sramAddress++;
                this.sramAddress %= 0x100;
                break;

            //Write 0x2005, Screen Scroll Offsets
            //First write sets the horizontal scrolling, the second vertical scrolling.
            case 5:
                this.triggerRendering();
                if(this.firstWrite){
                    this.regHT = (value>>3)&31;
                    this.regFH = value&7;
                    this.firstWrite = false;
                }
                else{
                    this.regFV = value&7;
                    this.regVT = (value>>3)&31;
                    this.firstWrite = true;
                }
                break;

            //Write 0x2006, VRAM Address
            //Sets the adress used when reading/writing from/to VRAM.
            //The first write sets the high byte, the second the low byte.
            case 6:
                if(this.firstWrite){
                    this.regFV = (value>>4)&3;
                    this.regV = (value>>3)&1;
                    this.regH = (value>>2)&1;
                    this.regVT = (this.regVT&7) | ((value&3)<<3);
                    this.firstWrite = false;
                }
                else{
                    this.triggerRendering();
                    this.regVT = (this.regVT&24) | ((value>>5)&7);
                    this.regHT = value&31;
                    this.cntFV = this.regFV;
                    this.cntV = this.regV;
                    this.cntH = this.regH;
                    this.cntVT = this.regVT;
                    this.cntHT = this.regHT;
                    this.checkSprite0(this.scanline-20);
                    this.firstWrite = true;
                }
                //Invoke mapper latch.
                this.cntsToAddress();
                if(this.vramAddress < 0x2000){
                    nes.mmc.latchAccess(this.vramAddress);
                }
                break;

            //Write 0x2007, VRAM
            case 7:
                //???
                this.triggerRendering();
                //???
                this.cntsToAddress();
                this.regsToAddress();
                //???
                if(this.vramAddress >= 0x2000){
                    //Mirroring is used.
                    this.mirroredWrite(this.vramAddress,value);
                }
                else{
                    //Write normally.
                    this.writeMem(this.vramAddress,value);
                    //Invoke mapper latch.
                    nes.mmc.latchAccess(this.vramAddress);
                }
                //Increment by either 1 or 32, depending on d2 of Control Register
                this.vramAddress += (this.f_addrInc==1?32:1);
                //???
                this.regsFromAddress();
                this.cntsFromAddress();
                break;

        }
    },

    setControlRegister:function ppu_setControlRegister(value){
        //???
        this.triggerRendering();
        //Set the flags from the value.
        this.f_nmiOnVblank = (value>>7)&1;
        this.f_spriteSize = (value>>5)&1;
        this.f_bgPatternTable = (value>>4)&1;
        this.f_spPatternTable = (value>>3)&1;
        this.f_addrInc = (value>>2)&1;
        this.f_nTblAddress = value&3;
        //???
        this.regV = (value>>1)&1;
        this.regH = value&1;
        this.regS = (value>>4)&1;
    },

    setMaskingRegister:function ppu_setMaskingRegister(value){
        //???
        this.triggerRendering();
        //Set the flags from the value.
        this.f_color = (value>>5)&7;
        this.f_spVisibility = (value>>4)&1;
        this.f_bgVisibility = (value>>3)&1;
        this.f_spClipping = (value>>2)&1;
        this.f_bgClipping = (value>>1)&1;
        this.f_dispType = value&1;
        //Set the color emphasis if the display type is monochrome.
        if(this.f_dispType === 0){
            this.palTable.setEmphasis(this.f_color);
        }
        //Update the image and sprite color palettes.
        this.updatePalettes();
    },

    setStatusFlag:function(flag,value){
        nes.cpu.mem[0x2002] = (nes.cpu.mem[0x2002]&(255-(1<<flag)))|(value?(1<<flag):0);
    },

    //CPU Register $2002:
    //Read the Status Register.
    readStatusRegister:function(){
        //Get the value from memory.
        var tmp = nes.cpu.mem[0x2002];
        //Reset scroll & VRAM Address toggle:
        this.firstWrite = true;
        //Clear VBlank flag:
        this.setStatusFlag(7,false);
        //Fetch status data:
        return tmp;
    },

    //CPU Register $2007(R):
    //Read from PPU memory. The address should be set first.
    vramLoad:function(){
        //???
        this.cntsToAddress();
        this.regsToAddress();
        //If address is in range 0x0000-0x3EFF, return buffered values:
        if(this.vramAddress <= 0x3EFF){
            //Get the value from the previous read?
            var tmp = this.vramBufferedReadValue;
            //Update buffered value:
            if(this.vramAddress < 0x2000){
                //Not mirrored, get normally.
                this.vramBufferedReadValue = this.vramMem[this.vramAddress];
                //Mapper latch access
                nes.mmc.latchAccess(this.vramAddress);
            }
            else{
                //Mirrored, take into account the mirror table.
                this.vramBufferedReadValue = this.vramMem[this.vramMirrorTable[this.vramAddress]];
            }
        }
        else{
            //No buffering in this mem range, read normally.
            var tmp = this.vramMem[this.vramMirrorTable[this.vramAddress]];
        }
        //Increment by either 1 or 32, depending on d2 of Control Register 1:
        this.vramAddress += (this.f_addrInc === 1?32:1);
        //???
        this.cntsFromAddress();
        this.regsFromAddress();
        //Return the value.
        return tmp;
    },

    //Updates the scroll registers from a new VRAM address.
    regsFromAddress:function(){

        var address = (this.vramTmpAddress>>8)&0xFF;
        this.regFV = (address>>4)&7;
        this.regV = (address>>3)&1;
        this.regH = (address>>2)&1;
        this.regVT = (this.regVT&7) | ((address&3)<<3);

        address = this.vramTmpAddress&0xFF;
        this.regVT = (this.regVT&24) | ((address>>5)&7);
        this.regHT = address&31;
    },

    //Updates the scroll registers from a new VRAM address.
    cntsFromAddress:function(){

        var address = (this.vramAddress>>8)&0xFF;
        this.cntFV = (address>>4)&3;
        this.cntV = (address>>3)&1;
        this.cntH = (address>>2)&1;
        this.cntVT = (this.cntVT&7) | ((address&3)<<3);

        address = this.vramAddress&0xFF;
        this.cntVT = (this.cntVT&24) | ((address>>5)&7);
        this.cntHT = address&31;

    },

    //Converts the registers to a temporary vram address?
    regsToAddress:function(){
        this.vramTmpAddress = (((((this.regFV&7)<<4)|((this.regV&1)<<3)|((this.regH&1)<<2)|((this.regVT>>3)&3))<<8)|(((this.regVT&7)<<5)|(this.regHT&31)))&0x7FFF;
    },

    //Converts the counters to the vram address?
    cntsToAddress:function(){
        this.vramAddress = (((((this.cntFV&7)<<4)|((this.cntV&1)<<3)|((this.cntH&1)<<2)|((this.cntVT>>3)&3))<<8)|(((this.cntVT&7)<<5)|(this.cntHT&31)))&0x7FFF;
    },

    incTileCounter:function(count){
        for(var i=count;i!==0;i--){
            this.cntHT++;
            if(this.cntHT === 32){
                this.cntHT = 0;
                this.cntVT++;
                if (this.cntVT >= 30){
                    this.cntH++;
                    if(this.cntH === 2){
                        this.cntH = 0;
                        this.cntV++;
                        if(this.cntV === 2){
                            this.cntV = 0;
                            this.cntFV++;
                            this.cntFV &= 0x7;
                        }
                    }
                }
            }
        }
    },

    //Writes to memory, taking into account mirroring/mapping of address ranges.
    mirroredWrite:function(address,value){
        if(address >= 0x3f00 && address < 0x3f20){
            //Palette write mirroring.
            if(address === 0x3F00 || address === 0x3F10){
                this.writeMem(0x3F00,value);
                this.writeMem(0x3F10,value);
            }
            else if(address === 0x3F04 || address === 0x3F14){
                this.writeMem(0x3F04,value);
                this.writeMem(0x3F14,value);
            }
            else if(address === 0x3F08 || address === 0x3F18){
                this.writeMem(0x3F08,value);
                this.writeMem(0x3F18,value);
            }
            else if(address === 0x3F0C || address === 0x3F1C){
                this.writeMem(0x3F0C,value);
                this.writeMem(0x3F1C,value);
            }
            else{
                this.writeMem(address,value);
            }
        }
        else{
            //Use lookup table for mirrored address:
            if(address < this.vramMirrorTable.length){
                this.writeMem(this.vramMirrorTable[address],value);
            }
            else{
                //FIXME
                //alert("Invalid VRAM address: "+address.toString(16));
            }
        }
    },
    
    triggerRendering:function(){
        //Check if this is a valid scanline.
        if(this.scanline >= 21 && this.scanline <= 260){
            //Render sprites, and combine.
            this.renderFramePartially(this.lastRenderedScanline+1,this.scanline-21-this.lastRenderedScanline);
            //Set last rendered scanline.
            this.lastRenderedScanline = this.scanline-21;
        }
    },
    
    renderFramePartially:function(startScan, scanCount){
        //Check if the sprites are visible.
        if(this.f_spVisibility === 1){
            this.renderSpritesPartially(startScan,scanCount,true);
        }
        //Check if the bg is visible.
        if(this.f_bgVisibility === 1){
            var endIndex = Math.min((startScan+scanCount)<<8,0xF000);
            for(var destIndex=startScan<<8;destIndex<endIndex;destIndex++){
                if(this.pixrendered[destIndex] > 0xFF){
                    this.buffer[destIndex] = this.bgbuffer[destIndex];
                }
            }
        }
        //Check if the sprites are visible.
        if(this.f_spVisibility === 1){
            this.renderSpritesPartially(startScan,scanCount,false);
        }
        //Invalidate the tile data.
        this.validTileData = false;
    },

    renderBgScanline:function(buffer,scan){
        var baseTile = this.regS*256;
        var destIndex = (scan<<8)-this.regFH;
        this.curNt = this.ntable1[this.cntV+this.cntV+this.cntH];
        this.cntHT = this.regHT;
        this.cntH = this.regH;
        this.curNt = this.ntable1[this.cntV+this.cntV+this.cntH];
        if(scan < 240 && (scan-this.cntFV) >= 0){
            var tscanoffset = this.cntFV<<3;
            for(var tile=0;tile<32;tile++){
                if(scan >= 0){
                    //Fetch tile & attrib data:
                    if(this.validTileData){
                        //Get data from array:
                        var t = this.scantile[tile];
                        var tpix = t.pix;
                        var att = this.attrib[tile];
                    }
                    else{
                        //Fetch data:
                        var t = this.ptTile[baseTile+this.nameTable[this.curNt].getTileIndex(this.cntHT,this.cntVT)];
                        var tpix = t.pix;
                        var att = this.nameTable[this.curNt].getAttrib(this.cntHT,this.cntVT);
                        this.scantile[tile] = t;
                        this.attrib[tile] = att;
                    }
                    //Render tile scanline:
                    var sx = 0;
                    var x = (tile<<3)-this.regFH;
                    if(x>-8){
                        if(x<0){
                            destIndex -= x;
                            sx = -x;
                        }
                        if(t.opaque[this.cntFV]){
                            for(;sx<8;sx++){
                                this.buffer[destIndex] = this.imgPalette[tpix[tscanoffset+sx]+att];
                                this.pixrendered[destIndex] |= 256;
                                destIndex++;
                            }
                        }
                        else{
                            for(;sx<8;sx++){
                                var col = tpix[tscanoffset+sx];
                                if(col !== 0) {
                                    buffer[destIndex] = this.imgPalette[col+att];
                                    this.pixrendered[destIndex] |= 256;
                                }
                                destIndex++;
                            }
                        }
                    }
                }
                //Increase Horizontal Tile Counter:
                if(++this.cntHT === 32){
                    this.cntHT = 0;
                    this.cntH++;
                    this.cntH %= 2;
                    this.curNt = this.ntable1[(this.cntV<<1)+this.cntH];
                }
            }
            //Tile data for one row should now have been fetched, so the data in the array is valid.
            this.validTileData = true;
        }
        //update vertical scroll:
        this.cntFV++;
        if(this.cntFV === 8){
            this.cntFV = 0;
            this.cntVT++;
            if(this.cntVT === 30){
                this.cntVT = 0;
                this.cntV++;
                this.cntV%=2;
                this.curNt = this.ntable1[(this.cntV<<1)+this.cntH];
            }
            else if(this.cntVT === 32){
                this.cntVT = 0;
            }
            //Invalidate tile data.
            this.validTileData = false;
        }
    },

    renderSpritesPartially:function(startscan,scancount,bgPri){
        //Check if the sprites are visible.
        if(this.f_spVisibility === 1){
            //Check the sprite size.
            if(this.f_spriteSize === 0){
                //8x8 Sprites
                for(var i=0;i<64;i++){
                    //???
                    if(this.bgPriority[i] === bgPri && this.sprX[i]>=0 && this.sprX[i]<256 && this.sprY[i]+8 >= startscan && this.sprY[i]<startscan+scancount){
                        //???
                        if(this.sprY[i]<startscan){
                            this.srcy1 = startscan - this.sprY[i]-1;
                        }
                        else{
                            this.srcy1 = 0;
                        }
                        //???
                        if(this.sprY[i]+8 > startscan+scancount){
                            this.srcy2 = startscan+scancount-this.sprY[i]+1;
                        }
                        else{
                            this.srcy2 = 8;
                        }
                        //???
                        if(this.f_spPatternTable === 0){
                            this.ptTile[this.sprTile[i]].render(0,this.srcy1,8,this.srcy2,this.sprX[i],this.sprY[i]+1,this.sprCol[i],this.horiFlip[i],this.vertFlip[i],i);
                        }
                        else{
                            this.ptTile[this.sprTile[i]+256].render(0,this.srcy1,8,this.srcy2,this.sprX[i],this.sprY[i]+1,this.sprCol[i],this.horiFlip[i],this.vertFlip[i],i);
                        }
                    }
                }
            }
            else{
                //8x16 Sprites
                for(var i=0;i<64;i++){
                    //???
                    if(this.bgPriority[i] === bgPri && this.sprX[i]>=0 && this.sprX[i]<256 && this.sprY[i]+8 >= startscan && this.sprY[i]<startscan+scancount){
                        //???
                        var top = this.sprTile[i];
                        if((top&1) !== 0){
                            top = this.sprTile[i]-1+256;
                        }
                        //???
                        if(this.sprY[i]<startscan){
                            var srcy1 = startscan - this.sprY[i]-1;
                        }
                        else{
                            var srcy1 = 0;
                        }
                        //???
                        if(this.sprY[i]+8 > startscan+scancount){
                            var srcy2 = startscan+scancount-this.sprY[i];
                        }
                        else{
                            var srcy2 = 8;
                        }
                        //???
                        this.ptTile[top+(this.vertFlip[i]?1:0)].render(0,srcy1,8,srcy2,this.sprX[i],this.sprY[i]+1,this.sprCol[i],this.horiFlip[i],this.vertFlip[i],i);
                        //???
                        if(this.sprY[i]+8 < startscan){
                            var srcy1 = startscan - (this.sprY[i]+8+1);
                        }
                        else{
                            var srcy1 = 0;
                        }
                        //???
                        if(this.sprY[i]+16 > startscan+scancount){
                            var srcy2 = startscan+scancount-(this.sprY[i]+8);
                        }
                        else{
                            var srcy2 = 8;
                        }
                        //???
                        this.ptTile[top+(this.vertFlip[i]?0:1)].render(0,srcy1,8,srcy2,this.sprX[i],this.sprY[i]+1+8,this.sprCol[i],this.horiFlip[i],this.vertFlip[i],i);
                    }
                }
            }
        }
    },

    checkSprite0:function(scan){
        //???
        this.spr0HitX = -1;
        this.spr0HitY = -1;
        //???
        var tIndexAdd = this.f_spPatternTable*256;
        //???
        x = this.sprX[0];
        y = this.sprY[0]+1;
        //Check if sprite size is 8x8.
        if(this.f_spriteSize === 0){
            //Check if its in range.
            if(y <= scan && y+8 > scan && x >= -7 && x < 256){
                //Sprite is in range.
                //Draw scanline:
                var t = this.ptTile[this.sprTile[0]+tIndexAdd];
                var col = this.sprCol[0];
                var bgPri = this.bgPriority[0];
                if(this.vertFlip[0]){
                    var toffset = 7-(scan-y);
                }
                else{
                    var toffset = scan-y;
                }
                toffset *= 8;
                var bufferIndex = scan*256+x;
                if(this.horiFlip[0]){
                    for(var i=7;i>=0;i--){
                        if(x >= 0 && x < 256){
                            if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixrendered[bufferIndex] !== 0){
                                if(t.pix[toffset+i] !== 0){
                                    this.spr0HitX = bufferIndex%256;
                                    this.spr0HitY = scan;
                                    return true;
                                }
                            }
                        }
                        x++;
                        bufferIndex++;
                    }
                }
                else{
                    for(var i=0;i<8;i++){
                        if(x >= 0 && x < 256){
                            if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixrendered[bufferIndex] !== 0){
                                if(t.pix[toffset+i] !== 0){
                                    this.spr0HitX = bufferIndex%256;
                                    this.spr0HitY = scan;
                                    return true;
                                }
                            }
                        }
                        x++;
                        bufferIndex++;
                    }
                }
            }
        }
        //Else 8x16 sprite, check if its in range.
        else if(y <= scan && y+16 > scan && x >= -7 && x < 256){
            //Draw scanline.
            if(this.vertFlip[0]){
                var toffset = 15-(scan-y);
            }
            else{
                var toffset = scan-y;
            }
            if(toffset<8){
                //First half of sprite.
                var t = this.ptTile[this.sprTile[0]+(this.vertFlip[0]?1:0)+((this.sprTile[0]&1)!==0?255:0)];
            }
            else{
                //Second half of sprite.
                var t = this.ptTile[this.sprTile[0]+(this.vertFlip[0]?0:1)+((this.sprTile[0]&1)!==0?255:0)];
                if(this.vertFlip[0]){
                    toffset = 15-toffset;
                }
                else{
                    toffset -= 8;
                }
            }
            toffset *= 8;
            var col = this.sprCol[0];
            var bgPri = this.bgPriority[0];
            var bufferIndex = scan*256+x;
            if(this.horiFlip[0]){
                for(var i=7;i>=0;i--){
                    if(x>=0 && x<256){
                        if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixrendered[bufferIndex] !== 0){
                            if(t.pix[toffset+i] !== 0){
                                this.spr0HitX = bufferIndex%256;
                                this.spr0HitY = scan;
                                return true;
                            }
                        }
                    }
                    x++;
                    bufferIndex++;
                }
            }
            else{
                for(var i=0;i<8;i++){
                    if(x>=0 && x<256){
                        if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixrendered[bufferIndex] !== 0){
                            if(t.pix[toffset+i] !== 0){
                                this.spr0HitX = bufferIndex%256;
                                this.spr0HitY = scan;
                                return true;
                            }
                        }
                    }
                    x++;
                    bufferIndex++;
                }
            }
        }
        return false;
    },

    writeMem:function(address,value){
        //Write to the vram.
        this.vramMem[address] = value;
        //Update internally buffered data.
        if (address < 0x2000){
            this.vramMem[address] = value;
            this.patternWrite(address,value);
        }
        else if(address < 0x23c0){
            this.nameTableWrite(this.ntable1[0],address-0x2000,value);
        }
        else if(address < 0x2400){
            this.attribTableWrite(this.ntable1[0],address-0x23c0,value);
        }
        else if(address < 0x27c0){
            this.nameTableWrite(this.ntable1[1],address-0x2400,value);
        }
        else if(address < 0x2800){
            this.attribTableWrite(this.ntable1[1],address-0x27c0,value);
        }
        else if(address < 0x2bc0){
            this.nameTableWrite(this.ntable1[2],address-0x2800,value);
        }
        else if(address < 0x2c00){
            this.attribTableWrite(this.ntable1[2],address-0x2bc0,value);
        }
        else if(address < 0x2fc0){
            this.nameTableWrite(this.ntable1[3],address-0x2c00,value);
        }
        else if(address < 0x3000){
            this.attribTableWrite(this.ntable1[3],address-0x2fc0,value);
        }
        else if(address >= 0x3f00 && address < 0x3f20){
            this.updatePalettes();
        }
    },

    updatePalettes:function(){
        //Updates the image and sprite palettes from 0x3f00 to 0x3f20.
        for(var i=0;i<16;i++){
            if(this.f_dispType === 0){
                this.imgPalette[i] = this.palTable.getEntry(this.vramMem[0x3f00+i]&63);
                this.sprPalette[i] = this.palTable.getEntry(this.vramMem[0x3f10+i]&63);
            }
            else{
                this.imgPalette[i] = this.palTable.getEntry(this.vramMem[0x3f00+i]&32);
                this.sprPalette[i] = this.palTable.getEntry(this.vramMem[0x3f10+i]&32);
            }
        }
    },

    //Updates the internal pattern table buffers with this new byte.
    patternWrite:function(address,value){
        var tileIndex = parseInt(address/16,10);
        var leftOver = address%16;
        if(leftOver < 8){
            this.ptTile[tileIndex].setScanline(leftOver,value,this.vramMem[address+8]);
        }
        else{
            this.ptTile[tileIndex].setScanline(leftOver-8,this.vramMem[address-8],value);
        }
    },

    //Updates the internal name table buffers with this new byte.
    nameTableWrite:function(index,address,value){
        //???
        this.nameTable[index].tile[address] = value;
        //Update sprite 0 hit.
        this.checkSprite0(this.scanline-20);
    },

    //Updates the internal pattern table buffers with this new attribute table byte.
    attribTableWrite:function(index,address,value){
        this.nameTable[index].writeAttrib(address,value);
    },

    //Updates the internally buffered sprite data with this new byte of info.
    spriteRamWriteUpdate:function(address,value){
        var tIndex = parseInt(address/4,10);
        address %= 4;
        if(tIndex === 0){
            //updateSpr0Hit();
            this.checkSprite0(this.scanline-20);
        }
        if(address === 0){
            //Y coordinate
            this.sprY[tIndex] = value;
        }
        else if(address === 1){
            //Tile index
            this.sprTile[tIndex] = value;
        }
        else if(address === 2){
            //Attributes
            this.vertFlip[tIndex] = (value&0x80) !== 0;
            this.horiFlip[tIndex] = (value&0x40) !== 0;
            this.bgPriority[tIndex] = (value&0x20) !== 0;
            this.sprCol[tIndex] = (value&3)<<2;
        }
        else if(address === 3){
            //X coordinate
            this.sprX[tIndex] = value;
        }
    },

};

//================
//== Name Table ==
//================

JSNES.PPU.NameTable = function(width,height){

    this.width = width;
    this.height = height;

    this.tile = new Array(width*height);
    this.attrib = new Array(width*height);

};

JSNES.PPU.NameTable.prototype = {

    getTileIndex:function(x,y){
        //???
        return this.tile[y*this.width+x];
    },

    getAttrib:function(x,y){
        //???
        return this.attrib[y*this.width+x];
    },

    writeAttrib:function(index,value){
        //???
        var basex = (index%8)*4;
        var basey = parseInt(index/8,10)*4;
        //???
        for(var sqy=0;sqy<2;sqy++){
            for(var sqx=0;sqx<2;sqx++){
                var add = (value>>(2*(sqy*2+sqx)))&3;
                for(var y=0;y<2;y++){
                    for(var x=0;x<2;x++){
                        var tx = basex+sqx*2+x;
                        var ty = basey+sqy*2+y;
                        var attindex = ty*this.width+tx;
                        this.attrib[ty*this.width+tx] = (add<<2)&12;
                    }
                }
            }
        }

    },

};

//===================
//== Color Palette ==
//===================

JSNES.PPU.PaletteTable = function(){
    this.curTable = new Array(64);
    this.emphTable = new Array(8);
    this.currentEmph = -1;
};

JSNES.PPU.PaletteTable.prototype = {

    reset:function(){
        this.setEmphasis(0);
    },

    loadNTSCPalette:function(){
        this.curTable = [0x525252,0xB40000,0xA00000,0xB1003D,0x740069,0x00005B,0x00005F,0x001840,0x002F10,0x084A08,0x006700,0x124200,0x6D2800,0x000000,0x000000,0x000000,0xC4D5E7,0xFF4000,0xDC0E22,0xFF476B,0xD7009F,0x680AD7,0x0019BC,0x0054B1,0x006A5B,0x008C03,0x00AB00,0x2C8800,0xA47200,0x000000,0x000000,0x000000,0xF8F8F8,0xFFAB3C,0xFF7981,0xFF5BC5,0xFF48F2,0xDF49FF,0x476DFF,0x00B4F7,0x00E0FF,0x00E375,0x03F42B,0x78B82E,0xE5E218,0x787878,0x000000,0x000000,0xFFFFFF,0xFFF2BE,0xF8B8B8,0xF8B8D8,0xFFB6FF,0xFFC3FF,0xC7D1FF,0x9ADAFF,0x88EDF8,0x83FFDD,0xB8F8B8,0xF5F8AC,0xFFFFB0,0xF8D8F8,0x000000,0x000000];
        this.makeTables();
        this.setEmphasis(0);
    },

    loadPALPalette:function(){
        this.curTable = [0x525252,0xB40000,0xA00000,0xB1003D,0x740069,0x00005B,0x00005F,0x001840,0x002F10,0x084A08,0x006700,0x124200,0x6D2800,0x000000,0x000000,0x000000,0xC4D5E7,0xFF4000,0xDC0E22,0xFF476B,0xD7009F,0x680AD7,0x0019BC,0x0054B1,0x006A5B,0x008C03,0x00AB00,0x2C8800,0xA47200,0x000000,0x000000,0x000000,0xF8F8F8,0xFFAB3C,0xFF7981,0xFF5BC5,0xFF48F2,0xDF49FF,0x476DFF,0x00B4F7,0x00E0FF,0x00E375,0x03F42B,0x78B82E,0xE5E218,0x787878,0x000000,0x000000,0xFFFFFF,0xFFF2BE,0xF8B8B8,0xF8B8D8,0xFFB6FF,0xFFC3FF,0xC7D1FF,0x9ADAFF,0x88EDF8,0x83FFDD,0xB8F8B8,0xF5F8AC,0xFFFFB0,0xF8D8F8,0x000000,0x000000];
        this.makeTables();
        this.setEmphasis(0);
    },

    makeTables:function(){

        //Calculate a table for each possible emphasis setting:
        for(var emph=0;emph<8;emph++){

            //Determine color component factors:
            var rFactor=1.0, gFactor=1.0, bFactor=1.0;

            if((emph&1) !== 0){
                rFactor = 0.75;
                bFactor = 0.75;
            }

            if((emph&2) !== 0){
                rFactor = 0.75;
                gFactor = 0.75;
            }

            if((emph&4) !== 0){
                gFactor = 0.75;
                bFactor = 0.75;
            }
            
            this.emphTable[emph] = new Array(64);
            
            //Calculate table:
            for(var i=0;i<64;i++){
                var col = this.curTable[i];
                var r = parseInt(this.getRed(col)*rFactor,10);
                var g = parseInt(this.getGreen(col)*gFactor,10);
                var b = parseInt(this.getBlue(col)*bFactor,10);
                this.emphTable[emph][i] = this.getRgb(r,g,b);
            }
        }
    },

    setEmphasis:function(emph){
        if (emph != this.currentEmph) {
            this.currentEmph = emph;
            for (var i=0;i<64;i++) {
                this.curTable[i] = this.emphTable[emph][i];
            }
        }
    },

    getEntry:function(color){
        return this.curTable[color];
    },

    getRed:function(rgb){
        return (rgb>>16)&0xFF;
    },

    getGreen:function(rgb){
        return (rgb>>8)&0xFF;
    },

    getBlue:function(rgb){
        return rgb&0xFF;
    },

    getRgb:function(r,g,b){
        return ((r<<16)|(g<<8)|(b));
    },

    loadDefaultPalette:function(){
        this.curTable[ 0] = this.getRgb(117,117,117);
        this.curTable[ 1] = this.getRgb( 39, 27,143);
        this.curTable[ 2] = this.getRgb(  0,  0,171);
        this.curTable[ 3] = this.getRgb( 71,  0,159);
        this.curTable[ 4] = this.getRgb(143,  0,119);
        this.curTable[ 5] = this.getRgb(171,  0, 19);
        this.curTable[ 6] = this.getRgb(167,  0,  0);
        this.curTable[ 7] = this.getRgb(127, 11,  0);
        this.curTable[ 8] = this.getRgb( 67, 47,  0);
        this.curTable[ 9] = this.getRgb(  0, 71,  0);
        this.curTable[10] = this.getRgb(  0, 81,  0);
        this.curTable[11] = this.getRgb(  0, 63, 23);
        this.curTable[12] = this.getRgb( 27, 63, 95);
        this.curTable[13] = this.getRgb(  0,  0,  0);
        this.curTable[14] = this.getRgb(  0,  0,  0);
        this.curTable[15] = this.getRgb(  0,  0,  0);
        this.curTable[16] = this.getRgb(188,188,188);
        this.curTable[17] = this.getRgb(  0,115,239);
        this.curTable[18] = this.getRgb( 35, 59,239);
        this.curTable[19] = this.getRgb(131,  0,243);
        this.curTable[20] = this.getRgb(191,  0,191);
        this.curTable[21] = this.getRgb(231,  0, 91);
        this.curTable[22] = this.getRgb(219, 43,  0);
        this.curTable[23] = this.getRgb(203, 79, 15);
        this.curTable[24] = this.getRgb(139,115,  0);
        this.curTable[25] = this.getRgb(  0,151,  0);
        this.curTable[26] = this.getRgb(  0,171,  0);
        this.curTable[27] = this.getRgb(  0,147, 59);
        this.curTable[28] = this.getRgb(  0,131,139);
        this.curTable[29] = this.getRgb(  0,  0,  0);
        this.curTable[30] = this.getRgb(  0,  0,  0);
        this.curTable[31] = this.getRgb(  0,  0,  0);
        this.curTable[32] = this.getRgb(255,255,255);
        this.curTable[33] = this.getRgb( 63,191,255);
        this.curTable[34] = this.getRgb( 95,151,255);
        this.curTable[35] = this.getRgb(167,139,253);
        this.curTable[36] = this.getRgb(247,123,255);
        this.curTable[37] = this.getRgb(255,119,183);
        this.curTable[38] = this.getRgb(255,119, 99);
        this.curTable[39] = this.getRgb(255,155, 59);
        this.curTable[40] = this.getRgb(243,191, 63);
        this.curTable[41] = this.getRgb(131,211, 19);
        this.curTable[42] = this.getRgb( 79,223, 75);
        this.curTable[43] = this.getRgb( 88,248,152);
        this.curTable[44] = this.getRgb(  0,235,219);
        this.curTable[45] = this.getRgb(  0,  0,  0);
        this.curTable[46] = this.getRgb(  0,  0,  0);
        this.curTable[47] = this.getRgb(  0,  0,  0);
        this.curTable[48] = this.getRgb(255,255,255);
        this.curTable[49] = this.getRgb(171,231,255);
        this.curTable[50] = this.getRgb(199,215,255);
        this.curTable[51] = this.getRgb(215,203,255);
        this.curTable[52] = this.getRgb(255,199,255);
        this.curTable[53] = this.getRgb(255,199,219);
        this.curTable[54] = this.getRgb(255,191,179);
        this.curTable[55] = this.getRgb(255,219,171);
        this.curTable[56] = this.getRgb(255,231,163);
        this.curTable[57] = this.getRgb(227,255,163);
        this.curTable[58] = this.getRgb(171,243,191);
        this.curTable[59] = this.getRgb(179,255,207);
        this.curTable[60] = this.getRgb(159,255,243);
        this.curTable[61] = this.getRgb(  0,  0,  0);
        this.curTable[62] = this.getRgb(  0,  0,  0);
        this.curTable[63] = this.getRgb(  0,  0,  0);

        this.makeTables();
        this.setEmphasis(0);

    },

};

//==========
//== Tile ==
//==========

Tile = function(){

    //Tile Data
    this.pix = new Array(64);

    this.fbIndex = null;
    this.tIndex = null;
    this.palIndex = null;
    this.tpri = null;
    this.opaque = new Array(8);

};

Tile.prototype = {

    setScanline:function(sline,b1,b2){
        this.tIndex = sline<<3;
        for(var x=0;x<8;x++){
            this.pix[this.tIndex+x] = ((b1>>(7-x))&1)+(((b2>>(7-x))&1)<<1);
            if(this.pix[this.tIndex+x] === 0){
                this.opaque[sline] = false;
            }
        }
    },

    render:function(srcx1,srcy1,srcx2,srcy2,dx,dy,palAdd,flipHorizontal,flipVertical,pri){

        //Check for an invalid position.
        if(dx<-7 || dx>=256 || dy<-7 || dy>=240){
            return;
        }

        //Cache some variables.
        var palette = nes.ppu.sprPalette;
        var priTable = nes.ppu.pixrendered;

        if(dx<0){
            srcx1 -= dx;
        }

        if(dx+srcx2>=256){
            srcx2 = 256-dx;
        }
    
        if(dy<0){
            srcy1 -= dy;
        }

        if(dy+srcy2>=240){
            srcy2 = 240-dy;
        }

        if(flipHorizontal){
            if(flipVertical){

                //Draw the sprite flipped horizontally and vertically.

                this.fbIndex = (dy<<8)+dx;
                this.tIndex = 63;
                for(var y=0;y<8;y++){
                    for(var x=0;x<8;x++){
                        if(x>=srcx1 && x<srcx2 && y>=srcy1 && y<srcy2){
                            this.palIndex = this.pix[this.tIndex];
                            this.tpri = priTable[this.fbIndex];
                            if(this.palIndex!==0 && pri<=(this.tpri&0xFF)){
                                nes.ppu.buffer[this.fbIndex] = palette[this.palIndex+palAdd];
                                this.tpri = (this.tpri&0xF00)|pri;
                                priTable[this.fbIndex] = this.tpri;
                            }
                        }
                        this.fbIndex++;
                        this.tIndex--;
                    }
                    this.fbIndex-=8;
                    this.fbIndex+=256;
                }

            }
            else{

                //Draw the sprite flipped horizontally.

                this.fbIndex = (dy<<8)+dx;
                this.tIndex = 7;
                for(var y=0;y<8;y++){
                    for(var x=0;x<8;x++){
                        if (x>=srcx1 && x<srcx2 && y>=srcy1 && y<srcy2){
                            this.palIndex = this.pix[this.tIndex];
                            this.tpri = priTable[this.fbIndex];
                            if(this.palIndex!==0 && pri<=(this.tpri&0xFF)){
                                nes.ppu.buffer[this.fbIndex] = palette[this.palIndex+palAdd];
                                this.tpri = (this.tpri&0xF00)|pri;
                                priTable[this.fbIndex] = this.tpri;
                            }
                        }
                        this.fbIndex++;
                        this.tIndex--;
                    }
                    this.fbIndex-=8;
                    this.fbIndex+=256;
                    this.tIndex+=16;
                }

            }

        }
        else if(flipVertical){

            //Draw the sprite flipped vertically.

            this.fbIndex = (dy<<8)+dx;
            this.tIndex = 56;
            for(var y=0;y<8;y++){
                for(var x=0;x<8;x++){
                    if(x>=srcx1 && x<srcx2 && y>=srcy1 && y<srcy2){
                        this.palIndex = this.pix[this.tIndex];
                        this.tpri = priTable[this.fbIndex];
                        if (this.palIndex!==0 && pri<=(this.tpri&0xFF)){
                            nes.ppu.buffer[this.fbIndex] = palette[this.palIndex+palAdd];
                            this.tpri = (this.tpri&0xF00)|pri;
                            priTable[this.fbIndex] = this.tpri;
                        }
                    }
                    this.fbIndex++;
                    this.tIndex++;
                }
                this.fbIndex-=8;
                this.fbIndex+=256;
                this.tIndex-=16;
            }

        }
        else{

            //Draw the sprite normally.

            this.fbIndex = (dy<<8)+dx;
            this.tIndex = 0;
            for(var y=0;y<8;y++){
                for(var x=0;x<8;x++){
                    if(x>=srcx1 && x<srcx2 && y>=srcy1 && y<srcy2){
                        this.palIndex = this.pix[this.tIndex];
                        this.tpri = priTable[this.fbIndex];
                        if (this.palIndex!==0 && pri<=(this.tpri&0xFF)){
                            nes.ppu.buffer[this.fbIndex] = palette[this.palIndex+palAdd];
                            this.tpri = (this.tpri&0xF00)|pri;
                            priTable[this.fbIndex] = this.tpri;
                        }
                    }
                    this.fbIndex++;
                    this.tIndex++;
                }
                this.fbIndex-=8;
                this.fbIndex+=256;
            }

        }

    },

};
