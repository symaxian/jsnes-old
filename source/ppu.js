// === === === === === === === === === ==
//== Picture Processing Unit ==
// === === === === === === === === === ==

nes.ppu = {

//Properties

    //VRAM
    vramMem:null,

    //SpriteRAM
    spriteMem:null,

    //VRAM I/O
    vramAddress:null,
    vramTmpAddress:null,
    vramBufferedReadValue:null,

    //VRAM/Scroll High/Low Byte latch
    firstWrite:null,

    //SpriteRAM I/O
    sramAddress:null,

    //Control Register
    f_nmiOnVblank:null,
    f_spriteSize:null,
    f_bgPatternTable:null,
    f_spPatternTable:null,
    f_addrInc:null,
    f_nTblAddress:null,

    //Masking Register
    f_color:null,
    f_spVisibility:null,
    f_bgVisibility:null,
    f_spClipping:null,
    f_bgClipping:null,
    f_dispType:null,

    //Counters
    cntFV:null,
    cntVT:null,
    cntHT:null,
    cntV:null,
    cntH:null,

    //Registers
    regFV:null,
    regV:null,
    regH:null,
    regVT:null,
    regHT:null,
    regFH:null,
    regS:null,

    //Rendering Variables
    attrib:null,
    buffer:null,
    bgbuffer:null,
    pixRendered:null,
    scantile:null,

    //Misc Rendering Variables
    scanline:null,
    lastRenderedScanline:null,
    curX:null,

    mapperIrqCounter:null,
    requestEndFrame:null,
    dummyCycleToggle:null,
    nmiCounter:null,
    validTileData:null,

    //Sprite Data
    sprX:null,
    sprY:null,
    sprTile:null,
    sprCol:null,
    vertFlip:null,
    horiFlip:null,
    bgPriority:null,

    //Sprite 0 Hit Flags
    hitSpr0:null,
    spr0HitX:null,
    spr0HitY:null,

    //Buffered Color Palettes
    sprPalette:null,
    imgPalette:null,

    //Pattern Table Tile Buffers
    ptTile:null,

    //Nametable Buffers
    ntable1:null,
    nameTable:null,

    //VRAM Mirror Table
    vramMirrorTable:null,

    //Rendering Options
    clipToTvSize:true,

//Methods

    reset:function ppu_reset(){

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

        //VRAM I/O
        this.vramAddress = null;
        this.vramTmpAddress = null;
        this.vramBufferedReadValue = 0;

        //VRAM/Scroll High/Low Byte latch
        this.firstWrite = true;

        //SPR-RAM I/O
        this.sramAddress = 0;

        //Control Register
        this.f_nmiOnVblank = 0;    //NMI on VBlank. 0=disable, 1=enable
        this.f_spriteSize = 0;     //Sprite size. 0=8x8, 1=8x16
        this.f_bgPatternTable = 0; //Background Pattern Table address. 0=0x0000,1=0x1000
        this.f_spPatternTable = 0; //Sprite Pattern Table address. 0=0x0000,1=0x1000
        this.f_addrInc = 0;        //PPU Address Increment. 0=1,1=32
        this.f_nTblAddress = 0;    //Name Table Address. 0=0x2000,1=0x2400,2=0x2800,3=0x2C00

        //Masking Register
        this.f_color = 0;          //Color emphasis, bg color in monochrome. 0=black, 1=blue, 2=green, 4=red
        this.f_spVisibility = 0;   //Sprite visibility. 0=not displayed,1=displayed
        this.f_bgVisibility = 0;   //Background visibility. 0=Not Displayed,1=displayed
        this.f_spClipping = 0;     //Sprite clipping. 0=Sprites invisible in left 8-pixel column,1=No clipping
        this.f_bgClipping = 0;     //Background clipping. 0=BG invisible in left 8-pixel column, 1=No clipping
        this.f_dispType = 0;       //Display type. 0=color, 1=monochrome

        //Counters
        this.cntFV = 0;
        this.cntVT = 0;
        this.cntHT = 0;

        this.cntV = 0;
        this.cntH = 0;

        //Registers
        this.regFV = 0;
        this.regV = 0;
        this.regH = 0;
        this.regVT = 0;
        this.regHT = 0;
        this.regFH = 0;
        this.regS = 0;

        //Variables used when rendering.
        this.attrib = new Array(32);
        this.buffer = new Array(61440);
        this.bgbuffer = new Array(61440);
        this.pixRendered = new Array(61440);

        this.mapperIrqCounter = 0;
        this.requestEndFrame = false;
        this.dummyCycleToggle = false;
        this.validTileData = false;
        this.nmiCounter = 0;

        this.scantile = new Array(32);

        //Initialize misc vars.
        this.scanline = 0;
        this.lastRenderedScanline = -1;
        this.curX = 0;

        //Sprite data.
        this.sprX = new Array(64);      //X coordinate
        this.sprY = new Array(64);      //Y coordinate
        this.sprTile = new Array(64);   //Tile Index (into pattern table)
        this.sprCol = new Array(64);    //Upper two bits of color
        this.vertFlip = new Array(64);  //Vertical Flip
        this.horiFlip = new Array(64);  //Horizontal Flip
        this.bgPriority = new Array(64);//Background Priority

        //Sprite 0 hit flags.
        this.hitSpr0 = false;
        this.spr0HitX = 0;
        this.spr0HitY = 0;

        //Buffered color palettes.
        this.sprPalette = new Array(16);
        this.imgPalette = new Array(16);

        //Create pattern table tile buffers.
        this.ptTile = new Array(512);
        for(var i=0;i<512;i++){
            this.ptTile[i] = new Tile();
        }

        //Create nametable buffers.
        //Name table data.
        this.ntable1 = new Array(4);
        this.nameTable = new Array(4);
        for(var i=0;i<4;i++){
            this.nameTable[i] = new this.NameTable(32,32);
        }

        //Initialize mirroring lookup table.
        this.vramMirrorTable = new Array(0x8000);
        for(var i=0;i<0x8000;i++){
            this.vramMirrorTable[i] = i;
        }

        //Set the color palette.
        this.colorPalette.loadNTSCPalette();

        //Reset the control register.
        this.setControlRegister(0);

        //Reset the masking register.
        this.setMaskingRegister(0);

    },

    setMirroring:function ppu_setMirroring(mirroring){

        //???
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
        if(mirroring === 1){
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2400,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2800,0x400);
        }

        //Vertical mirroring
        else if(mirroring === 0){
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

    //Defines a mirrored area in the address lookup table, assuming the regions don't overlap.
    //The 'to' region is the region that is physically in memory.
    defineMirrorRegion:function ppu_defineMirrorRegion(from,to,size){
        for(var i=0;i<size;i++){
            this.vramMirrorTable[from+i] = to+i;
        }
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
            this.pixRendered[i] = 65;

        }

    },

    endFrame:function ppu_endFrame(){

        //Do the non-maskable interrupt.
        nes.cpu.requestInterrupt(1);

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

        //Reset the last rendered scanline counter.
        this.lastRenderedScanline = -1;

    },

    endScanline:function ppu_endScanline(){

        //Check if its a normal scanline.
        if(this.scanline > 20 && this.scanline < 261){
            //Check if the bg is visible.
            if(this.f_bgVisibility === 1){
                //Update scroll.
                this.cntHT = this.regHT;
                this.cntH = this.regH;
                this.renderBgScanline(this.bgbuffer,this.scanline-20);
                //Check for sprite 0 hit on next scanline.
                if(!this.hitSpr0 && this.f_spVisibility === 1){
                    if(this.checkSprite0(this.scanline-20)){
                        this.hitSpr0 = true;
                    }
                }
                //Clock mapper IRQ counter.
                nes.mmc.clockIrqCounter();
            }
            //Else check if the sprites are visible.
            else if(this.f_spVisibility === 1){
                //Clock mapper IRQ counter.
                nes.mmc.clockIrqCounter();
            }
        }

        //Else check if its the dummy scanline.
        else if(this.scanline === 19){
            //May be variable length.
            if(this.dummyCycleToggle){
                //Remove dead cycle at end of scanline, for next scanline.
                this.curX = 1;
                this.dummyCycleToggle = false;
            }
        }

        //Else check if its the first scanline.
        else if(this.scanline === 20){
            //Clear the vertical blank flag.
            nes.cpu.mem[0x2002] &= 127;
            //Clear the sprite 0 hit flags.
            nes.cpu.mem[0x2002] &= 191;
            this.hitSpr0 = false;
            this.spr0HitX = -1;
            this.spr0HitY = -1;
            //Check if either the bg or sprites are visible.
            if(this.f_bgVisibility === 1 || this.f_spVisibility === 1){
                //Update counters from registers.
                this.cntFV = this.regFV;
                this.cntV = this.regV;
                this.cntH = this.regH;
                this.cntVT = this.regVT;
                this.cntHT = this.regHT;
                //Check if the bg is visible.
                if(this.f_bgVisibility === 1){
                    //Render dummy scanline.
                    this.renderBgScanline(this.buffer,0);
                }
                //Check sprite 0 hit on the first scanline.
                this.checkSprite0(0);
                //Clock mapper IRQ Counter.
                nes.mmc.clockIrqCounter();
            }
        }

        //Else check if its the last(dead) scanline.
        else if(this.scanline === 261){
            //Set the vBlank flag.
            nes.cpu.mem[0x2002] |= 128;
            //Set the end frame flag.
            this.requestEndFrame = true;
            //???
            this.nmiCounter = 9;
            //Reset the scanline counter, will be incremented to 0.
            this.scanline = -1;
        }

        //Increment the scanline.
        this.scanline++;

        //???
        this.regsToAddress();
        this.cntsToAddress();

    },

    writeRegister:function(address,value){
        switch(address&7){

            //Write 0x2000, PPU Control Register
            //Sets the Control Register.
            case 0:
                //Set the value into the ram.
                nes.cpu.mem[0x2000] = value;
                //Update the internal buffers.
                nes.ppu.setControlRegister(value);
                break;

            //Write 0x2001, PPU Masking Register
            //Sets the Masking Register.
            case 1:
                //Set the value into the ram.
                nes.cpu.mem[0x2001] = value;
                //Update the internal buffers.
                nes.ppu.setMaskingRegister(value);
                break;

            //Write 0x2003, Sprite RAM Address
            //Sets the address used when accessing sprite RAM.
            case 3:
                //Set the address.
                this.sramAddress = value;
                break;

            //Write 0x2004, Sprite RAM
            //Writes to the sprite RAM at the address set to 0x2003, increments the address afterwards.
            case 4:
                //Write the value to the sprite ram.
                this.writeSpriteMem(this.sramAddress,value);
                //Increment the address.
                this.sramAddress++;
                //Knock it back down below 256.
                this.sramAddress %= 0x100;
                break;

            //Write 0x2005, Screen Scroll Offsets
            //Sets the screen scrolling options?
            case 5:
                //???
                this.triggerRendering();
                //Check if this is the first write.
                if(this.firstWrite){
                    //Yes, set the horizontal scrolling.
                    this.regHT = (value>>3)&31;
                    this.regFH = value&7;
                    this.firstWrite = false;
                }
                else{
                    //No, set the vertical scrolling.
                    this.regFV = value&7;
                    this.regVT = (value>>3)&31;
                    this.firstWrite = true;
                }
                break;

            //Write 0x2006, VRAM Address
            //Sets the address used when accessing VRAM.
            case 6:
                //Check if this is the first write.
                if(this.firstWrite){
                    //Yes, set the high byte.
                    this.regFV = (value>>4)&3;
                    this.regV = (value>>3)&1;
                    this.regH = (value>>2)&1;
                    this.regVT = (this.regVT&7)|((value&3)<<3);
                    this.firstWrite = false;
                }
                else{
                    //No, set the low byte.
                    this.triggerRendering();
                    this.regVT = (this.regVT&24)|((value>>5)&7);
                    this.regHT = value&31;
                    this.cntFV = this.regFV;
                    this.cntV = this.regV;
                    this.cntH = this.regH;
                    this.cntVT = this.regVT;
                    this.cntHT = this.regHT;
                    this.checkSprite0(this.scanline-20);
                    this.firstWrite = true;
                }
                //Set the VRAM address from the counters just set.
                this.cntsToAddress();
                //Invoke mapper latch.
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
                //Increment by either 1 or 32, depending on bit 2 of the control register.
                this.vramAddress += 1+this.f_addrInc*31;
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
            this.colorPalette.setEmphasis(this.f_color);
        }
        //Update the image and sprite color palettes.
        this.updatePalettes();
    },

    //CPU Register $2002:
    //Read the Status Register.
    readStatusRegister:function(){
        //Reset scroll & VRAM Address toggle.
        this.firstWrite = true;
        //Get the value from memory.
        var tmp = nes.cpu.mem[0x2002];
        //Clear the vBlank flag.
        nes.cpu.mem[0x2002] &= 127;
        //Return the status.
        return tmp;
    },

    //CPU Register $2007(R):
    //Read from PPU memory. The address should be set first.
    vramLoad:function(){
        //???
        this.cntsToAddress();
        this.regsToAddress();
        //If address is in range 0x0000-0x3EFF, return buffered values.
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
        //???
        var address = (this.vramTmpAddress>>8)&0xFF;
        this.regFV = (address>>4)&7;
        this.regV = (address>>3)&1;
        this.regH = (address>>2)&1;
        this.regVT = (this.regVT&7) | ((address&3)<<3);
        //???
        var address = this.vramTmpAddress&0xFF;
        this.regVT = (this.regVT&24) | ((address>>5)&7);
        this.regHT = address&31;
    },

    //Updates the scroll registers from a new VRAM address.
    cntsFromAddress:function(){
        //???
        var address = (this.vramAddress>>8)&0xFF;
        this.cntFV = (address>>4)&3;
        this.cntV = (address>>3)&1;
        this.cntH = (address>>2)&1;
        this.cntVT = (this.cntVT&7)|((address&3)<<3);
        //???
        var address = this.vramAddress&0xFF;
        this.cntVT = (this.cntVT&24)|((address>>5)&7);
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

    //Writes to memory, taking into account mirroring/mapping of address ranges.
    mirroredWrite:function(address,value){

        //Check if the write is to the palettes.
        if(address >= 0x3f00 && address < 0x3f20){
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

        //Else check if the write is in the mirror table.
        else if(address < this.vramMirrorTable.length){
            this.writeMem(this.vramMirrorTable[address],value);
        }

    },

    //???
    triggerRendering:function(){
        //Check if this is a visible scanline.
        if(this.scanline > 20 && this.scanline < 261){
            //Render sprites, and combine.
            this.renderFramePartially(this.lastRenderedScanline+1,this.scanline-21-this.lastRenderedScanline);
            //Set last rendered scanline.
            this.lastRenderedScanline = this.scanline-21;
        }
    },

    //???
    renderFramePartially:function(startScan,scanCount){
        //???
        this.renderSpritesPartially(startScan,scanCount,true);
        //Check if the bg is visible.
        if(this.f_bgVisibility === 1){
            //Cache the ending index.
            var endIndex = Math.min((startScan+scanCount)<<8,0xF000);
            //Loop through the specified pixels.
            for(var destIndex=startScan<<8;destIndex<endIndex;destIndex++){
                //???
                if(this.pixRendered[destIndex] > 0xFF){
                    //Set the bg color to the pixel.
                    this.buffer[destIndex] = this.bgbuffer[destIndex];
                }
            }
        }
        //???
        this.renderSpritesPartially(startScan,scanCount,false);
        //Invalidate the tile data.
        this.validTileData = false;
    },

    //???
    renderBgScanline:function(buffer,scanline){
        //???
        var destIndex = (scanline<<8)-this.regFH;
        //???
        this.cntHT = this.regHT;
        this.cntH = this.regH;
        //???
        if(scanline < 240 && (scanline-this.cntFV) >= 0){
            //Cache the curent name table index.
            var curNt = this.ntable1[this.cntV+this.cntV+this.cntH];
            //???
            var tscanoffset = this.cntFV<<3;
            //Loop through the 32 tiles.
            for(var tile=0;tile<32;tile++){
                //Check if the scanline is visible.
                if(scanline >= 0){
                    //Check if the tile and attribute data is not cached.
                    if(!this.validTileData){
                        //If not cache it.
                        this.scantile[tile] = this.ptTile[this.regS*256+this.nameTable[curNt].getTileIndex(this.cntHT,this.cntVT)];
                        this.attrib[tile] = this.nameTable[curNt].getAttrib(this.cntHT,this.cntVT);
                    }
                    //Cache the tile and its attributes.
                    var t = this.scantile[tile];
                    var att = this.attrib[tile];
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
                                this.buffer[destIndex] = this.imgPalette[t.pix[tscanoffset+sx]+att];
                                this.pixRendered[destIndex] |= 256;
                                destIndex++;
                            }
                        }
                        else{
                            for(;sx<8;sx++){
                                var col = t.pix[tscanoffset+sx];
                                if(col !== 0){
                                    buffer[destIndex] = this.imgPalette[col+att];
                                    this.pixRendered[destIndex] |= 256;
                                }
                                destIndex++;
                            }
                        }
                    }
                }
                //Increment the horizontal tile counter.
                this.cntHT++;
                //Check to reset the horizontal tile counter.
                if(this.cntHT === 32){
                    this.cntHT = 0;
                    this.cntH++;
                    this.cntH %= 2;
                }
            }
            //Tile data for one row should now have been fetched, so the data in the array is valid.
            this.validTileData = true;
        }
        //Update vertical scroll.
        this.cntFV++;
        if(this.cntFV === 8){
            this.cntFV = 0;
            this.cntVT++;
            if(this.cntVT === 30){
                this.cntVT = 0;
                this.cntV++;
                this.cntV %= 2;
            }
            else if(this.cntVT === 32){
                this.cntVT = 0;
            }
            //Invalidate tile data.
            this.validTileData = false;
        }
    },

    //???
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

    checkSprite0:function(scanline){
        //Set the sprite collision at an invalid position, remove?
        this.spr0HitX = this.spr0HitY = -1;
        //???
        var x = this.sprX[0];
        var y = this.sprY[0]+1;
        //Check if sprite size is 8x8.
        if(this.f_spriteSize === 0){
            //Check if its in range.
            if(y <= scanline && y+8 > scanline && x >= -7 && x < 256){
                //Sprite is in range, draw the scanline.
                var t = this.ptTile[this.sprTile[0]+this.f_spPatternTable*256];
                var col = this.sprCol[0];
                var bgPri = this.bgPriority[0];
                //Check if vertically flipped.
                if(this.vertFlip[0]){
                    //Yes
                    var toffset = (7-scanline+y)*8;
                }
                else{
                    //No
                    var toffset = (scanline-y)*8;
                }
                //Cache the buffer index.
                var bufferIndex = scanline*256+x;
                //Check if horizontally flipped.
                if(this.horiFlip[0]){
                    //Yes
                    for(var i=7;i>=0;i--){
                        if(x >= 0 && x < 256){
                            if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixRendered[bufferIndex] !== 0){
                                if(t.pix[toffset+i] !== 0){
                                    //Set the hit coordinates and return true.
                                    this.spr0HitX = bufferIndex%256;
                                    this.spr0HitY = scanline;
                                    return true;
                                }
                            }
                        }
                        x++;
                        bufferIndex++;
                    }
                }
                else{
                    //No
                    for(var i=0;i<8;i++){
                        if(x >= 0 && x < 256){
                            if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixRendered[bufferIndex] !== 0){
                                if(t.pix[toffset+i] !== 0){
                                    //Set the hit coordinates and return true.
                                    this.spr0HitX = bufferIndex%256;
                                    this.spr0HitY = scanline;
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
        else if(y <= scanline && y+16 > scanline && x >= -7 && x < 256){
            //Get the relevant tile.
            if(toffset < 8){
                //First half of sprite.
                var t = this.ptTile[this.sprTile[0]+(this.vertFlip[0]?1:0)+((this.sprTile[0]&1) !== 0?255:0)];
                //Check if vertically flipped.
                if(this.vertFlip[0]){
                    //Yes
                    var toffset = 15-scanline+y;
                }
                else{
                    //No
                    var toffset = scanline-y;
                }
            }
            else{
                //Second half of sprite.
                var t = this.ptTile[this.sprTile[0]+(this.vertFlip[0]?0:1)+((this.sprTile[0]&1) !== 0?255:0)];
                //Check if vertically flipped.
                if(this.vertFlip[0]){
                    //Yes
                    var toffset = -scanline+y;
                }
                else{
                    //No
                    var toffset = scanline-y-8;
                }
            }
            //???
            toffset *= 8;
            //Cache the buffer index.
            var bufferIndex = scanline*256+x;
            //Check if horizontally flipped.
            if(this.horiFlip[0]){
                //Yes
                for(var i=7;i>=0;i--){
                    if(x>=0 && x<256){
                        if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixRendered[bufferIndex] !== 0){
                            if(t.pix[toffset+i] !== 0){
                                //Set the hit coordinates and return true.
                                this.spr0HitX = bufferIndex%256;
                                this.spr0HitY = scanline;
                                return true;
                            }
                        }
                    }
                    x++;
                    bufferIndex++;
                }
            }
            else{
                //No
                for(var i=0;i<8;i++){
                    if(x>=0 && x<256){
                        if(bufferIndex >= 0 && bufferIndex < 61440 && this.pixRendered[bufferIndex] !== 0){
                            if(t.pix[toffset+i] !== 0){
                                //Set the hit coordinates and return true.
                                this.spr0HitX = bufferIndex%256;
                                this.spr0HitY = scanline;
                                return true;
                            }
                        }
                    }
                    x++;
                    bufferIndex++;
                }
            }
        }
        //No collisions detected, return false.
        return false;
    },

    writeMem:function(address,value){
        //Write to the vram.
        this.vramMem[address] = value;
        //Update internally buffered data.
        if(address < 0x2000){
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
        //Updates the image and sprite color palettes from 0x3f00 to 0x3f20.
        if(this.f_dispType === 0){
            for(var i=0;i<16;i++){
                this.imgPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f00+i]];
                this.sprPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f10+i]];
            }
        }
        else{
            for(var i=0;i<16;i++){
                this.imgPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f00+i]&48];
                this.sprPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f10+i]&48];
            }
        }
    },

    //Updates the internal pattern table buffers with this new byte.
    patternWrite:function(address,value){
        if(address%16 < 8){
            this.ptTile[parseInt(address/16,10)].setScanline(address%16,value,this.vramMem[address+8]);
        }
        else{
            this.ptTile[parseInt(address/16,10)].setScanline((address%16)-8,this.vramMem[address-8],value);
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
    writeSpriteMem:function(address,value){
        //Write the value into the sprite memory.
        this.spriteMem[address] = value;
        //???
        var tIndex = parseInt(address/4,10);
        //???
        address %= 4;
        //???
        if(tIndex === 0){
            //Check sprite 0 for a hit.
            this.checkSprite0(this.scanline-20);
        }
        //???
        if(address === 0){
            //Y Coordinate
            this.sprY[tIndex] = value;
        }
        else if(address === 1){
            //Tile Index
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
            //X Coordinate
            this.sprX[tIndex] = value;
        }
    },

    // === === === === ===  === =
    //== Color Palette ==
    // === === === === ===  === =

    colorPalette:{

    //Properties

        curTable:[],
        emphTable:[],

    //Methods

        loadNTSCPalette:function nes_ppu_colorPalette_loadNTSCPalette(){

            //Construct the color emphasis tables from these colors.
            this.makeTables([5395026,11796480,10485760,11599933,7602281,91,95,6208,12048,543240,26368,1196544,7153664,0,0,0,12899815,16728064,14421538,16729963,14090399,6818519,6588,21681,27227,35843,43776,2918400,10777088,0,0,0,16316664,16755516,16742785,16735173,16730354,14633471,4681215,46327,57599,58229,259115,7911470,15065624,7895160,0,0,16777215,16773822,16300216,16300248,16758527,16761855,13095423,10148607,8973816,8650717,12122296,16119980,16777136,16308472,0,0]);

            //Set the emphasis to 0, no emphasis.
            this.setEmphasis(0);

        },

        loadDefaultPalette:function nes_ppu_colorPalette_loadDefaultPalette(){

            //Construct the color emphasis tables from these colors.
            this.makeTables([7697781,2562959,171,4653215,9371767,11206675,10944512,8325888,4402944,18176,20736,16151,1785695,0,0,0,12369084,29679,2309103,8585459,12517567,15138907,14363392,13324047,9138944,38656,43776,37691,33675,0,0,0,16777215,4177919,6264831,10980349,16219135,16742327,16742243,16751419,15974207,8639251,5234507,5830808,60379,0,0,0,16777215,11266047,13096959,14142463,16762879,16762843,16760755,16767915,16770979,14942115,11269055,11796431,10485747,0,0,0]);

            //Set the emphasis to 0, no emphasis.
            this.setEmphasis(0);

        },

        makeTables:function nes_ppu_colorPalette_makeTables(palette){

            //Calculate a table for each possible emphasis setting:
            for(var emph=0;emph<8;emph++){

                //Set the color factors to full.
                var rFactor = gFactor = bFactor = 1;

                //Check to "highlight" greens.
                if(emph&1){
                    rFactor = 0.75;
                    bFactor = 0.75;
                }

                //Check to "highlight" blues.
                if(emph&2){
                    rFactor = 0.75;
                    gFactor = 0.75;
                }

                //Check to "highlight" reds.
                if(emph&4){
                    gFactor = 0.75;
                    bFactor = 0.75;
                }

                //Create a new array for the color emphasis.
                this.emphTable[emph] = new Array(64);

                //Calculate the table.
                for(var i=0;i<64;i++){

                    //Cache the color.
                    var color = palette[i];

                    //Add the color with modified rgb values into the emphasis array.
                    this.emphTable[emph][i] = (parseInt(((color>>16)&0xFF)*rFactor,10)<<16) | (parseInt(((color>>8)&0xFF)*gFactor,10)<<8) | parseInt((color&0xFF)*bFactor,10);

                }

            }
        },

        setEmphasis:function nes_ppu_colorPalette_setEmphasis(emph){

            //Set the current color table from the emphasis tables.
            this.curTable = this.emphTable[emph];

        },

    },

};

// === === === === === =
//== Name Table ==
// === === === === === =

nes.ppu.NameTable = function nes_ppu_NameTable(w,h){

    //Save the width of this name table.
    this.w = w;

    //Create the tile and attribute arrays from the width and height.
    this.tile = new Array(w*h);
    this.attrib = new Array(w*h);

};

nes.ppu.NameTable.prototype = {

    getTileIndex:function nes_ppu_NameTable_getTileIndex(x,y){
        //Return the tile at the specified index.
        return this.tile[y*this.w+x];
    },

    getAttrib:function nes_ppu_NameTable_getAttrib(x,y){
        //Return the attribute at the specified index.
        return this.attrib[y*this.w+x];
    },

    writeAttrib:function nes_ppu_NameTable_writeAttrib(index,value){
        //Get the x and y position of the index.
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
                        var attindex = ty*this.w+tx;
                        this.attrib[ty*this.w+tx] = (add<<2)&12;
                    }
                }
            }
        }

    },

};

