//=============================
//== Picture Processing Unit ==
//=============================

/**
 * @namespace The picture processing unit for the nes.
 */

nes.ppu = {

//Properties

    //Memory

    /**
     * The video ram memory.
     * @type array
     */

    vramMem:null,

    /**
     * The sprite ram memory.
     * @type array
     */

    spriteMem:null,

    //Input/Output

    /**
     * A flag indicating whether this is the first or second vram write.
     * @type boolean
     */

    firstWrite:null,

    /**
     * The currently indexed video ram element.
     * @type integer
     */

    vramAddress:null,

    /**
     * Unknown
     * @type integer
     */

    vramTmpAddress:null,

    /**
     * Unknown
     * @type integer
     */

    vramBufferedReadValue:null,

    /**
     * The currently indexed sprite memory element.
     * @type integer
     */

    sramAddress:null,

    //Control Register

    /**
     * Non-Maskable Interrupt on vertical blank flag.
     * 0 - Disabled
     * 1 - Enabled
     * @type integer
     */

    f_nmiOnVblank:null,

    /**
     * Sprite size flag.
     * <br>
     * 0 - 8x8
     * <br>
     * 1 - 8x16
     * @type integer
     */

    f_spriteSize:null,

    /**
     * Background pattern table address.
     * <br>
     * 0 - 0x0000
     * <br>
     * 1 - 0x1000
     * @type integer
     */

    f_bgPatternTable:null,

    /**
     * Sprite pattern table address.
     * <br>
     * 0 - 0x0000
     * <br>
     * 1 - 0x1000
     * @type integer
     */

    f_spPatternTable:null,

    /**
     * PPU address increment flag.
     * <br>
     * 0 - 1
     * <br>
     * 1 - 32
     * @type integer
     */

    f_addrInc:null,

    /**
     * Name table address flag.
     * <br>
     * 0 - 0x2000
     * <br>
     * 1 - 0x2400
     * <br>
     * 2 - 0x2800
     * <br>
     * 3 - 0x2C00
     * @type integer
     */

    f_nTblAddress:null,

    //Masking Register

    /**
     * Color emphasis flag, also determines bg color in monochrome mode.
     * <br>
     * 0 - black
     * <br>
     * 1 - blue
     * <br>
     * 2 - green
     * <br>
     * 4 - red
     * @type integer
     */

    f_color:null,

    /**
     * Sprite visibility flag.
     * <br>
     * 0 - Sprites are hidden
     * <br>
     * 1 - Sprites are visible
     * @type integer
     */

    f_spVisibility:null,

    /**
     * Background visibility flag.
     * <br>
     * 0 - Background is hidden
     * <br>
     * 1 - Background is visible
     * @type integer
     */

    f_bgVisibility:null,

    /**
     * Sprite clipping flag.
     * <br>
     * 0 - Sprites are clipped from left 8 pixels
     * <br>
     * 1 - No Clipping
     * <br>
     * Poorly implemented, clips background as well.
     * @type integer
     */

    f_spClipping:null,

    /**
     * Background clipping flag.
     * <br>
     * 0 - Background is clipped from left 8 pixels
     * <br>
     * 1 - No Clipping
     * <br>
     * Poorly implemented, clips sprites as well.
     * @type integer
     */

    f_bgClipping:null,

    /**
     * Display type flag.
     * <br>
     * 0 - Color
     * <br>
     * 1 - Monochrome
     * @type integer
     */

    f_dispType:null,

    //Counters

    /**
     * Unknown counter.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    cntFV:null,

    /**
     * Unknown counter.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    cntVT:null,

    /**
     * Unknown counter.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    cntHT:null,

    /**
     * Unknown counter.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    cntV:null,

    /**
     * Unknown counter.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    cntH:null,

    //Registers

    regFV:null,

    /**
     * Unknown register.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    regV:null,

    /**
     * Unknown register.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    regH:null,

    /**
     * Unknown register.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    regVT:null,

    /**
     * Unknown register.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    regHT:null,

    /**
     * Unknown register.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    regFH:null,

    /**
     * Unknown register.
     * Somehow tied into screen scrolling and the control/masking register.
     * @type integer
     */

    regS:null,

    //Rendering Variables

    attrib:null,
    buffer:null,
    bgbuffer:null,
    pixRendered:null,
    scantile:null,

    //Misc Rendering Variables

    /**
     * The scanline counter, goes from 0 to 261.
     * <br>
     * Scanlines 0-20 and 241-261 are not visible.
     * <br>
     * Scanline 19 is the "dummy" scanline.
     * @type integer
     */

    scanline:null,

    /**
     * The last rendered scanline.
     * @type integer
     */

    lastRenderedScanline:null,

    /**
     * A horizontal pixel counter.
     * <br>
     * Goes from 0 to 341 before ending the current scanline, even though scanlines are only 256 pixels wide.
     * @type integer
     */

    curX:null,

    /**
     * Set to true when the ppu has drawn the last scanline.
     * @type boolean
     */

    requestEndFrame:null,

    /**
     * Non-Maskable Interrupt counter.
     * @type integer
     */

    nmiCounter:null,

    /**
     * True when internally buffered tile data is valid.
     * @type boolean
     */

    validTileData:null,

    //Sprite Data

    /**
     * Sprite x values.
     * @type array
     */

    sprX:null,

    /**
     * Sprite y values.
     * @type array
     */

    sprY:null,

    /**
     * Sprite tile indexes, indexes the pattern table.
     * @type array
     */

    sprTile:null,

    /**
     * Upper two bites of sprite color.
     * @type array
     */

    sprCol:null,

    /**
     * Sprite vertically flipped flags.
     * @type array
     */

    vertFlip:null,

    /**
     * Sprite horizontally flipped flags.
     * @type array
     */

    horiFlip:null,

    /**
     * Sprite background priority.
     * @type array
     */

    bgPriority:null,

    //Sprite 0 Hit Flags

    /**
     * True or false depending on whether there has been a sprite 0 hit.
     * @type boolean
     */

    hitSpr0:null,

    /**
     * The x position of the sprite 0 hit.
     * @type integer
     */

    spr0HitX:null,

    /**
     * The y position of the sprite 0 hit.
     * @type integer
     */

    spr0HitY:null,

    //Buffered Color Palettes

    /**
     * Buffered background color palette.
     * <br>
     * Holds 16 color values that come from color indexes at vram 0x3f00 to 0x3f10.
     * <br>
     * The first entry is used as the background color in color mode.
     * <br>
     * If in monochrome mode these colors are saturated.
     * @type array
     */

    imgPalette:null,

    /**
     * Buffered sprite color palette.
     * <br>
     * Holds 16 color values that come from color indexes at vram 0x3f10 to 0x3f20.
     * <br>
     * If in monochrome mode these colors are saturated.
     * @type array
     */

    sprPalette:null,

    //Pattern Table Tile Buffers

    /**
     * Pattern table tile buffer.
     * @type array
     */

    ptTile:null,

    //Nametable Buffers

    /**
     * First nametable?
     * @type array
     */

    ntable1:null,

    /**
     * Nametable?
     * @type array
     */

    nameTable:null,

    //VRAM Mirror Table

    /**
     * Vram mirror table.
     * @type array
     */

    vramMirrorTable:null,

    //Rendering Options

    /**
     * Whether or not to clip the image to the tv size.
     * @type boolean
     */

    clipToTvSize:true,

//Methods

    /**
     * Resets the ppu.
     * @type void
     */

    reset:function ppu_reset(){
        //Reset the video ram.
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
        this.f_nmiOnVblank = 0;
        this.f_spriteSize = 0;
        this.f_bgPatternTable = 0;
        this.f_spPatternTable = 0;
        this.f_addrInc = 0;
        this.f_nTblAddress = 0;
        //Masking Register
        this.f_color = 0;
        this.f_spVisibility = 0;
        this.f_bgVisibility = 0;
        this.f_spClipping = 0;
        this.f_bgClipping = 0;
        this.f_dispType = 0;
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
        //???
        this.requestEndFrame = false;
        this.validTileData = false;
        this.nmiCounter = 0;
        this.scantile = new Array(32);
        //Initialize misc vars.
        this.scanline = 0;
        this.lastRenderedScanline = 19;
        this.curX = 0;
        //Sprite data.
        this.sprX = new Array(64);
        this.sprY = new Array(64);
        this.sprTile = new Array(64);
        this.sprCol = new Array(64);
        this.vertFlip = new Array(64);
        this.horiFlip = new Array(64);
        this.bgPriority = new Array(64);
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
        this.nameTable[0] = new this.NameTable(32,32);
        this.nameTable[1] = new this.NameTable(32,32);
        this.nameTable[2] = new this.NameTable(32,32);
        this.nameTable[3] = new this.NameTable(32,32);
        //Initialize vram mirroring lookup table.
        this.vramMirrorTable = new Array(0x8000);
        for(var i=0;i<0x8000;i++){
            this.vramMirrorTable[i] = i;
        }
        //Set the color palette.
        this.colorPalette.loadNTSCPalette();
    },

    /**
     * Sets the specified vram mirroring.
     * @type void
     * @param {integer} mirroring
     */

    setMirroring:function ppu_setMirroring(mirroring){
        //???
        this.triggerRendering();
        //Remove mirroring
        this.vramMirrorTable = new Array(0x8000);
        for(var i=0;i<0x8000;i++){
            this.vramMirrorTable[i] = i;
        }
        //Palette Mirroring
        this.defineMirrorRegion(0x3f20,0x3f00,0x20);
        this.defineMirrorRegion(0x3f40,0x3f00,0x20);
        this.defineMirrorRegion(0x3f80,0x3f00,0x20);
        this.defineMirrorRegion(0x3fc0,0x3f00,0x20);
        //Additional Mirroring
        this.defineMirrorRegion(0x3000,0x2000,0xf00);
        this.defineMirrorRegion(0x4000,0x0000,0x4000);
        //Horizontal Mirroring
        if(mirroring === 1){
            this.ntable1[0] = this.ntable1[1] = 0;
            this.ntable1[2] = this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2400,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2800,0x400);
        }
        //Vertical Mirroring
        else if(mirroring === 0){
            this.ntable1[0] = this.ntable1[2] = 0;
            this.ntable1[1] = this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2800,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2400,0x400);
        }
        //Single Screen Mirroring
        else if(mirroring === 3){
            this.ntable1[0] = this.ntable1[1] = this.ntable1[2] = this.ntable1[3] = 0;
            this.defineMirrorRegion(0x2400,0x2000,0x400);
            this.defineMirrorRegion(0x2800,0x2000,0x400);
            this.defineMirrorRegion(0x2c00,0x2000,0x400);
        }
        //Single Screen Mirroring 2
        else if(mirroring === 4){
            this.ntable1[0] = this.ntable1[1] = this.ntable1[2] = this.ntable1[3] = 1;
            this.defineMirrorRegion(0x2400,0x2400,0x400);
            this.defineMirrorRegion(0x2800,0x2400,0x400);
            this.defineMirrorRegion(0x2c00,0x2400,0x400);
        }
        //Assume Four-screen mMirroring
        else{
            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 2;
            this.ntable1[3] = 3;
        }
    },

    /**
     * Defines a mirrored area in the vram address lookup table.
     * @type void
     * @param {integer} from The area of memory to redirect.
     * @param {integer} to The physical memory.
     * @param {integer} size The size of the mirrored section.
     */

    defineMirrorRegion:function ppu_defineMirrorRegion(from,to,size){
        for(var i=0;i<size;i++){
            this.vramMirrorTable[from+i] = to+i;
        }
    },

    /**
     * Clears the screen buffer.
     * @type void
     */

    startFrame:function ppu_startFrame(){
        //Default the background color to black.
        var bgColor = 0x000000;
        //Check if monochrome.
        if(this.f_dispType === 0){
            //No, use first entry of image palette as bg color.
            bgColor = this.imgPalette[0];
        }
        else{
            //Yes, color emphasis determines the bg color.
            switch(this.f_color){
                //Green
                case 1:
                    bgColor = 0x00FF00;
                    break;
                //Blue
                case 2:
                    bgColor = 0xFF0000;
                    break;
                //Red
                case 4:
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

    /**
     * Starts the non-maskable interrupt, ensures that every scanline is rendered, and draws the pixel buffer to the screen.
     * @type void
     */

    endFrame:function ppu_endFrame(){
        //Do the non-maskable interrupt.
        nes.cpu.requestInterrupt(1);
        //Make sure everything is rendered.
        if(this.lastRenderedScanline < 259){
            this.renderFramePartially(260-this.lastRenderedScanline);
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
        //Else check to clip the sprites or background.
        //FIXME, does not selectively clip the sprites or background.
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
        this.lastRenderedScanline = 19;
    },

    /**
     * Ends the current scaline.
     * <br>
     * First scanline(20): Clear the vertical blank flag, clear sprite 0 hit flags.
     * <br>
     * Normal scanline(20-260): Render, update scrolling, check for sprite 0 hit.
     * <br>
     * Last Scanline(261): Set vertical blank flag, set requestEndFrame flag, reset scanline counter.
     * @type void
     */

    endScanline:function ppu_endScanline(){
        //Check if its a normal scanline.
        if(this.scanline > 20 && this.scanline < 261){
            //Check if the bg is visible.
            if(this.f_bgVisibility === 1){
                //Update scroll.
                this.cntHT = this.regHT;
                this.cntH = this.regH;
                this.renderBgScanline(this.bgbuffer,this.scanline);
                //Check for sprite 0 hit on next scanline.
                if(!this.hitSpr0 && this.f_spVisibility === 1){
                    if(this.checkSprite0()){
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
                    this.renderBgScanline(this.buffer,20);
                }
                //Check sprite 0 hit on the first visible scanline.
                this.checkSprite0();
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
            //Reset the scanline counter to -1, will be incremented to 0.
            this.scanline = -1;
        }
        //Increment the scanline.
        this.scanline++;
        //???
        this.regsToAddress();
        this.cntsToAddress();
    },

    /**
     * Writes the passed value to the specified register.
     * @type void
     * @param {integer} address
     * @param {integer} value
     */

    writeRegister:function(address,value){
        switch(address&7){

            //Write 0x2000, PPU Control Register
            //Sets the Control Register.
            case 0:
                //Set the value into the ram.
                nes.cpu.mem[0x2000] = value;
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
                break;

            //Write 0x2001, PPU Masking Register
            //Sets the Masking Register.
            case 1:
                //Set the value into the ram.
                nes.cpu.mem[0x2001] = value;
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
                    this.checkSprite0(this.scanline);
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
                //Check if in an unmirrored address.
                if(this.vramAddress < 0x2000){
                    //Write to the vram.
                    this.vramMem[this.vramAddress] = value;
                    //???
                    if(this.vramAddress%16 < 8){
                        this.ptTile[parseInt(this.vramAddress/16)].setScanline(this.vramAddress%16,value,this.vramMem[this.vramAddress+8]);
                    }
                    else{
                        this.ptTile[parseInt(this.vramAddress/16)].setScanline((this.vramAddress%16)-8,this.vramMem[this.vramAddress-8],value);
                    }
                    //Invoke mapper latch.
                    nes.mmc.latchAccess(this.vramAddress);
                }
                //Check if the write is into the image or sprite color palettes.
                else if(this.vramAddress >= 0x3f00 && this.vramAddress < 0x3f20){
                    //Check which address is being written into.
                    if(this.vramAddress === 0x3F00 || this.vramAddress === 0x3F10){
                        //Addresses 0x3F00 and 0x3F10 are mirrored, write to both of them.
                        this.vramMem[0x3F00] = value;
                        this.vramMem[0x3F10] = value;
                    }
                    else if(this.vramAddress === 0x3F04 || this.vramAddress === 0x3F14){
                        //Addresses 0x3F04 and 0x3F14 are mirrored, write to both of them.
                        this.vramMem[0x3F04] = value;
                        this.vramMem[0x3F14] = value;
                    }
                    else if(this.vramAddress === 0x3F08 || this.vramAddress === 0x3F18){
                        //Addresses 0x3F08 and 0x3F18 are mirrored, write to both of them.
                        this.vramMem[0x3F08] = value;
                        this.vramMem[0x3F18] = value;
                    }
                    else if(this.vramAddress === 0x3F0C || this.vramAddress === 0x3F1C){
                        //Addresses 0x3F0C and 0x3F1C are mirrored, write to both of them.
                        this.vramMem[0x3F0C] = value;
                        this.vramMem[0x3F1C] = value;
                    }
                    else{
                        //Else an unmirrored palette entry, write normally.
                        this.vramMem[this.vramAddress] = value;
                    }
                    //Update the internally buffered image and sprite color palettes.
                    this.updatePalettes();
                }
                //Else check if the write is in the mirror table.
                else if(this.vramAddress < this.vramMirrorTable.length){
                    //Cache the address from the mirroring table.
                    var address = this.vramMirrorTable[this.vramAddress];
                    //Write to the vram.
                    this.vramMem[address] = value;
                    //Use a case structure to determine how to update the internally buffered data.
                    if(address < 0x23c0){
                        //???
                        this.nameTable[this.ntable1[0]].tile[address-0x2000] = value;
                        //Update sprite 0 hit.
                        this.checkSprite0();
                    }
                    else if(address < 0x2400){
                        //Update the internal pattern table buffer with this new attribute table byte.
                        this.nameTable[this.ntable1[0]].writeAttrib(address-0x23c0,value);
                    }
                    else if(address < 0x27c0){
                        //???
                        this.nameTable[this.ntable1[1]].tile[address-0x2400] = value;
                        //Update sprite 0 hit.
                        this.checkSprite0();
                    }
                    else if(address < 0x2800){
                        //Update the internal pattern table buffer with this new attribute table byte.
                        this.nameTable[this.ntable1[1]].writeAttrib(address-0x27c0,value);
                    }
                    else if(address < 0x2bc0){
                        //???
                        this.nameTable[this.ntable1[2]].tile[address-0x2800] = value;
                        //Update sprite 0 hit.
                        this.checkSprite0();
                    }
                    else if(address < 0x2c00){
                        //Update the internal pattern table buffer with this new attribute table byte.
                        this.nameTable[this.ntable1[2]].writeAttrib(address-0x2bc0,value);
                    }
                    else if(address < 0x2fc0){
                        //???
                        this.nameTable[this.ntable1[3]].tile[address-0x2c00] = value;
                        //Update sprite 0 hit.
                        this.checkSprite0();
                    }
                    else if(address < 0x3000){
                        //Update the internal pattern table buffer with this new attribute table byte.
                        this.nameTable[this.ntable1[3]].writeAttrib(address-0x2fc0,value);
                    }
                }
                //Increment the vram address by either 1 or 32, depending on bit 2 of the control register.
                this.vramAddress += 1+this.f_addrInc*31;
                //???
                this.regsFromAddress();
                this.cntsFromAddress();
                break;

        }
    },

    /**
     * Converts the scroll registers to a temporary vram address.
     * @type void
     */

    regsToAddress:function(){
        this.vramTmpAddress = (((((this.regFV&7)<<4)|((this.regV&1)<<3)|((this.regH&1)<<2)|((this.regVT>>3)&3))<<8)|(((this.regVT&7)<<5)|(this.regHT&31)))&0x7FFF;
    },

    /**
     * Converts the scroll counters to the vram address.
     * @type void
     */

    cntsToAddress:function(){
        this.vramAddress = (((((this.cntFV&7)<<4)|((this.cntV&1)<<3)|((this.cntH&1)<<2)|((this.cntVT>>3)&3))<<8)|(((this.cntVT&7)<<5)|(this.cntHT&31)))&0x7FFF;
    },

    /**
     * Updates the scroll registers from the temporary vram address created by regsToAddress().
     * @type void
     */

    regsFromAddress:function(){
        //???
        var address = (this.vramTmpAddress>>8)&0xFF;
        this.regFV = (address>>4)&7;
        this.regV = (address>>3)&1;
        this.regH = (address>>2)&1;
        this.regVT = (this.regVT&7)|((address&3)<<3);
        //???
        var address = this.vramTmpAddress&0xFF;
        this.regVT = (this.regVT&24)|((address>>5)&7);
        this.regHT = address&31;
    },

    /**
     * Updates the scroll counters from the current vram address.
     * @type void
     */

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

    /**
     * Renders scanlines up to the current one?
     * @type void
     */

    triggerRendering:function(){
        //Check if this is a visible scanline.
        if(this.scanline > 20 && this.scanline < 261){
            //Render sprites, and combine.
            this.renderFramePartially(this.scanline-this.lastRenderedScanline-1);
            //Set last rendered scanline.
            this.lastRenderedScanline = this.scanline-1;
        }
    },

    /**
     * Renders the specified number of scanlines.
     * @type void
     * @param {integer} scanCount
     */

    renderFramePartially:function(scanCount){
        //Cache the scanline to start rendering at.
        var startScan = this.lastRenderedScanline-19;
        //???
        this.renderSpritesPartially(scanCount,true);
        //Check if the bg is visible.
        if(this.f_bgVisibility === 1){
            //Cache the ending index.
            var endIndex = Math.min((startScan+scanCount)<<8,0xF000);
            //Loop through the specified pixels.
            for(var destIndex=startScan<<8;destIndex<endIndex;destIndex++){
                //???
                if(this.pixRendered[destIndex] > 0xFF){
                    //Set the pixel from the background buffer.
                    this.buffer[destIndex] = this.bgbuffer[destIndex];
                }
            }
        }
        //???
        this.renderSpritesPartially(scanCount,false);
        //Invalidate tile data, for what reason who knows?
        this.validTileData = false;
    },

    /**
     * Renders the background of the specified scanline onto the passed buffer.
     * @type void
     * @param {array} buffer
     * @param {integer} scanline
     */

    renderBgScanline:function(buffer,scanline){
        //Reduce the scanline value to the previous scale, -20 to 241 instead of 0 to 261.
        scanline -= 20;
        //???
        var destIndex = (scanline<<8)-this.regFH;
        //???
        this.cntHT = this.regHT;
        this.cntH = this.regH;
        //???
        if(scanline < 240 && (scanline-this.cntFV) >= 0){
            //Cache the curent name table index.
            var curNt = this.ntable1[2*this.cntV+this.cntH];
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
                    //Get the tile and its attributes.
                    var t = this.scantile[tile];
                    var att = this.attrib[tile];
                    //Render tile scanline.
                    var x = (tile<<3)-this.regFH;
                    if(x > -8){
                        //???
                        if(x < 0){
                            destIndex -= x;
                            var sx = -x;
                        }
                        else{
                            var sx = 0;
                        }
                        //???
                        if(t.opaque[this.cntFV]){
                            for(;sx<8;sx++){
                                this.buffer[destIndex] = this.imgPalette[t.pixelColor[tscanoffset+sx]+att];
                                this.pixRendered[destIndex] |= 256;
                                destIndex++;
                            }
                        }
                        else{
                            for(;sx<8;sx++){
                                var col = t.pixelColor[tscanoffset+sx];
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
            //Invalidate tile data, for what reason who knows?
            this.validTileData = false;
        }
    },

    /**
     * Renders sprites onto the specified scanline, provided they match the specified bg priority.
     * @type void
     * @param {integer} scancount
     * @param {boolean} bgPri
     */

    renderSpritesPartially:function(scancount,bgPri){
        //Cache the scanline to start at.
        var startscan = this.lastRenderedScanline-19;
        //Check if the sprites are visible.
        if(this.f_spVisibility === 1){
            //Check the sprite size.
            if(this.f_spriteSize === 0){
                //8x8 Sprites
                for(var i=0;i<64;i++){
                    //???
                    if(this.bgPriority[i] === bgPri && this.sprX[i]>=0 && this.sprX[i]<256 && this.sprY[i]+8 >= startscan && this.sprY[i]<startscan+scancount){
                        //???
                        if(this.sprY[i] < startscan){
                            var srcy1 = startscan-this.sprY[i]-1;
                        }
                        else{
                            var srcy1 = 0;
                        }
                        //???
                        if(this.sprY[i]+8 > startscan+scancount){
                            var srcy2 = startscan+scancount-this.sprY[i]+1;
                        }
                        else{
                            var srcy2 = 8;
                        }
                        //Check the sprite pattern table address.
                        if(this.f_spPatternTable === 0){
                            //0x0000
                            this.ptTile[this.sprTile[i]].render(srcy1,srcy2,1,i);
                        }
                        else{
                            //0x1000
                            this.ptTile[this.sprTile[i]+256].render(srcy1,srcy2,1,i);
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
                        if(this.sprY[i] < startscan){
                            var srcy1 = startscan-this.sprY[i]-1;
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
                        this.ptTile[top+(this.vertFlip[i]?1:0)].render(srcy1,srcy2,1,i);
                        //???
                        if(this.sprY[i]+8 < startscan){
                            var srcy1 = startscan-(this.sprY[i]+9);
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
                        this.ptTile[top+(this.vertFlip[i]?0:1)].render(srcy1,srcy2,9,i);
                    }
                }
            }
        }
    },

    /**
     * Checks for a sprite 0 hit on the specified scanline.
     * @type void
     * @param {integer} scanline
     */

    checkSprite0:function(){
        //Get the current scanline.
        var scanline = this.scanline;
        //Reduce the scanline value to the previous scale, -20 to 241 instead of 0 to 261.
        scanline -= 20;
        //Set the sprite collision to an invalid position.
        this.spr0HitX = this.spr0HitY = -1;
        //Cache the sprites position, why add 1 to the y value?
        var x = this.sprX[0];
        var y = this.sprY[0]+1;
        //Check if sprite size is 8x8.
        if(this.f_spriteSize === 0){
            //Check if its in range.
            if(y <= scanline && y+8 > scanline && x >= -7 && x < 256){
                //Cache the sprite.
                var t = this.ptTile[this.sprTile[0]+this.f_spPatternTable*256];
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
                                if(t.pixelColor[toffset+i] !== 0){
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
                                if(t.pixelColor[toffset+i] !== 0){
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
                            if(t.pixelColor[toffset+i] !== 0){
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
                            if(t.pixelColor[toffset+i] !== 0){
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

    /**
     * Updates the internally buffered image and sprite color palettes.
     * @type void
     */

    updatePalettes:function(){
        //Updates the image and sprite color palettes from 0x3f00 to 0x3f20.
        //Check if monochrome.
        if(this.f_dispType === 0){
            //No, update normally.
            for(var i=0;i<16;i++){
                this.imgPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f00+i]];
                this.sprPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f10+i]];
            }
        }
        else{
            //Yes, & every color byte with 48, taking away its hue.
            for(var i=0;i<16;i++){
                this.imgPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f00+i]&48];
                this.sprPalette[i] = this.colorPalette.curTable[this.vramMem[0x3f10+i]&48];
            }
        }
    },

    /**
     * Writes the passed value into sprite memory at the specified address and updates the internal buffers accordingly.
     * @type void
     * @param {integer} address
     * @param {integer} value
     */

    writeSpriteMem:function(address,value){
        //Write the value into the sprite memory.
        this.spriteMem[address] = value;
        //???
        var tIndex = parseInt(address/4);
        //???
        if(tIndex === 0){
            //Check sprite 0 for a hit.
            this.checkSprite0();
        }
        //???
        address %= 4;
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

    //===================
    //== Color Palette ==
    //===================

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

        //emphTable:[
        //    [5395026,11796480,10485760,11599933,7602281,91,95,6208,12048,543240,26368,1196544,7153664,0,0,0,12899815,16728064,14421538,16729963,14090399,6818519,6588,21681,27227,35843,43776,2918400,10777088,0,0,0,16316664,16755516,16742785,16735173,16730354,14633471,4681215,46327,57599,58229,259115,7911470,15065624,7895160,0,0,16777215,16773822,16300216,16300248,16758527,16761855,13095423,10148607,8973816,8650717,12122296,16119980,16777136,16308472,0,0],
        //    [4018749,8847360,7864320,8650797,5701710,68,71,6192,12044,412166,26368,868864,5318656,0,0,0,9688493,12533760,10817049,12535632,10551415,5114529,6541,21636,27204,35842,43776,2197504,8090112,0,0,0,12253370,12561197,12548448,12540819,12535989,10963391,3501503,46265,57535,58199,193568,5945378,11264530,5929050,0,0,12582847,12579470,12236938,12236962,12564159,12567487,9818559,7592639,6745530,6487973,9107594,12056705,12582788,12245178,0,0],
        //    [4013394,8847360,7864320,8650813,5701737,91,95,4672,8976,407304,19712,864512,5316096,0,0,0,9674727,12529664,10816034,12531051,10551455,5113815,4796,16305,20315,26883,32768,2188800,8082688,0,0,0,12237560,12550204,12540545,12534981,12531442,10958591,3494399,34807,43263,43637,177963,5933614,11249944,5921400,0,0,12566527,12563902,12225208,12225240,12552447,12555007,9805055,7578623,6730232,6471645,9091768,12040876,12566448,12231416,0,0],
        //    [4013373,8847360,7864320,8650797,5701710,68,71,4656,8972,407302,19712,864512,5316096,0,0,0,9674669,12529664,10816025,12531024,10551415,5113761,4749,16260,20292,26882,32768,2188800,8082688,0,0,0,12237498,12550189,12540512,12534931,12531381,10958527,3494335,34745,43199,43607,177952,5933602,11249938,5921370,0,0,12566463,12563854,12225162,12225186,12552383,12554943,9804991,7578559,6730170,6471589,9091722,12040833,12566404,12231354,0,0],
        //    [4013373,8847360,7864320,8650797,5701710,68,71,4656,8972,407302,19712,864512,5316096,0,0,0,9674669,12529664,10816025,12531024,10551415,5113761,4749,16260,20292,26882,32768,2188800,8082688,0,0,0,12237498,12550189,12540512,12534931,12531381,10958527,3494335,34745,43199,43607,177952,5933602,11249938,5921370,0,0,12566463,12563854,12225162,12225186,12552383,12554943,9804991,7578559,6730170,6471589,9091722,12040833,12566404,12231354,0,0],
        //    [4013373,8847360,7864320,8650797,5701710,68,71,4656,8972,407302,19712,864512,5316096,0,0,0,9674669,12529664,10816025,12531024,10551415,5113761,4749,16260,20292,26882,32768,2188800,8082688,0,0,0,12237498,12550189,12540512,12534931,12531381,10958527,3494335,34745,43199,43607,177952,5933602,11249938,5921370,0,0,12566463,12563854,12225162,12225186,12552383,12554943,9804991,7578559,6730170,6471589,9091722,12040833,12566404,12231354,0,0],
        //    [4013373,8847360,7864320,8650797,5701710,68,71,4656,8972,407302,19712,864512,5316096,0,0,0,9674669,12529664,10816025,12531024,10551415,5113761,4749,16260,20292,26882,32768,2188800,8082688,0,0,0,12237498,12550189,12540512,12534931,12531381,10958527,3494335,34745,43199,43607,177952,5933602,11249938,5921370,0,0,12566463,12563854,12225162,12225186,12552383,12554943,9804991,7578559,6730170,6471589,9091722,12040833,12566404,12231354,0,0],
        //],

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
                    this.emphTable[emph][i] = (parseInt(((color>>16)&0xFF)*rFactor)<<16)|(parseInt(((color>>8)&0xFF)*gFactor)<<8)|parseInt((color&0xFF)*bFactor);
                }
            }
        },

        setEmphasis:function nes_ppu_colorPalette_setEmphasis(emph){
            //Set the current color table from the emphasis tables.
            this.curTable = this.emphTable[emph];
        },

    },

};

//================
//== Name Table ==
//================

/**
 * Holds tiles and their attributes in a psuedo two-dimensional array.
 * @constructor
 * @param {integer} width
 * @param {integer} height
 */

nes.ppu.NameTable = function nes_ppu_NameTable(width,height){
    //Save the width of the name table.
    this.width = width;
    //Create the tile and attribute arrays from the width and height.
    this.tile = new Array(width*height);
    this.attrib = new Array(width*height);
};

nes.ppu.NameTable.prototype = {

    /**
     * Returns the tile at the specified index.
     * @type Tile
     * @param {integer} x
     * @param {integer} y
     */

    getTileIndex:function nes_ppu_NameTable_getTileIndex(x,y){
        //Return the tile at the specified index.
        return this.tile[y*this.width+x];
    },

    /**
     * Returns the tile attributes at the specified index.
     * @type integer
     * @param {integer} x
     * @param {integer} y
     */

    getAttrib:function nes_ppu_NameTable_getAttrib(x,y){
        //Return the attribute at the specified index.
        return this.attrib[y*this.width+x];
    },

    /**
     * Sets the tile attributes at the specified index.
     * @type void
     * @param {integer} index
     * @param {integer} value
     */

    writeAttrib:function nes_ppu_NameTable_writeAttrib(index,value){
        //Get the x and y position of the index.
        var basex = (index%8)*4;
        var basey = parseInt(index/8)*4;
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

//==========
//== Tile ==
//==========

/**
 * Standard 8x8 pixel tile, used with sprites.
 * @constructor
 */

Tile = function Tile(){
    //Pixel Colors
    this.pixelColor = new Array(64);
    //Row Opacity
    this.opaque = new Array(8);
};

Tile.prototype = {

    /**
     * Sets the pixel color/transparency to the specified scanline?
     * @type void
     * @param {integer} scanline
     * @param {integer} b1
     * @param {integer} b2
     */

    setScanline:function(scanline,b1,b2){
        //???
        var tIndex = scanline<<3;
        //Loop through the 8 pixels on a row.
        for(var x=0;x<8;x++){
            //Set the pixel color/transparency?
            this.pixelColor[tIndex+x] = ((b1>>(7-x))&1)+(((b2>>(7-x))&1)<<1);
            //Check if transparent the pixel is transparent.
            if(this.pixelColor[tIndex+x] === 0){
                //If so, set the scanline as having a transparent pixel.
                this.opaque[scanline] = false;
            }
        }
    },

    /**
     * Renders the tile using the sprite data from the specified index.
     * @type void
     * @param {integer} srcy1 The top bound for the tile.
     * @param {integer} srcy2 The bottom bound for the tile.
     * @param {integer} yAdd Amount of pixels the tile is rendered below the sprY value.
     * @param {integer} spriteIndex The sprite that is being rendered for.
     */

    render:function(srcy1,srcy2,yAdd,spriteIndex){
        //Set the pixel left and right bounds.
        var srcx1 = 0;
        var srcx2 = 8;
        //Get the position to draw the tile at.
        var dx = nes.ppu.sprX[spriteIndex];
        var dy = nes.ppu.sprY[spriteIndex]+yAdd;
        //Check for an invalid position, remove?
        if(dx < -7 || dx >= 256 || dy < -7 || dy >= 240){
            return;
        }
        //Move the clipping x right if the sprite is past the left of the screen.
        if(dx < 0){
            srcx1 -= dx;
        }
        //Move the clipping x2 left if the sprite is past the right of the screen.
        if(dx+srcx2 >= 256){
            srcx2 = 256-dx;
        }
        //Move the clipping y down if the sprite is past the top of the screen.
        if(dy < 0){
            srcy1 -= dy;
        }
        //Move the clipping y2 up if the sprite is past the bottom of the screen.
        if(dy+srcy2 >= 240){
            srcy2 = 240-dy;
        }
        //Get the pixel index to start drawing the sprite at.
        var screenIndex = dy*256+dx;
        //Check the sprite orientation.
        if(nes.ppu.horiFlip[spriteIndex]){
            //Draw the sprite flipped horizontally and vertically.
            if(nes.ppu.vertFlip[spriteIndex]){
                //Start drawing from the last pixel.
                var pixelIndex = 63;
                //Loop through the 64 tile pixels.
                for(var y=0;y<8;y++){
                    for(var x=0;x<8;x++){
                        //Check if the pixel is within bounds.
                        if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                            //Get the color index.
                            var colorIndex = this.pixelColor[pixelIndex];
                            var tpri = nes.ppu.pixRendered[screenIndex];
                            if(colorIndex !== 0 && spriteIndex <= (tpri&0xFF)){
                                //Set the color from the nes.ppu.sprPalette to the frame nes.ppu.nes.ppu.buffer.
                                nes.ppu.buffer[screenIndex] = nes.ppu.sprPalette[colorIndex+nes.ppu.sprCol[spriteIndex]];
                                nes.ppu.pixRendered[screenIndex] = (tpri&0xF00)|spriteIndex;
                            }
                        }
                        //Move to the next pixel on screen.
                        screenIndex++;
                        //Move backwards across the tile pixels.
                        pixelIndex--;
                    }
                    screenIndex += 248;
                }
            }
            //Draw the sprite flipped horizontally.
            else{
                //Start drawing from the last pixel on the first row.
                var pixelIndex = 7;
                //Loop through the 64 tile pixels.
                for(var y=0;y<8;y++){
                    for(var x=0;x<8;x++){
                        //Check if the pixel is within bounds.
                        if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                            //Get the color index.
                            var colorIndex = this.pixelColor[pixelIndex];
                            var tpri = nes.ppu.pixRendered[screenIndex];
                            if(colorIndex !== 0 && spriteIndex <= (tpri&0xFF)){
                                //Set the color from the nes.ppu.sprPalette to the frame nes.ppu.nes.ppu.buffer.
                                nes.ppu.buffer[screenIndex] = nes.ppu.sprPalette[colorIndex+nes.ppu.sprCol[spriteIndex]];
                                nes.ppu.pixRendered[screenIndex] = (tpri&0xF00)|spriteIndex;
                            }
                        }
                        //Move to the next pixel on screen.
                        screenIndex++;
                        //Move backwards across the tile pixels.
                        pixelIndex--;
                    }
                    //Move to the next row on the screen.
                    screenIndex += 248;
                    //Move the pixel index down a row.
                    pixelIndex += 16;
                }
            }
        }
        //Draw the sprite flipped vertically.
        else if(nes.ppu.vertFlip[spriteIndex]){
            //Start drawing from the first pixel on the last row.
            var pixelIndex = 56;
            //Loop through the 64 tile pixels.
            for(var y=0;y<8;y++){
                for(var x=0;x<8;x++){
                    //Check if the pixel is within bounds.
                    if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                        //Get the color index.
                        var colorIndex = this.pixelColor[pixelIndex];
                        var tpri = nes.ppu.pixRendered[screenIndex];
                        if(colorIndex !== 0 && spriteIndex <= (tpri&0xFF)){
                            //Set the color from the nes.ppu.sprPalette to the frame nes.ppu.nes.ppu.buffer.
                            nes.ppu.buffer[screenIndex] = nes.ppu.sprPalette[colorIndex+nes.ppu.sprCol[spriteIndex]];
                            nes.ppu.pixRendered[screenIndex] = (tpri&0xF00)|spriteIndex;
                        }
                    }
                    //Move to the next pixel on screen.
                    screenIndex++;
                    //Move to the next pixel in the tile.
                    pixelIndex++;
                }
                //Move to the next row on the screen.
                screenIndex += 248;
                //Move the pixel index up a row.
                pixelIndex -= 16;
            }
        }
        //Draw the sprite normally.
        else{
            //Start drawing at the first pixel.
            var pixelIndex = 0;
            //Loop through the 64 tile pixels.
            for(var y=0;y<8;y++){
                for(var x=0;x<8;x++){
                    //Check if the pixel is within bounds.
                    if(x >= srcx1 && x < srcx2 && y >= srcy1 && y < srcy2){
                        //Get the color index.
                        var colorIndex = this.pixelColor[pixelIndex];
                        var tpri = nes.ppu.pixRendered[screenIndex];
                        if(colorIndex !== 0 && spriteIndex <= (tpri&0xFF)){
                            //Set the color from the nes.ppu.sprPalette to the frame nes.ppu.nes.ppu.buffer.
                            nes.ppu.buffer[screenIndex] = nes.ppu.sprPalette[colorIndex+nes.ppu.sprCol[spriteIndex]];
                            nes.ppu.pixRendered[screenIndex] = (tpri&0xF00)|spriteIndex;
                        }
                    }
                    //Move to the next pixel on screen.
                    screenIndex++;
                    //Move to the next pixel in the tile.
                    pixelIndex++;
                }
                //Move to the next row on the screen.
                screenIndex += 248;
            }
        }
    },

};