// === === === =
//== Tile ==
// === === === =

Tile = function Tile(){

    //Pixel Data
    this.pix = new Array(64);
    this.opaque = new Array(8);

};

Tile.prototype = {

    setScanline:function(scanline,b1,b2){
        //???
        var tIndex = scanline<<3;
        //Loop through the 8 pixels on a row.
        for(var x=0;x<8;x++){
            //Set the pixel color/transparency?
            this.pix[tIndex+x] = ((b1>>(7-x))&1)+(((b2>>(7-x))&1)<<1);
            //Check if transparent the pixel is transparent.
            if(this.pix[tIndex+x] === 0){
                //If so, set the scanline as having a transparent pixel.
                this.opaque[scanline] = false;
            }
        }
    },

    render:function(srcx1,srcy1,srcx2,srcy2,dx,dy,palAdd,flipHorizontal,flipVertical,pri){

        //Check for an invalid position.
        if(dx < -7 || dx >= 256 || dy < -7 || dy >= 240){
            return;
        }

        //Cache some variables, remove?
        var buffer = nes.ppu.buffer;
        var palette = nes.ppu.sprPalette;
        var pixRendered = nes.ppu.pixRendered;

        if(dx < 0){
            srcx1 -= dx;
        }

        if(dx+srcx2 >= 256){
            srcx2 = 256-dx;
        }

        if(dy < 0){
            srcy1 -= dy;
        }

        if(dy+srcy2 >= 240){
            srcy2 = 240-dy;
        }

        //???
        var fbIndex = (dy<<8)+dx;

        //Check the sprite orientation.
        if(flipHorizontal){
            if(flipVertical){

                //Draw the sprite flipped horizontally and vertically.

                var tIndex = 63;
                for(var y=0;y<8;y++){
                    for(var x=0;x<8;x++){
                        if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                            var palIndex = this.pix[tIndex];
                            var tpri = pixRendered[fbIndex];
                            if(palIndex !== 0 && pri <= (tpri&0xFF)){
                                //Set the color from the palette to the buffer.
                                buffer[fbIndex] = palette[palIndex+palAdd];
                                pixRendered[fbIndex] = (tpri&0xF00)|pri;
                            }
                        }
                        fbIndex++;
                        tIndex--;
                    }
                    fbIndex += 248;
                }

            }
            else{

                //Draw the sprite flipped horizontally.

                var tIndex = 7;
                for(var y=0;y<8;y++){
                    for(var x=0;x<8;x++){
                        if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                            var palIndex = this.pix[tIndex];
                            var tpri = pixRendered[fbIndex];
                            if(palIndex !== 0 && pri <= (tpri&0xFF)){
                                //Set the color from the palette to the buffer.
                                buffer[fbIndex] = palette[palIndex+palAdd];
                                pixRendered[fbIndex] = (tpri&0xF00)|pri;
                            }
                        }
                        fbIndex++;
                        tIndex--;
                    }
                    fbIndex += 248;
                    tIndex += 16;
                }

            }

        }
        else if(flipVertical){

            //Draw the sprite flipped vertically.

            var tIndex = 56;
            for(var y=0;y<8;y++){
                for(var x=0;x<8;x++){
                    if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                        var palIndex = this.pix[tIndex];
                        var tpri = pixRendered[fbIndex];
                        if(palIndex !== 0 && pri <= (tpri&0xFF)){
                            //Set the color from the palette to the buffer.
                            buffer[fbIndex] = palette[palIndex+palAdd];
                            pixRendered[fbIndex] = (tpri&0xF00)|pri;
                        }
                    }
                    fbIndex++;
                    tIndex++;
                }
                fbIndex += 248;
                tIndex -= 16;
            }

        }
        else{

            //Draw the sprite normally.

            var tIndex = 0;
            for(var y=0;y<8;y++){
                for(var x=0;x<8;x++){
                    if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                        var palIndex = this.pix[tIndex];
                        var tpri = pixRendered[fbIndex];
                        if(palIndex !== 0 && pri <= (tpri&0xFF)){
                            //Set the color from the palette to the buffer.
                            buffer[fbIndex] = palette[palIndex+palAdd];
                            pixRendered[fbIndex] = (tpri&0xF00)|pri;
                        }
                    }
                    fbIndex++;
                    tIndex++;
                }
                fbIndex += 248;
            }

        }

    },

};
