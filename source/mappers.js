
/**
 * @namespace An object holding the rom memory mappers.
 */

nes.mappers = {};

//
//  Mapper 0
//____________//

/**
 * @namespace Memory Mapper 0, Direct Access
 */

nes.mappers.mmc0 = {

//Properties

    /**
     * The strobe index for the first controller.
     * @type Number
     */

    joy1Strobe:0,

    /**
     * The strobe index for the second controller.
     * @type Number
     */

    joy2Strobe:0,

    /**
     * A number used to remember the previous write to the joypad(controller) register.
     * @type Number
     */

    joypadLastWrite:0,

//Methods

    /**
     * Resets the mapper.
     */

    reset:function nes_mappers_mmc0_reset(){
        //Reset the controller read strobes.
        this.joy1Strobe = 0;
        this.joy2Strobe = 0;
        this.joypadLastWrite = 0;
        //Reset the mouse flags, used for the Nintendo Zapper implementation.
        //this.mousePressed = false;
        //this.mouseX = null;
        //this.mouseY = null;
    },

    /**
     * Returns the value mapped to the specified address.
     * @returns {Number}
     * @param {Number} address
     */

    load:function nes_mappers_mmc0_load(address){
        //ROM
        if(address > 0x4017){
            return nes.cpu.mem[address];
        }
        //RAM
        if(address < 0x2000){
            return nes.cpu.mem[address&0x7FF];
        }
        //Registers
        return this.regLoad(address);
    },

    /**
     * Returns the combined value from the specified address and the one after it.
     * @returns {Number}
     * @param {Number} address
     */

    load16bit:function nes_mappers_mmc0_load16Bit(address){
        //Load two addresses from memory and combine them.
        return nes.cpu.mem[address]|(nes.cpu.mem[address+1]<<8);
            //Previously used this.load(), which checked the address.
    },

    /**
     * Writes the specified value to the specified address.
     * @param {Number} address
     * @param {Number} value
     */

    write:function nes_mappers_mmc0_write(address,value){
        //Check the address.
        if(address < 0x2000){
            //RAM
            nes.cpu.mem[address&0x7FF] = value;
        }
        else if(address < 0x4000){
            //PPU Registers
            nes.ppu.writeRegister(address,value);
        }
        else if(address < 0x4018){
            //IO & Sound Registers
            switch(address){

                //Write 0x4014, Sprite Memory DMA Access
                case 0x4014:
                    //Cache the base address.
                    var baseAddress = value*0x100;
                    //Cache the end address.
                    var endAddress = nes.ppu.sramAddress+256;
                    //Loop 256 times, for each byte to copy.
                    for(var i=nes.ppu.sramAddress;i<endAddress;i++){
                        //Write the byte from memory to the sprite ram.
                        nes.ppu.writeSpriteMem(i,nes.cpu.mem[baseAddress+i]);
                    }
                    //???
                    nes.cpu.haltCycles(513);
                    break;

                //Write 0x4015, Sound Channel Switch, DMC Status
                case 0x4015:
                    nes.apu.writeReg(address,value);
                    break;

                //Write 0x4016, Joystick Strobe Reset
                case 0x4016:
                    if(value === 0 && this.joypadLastWrite === 1){
                        this.joy1Strobe = 0;
                        this.joy2Strobe = 0;
                    }
                    this.joypadLastWrite = value;
                    break;

                //Write 0x4000-0x4017, Sound Registers
                default:
                    nes.apu.writeReg(address,value);

            }
        }
        else{
            //ROM
            nes.cpu.mem[address] = value;
        }
    },

    /**
     * Returns the value at the specified register address.
     * @type Number
     * @param {Number} address
     */

    regLoad:function nes_mappers_mmc0_regLoad(address){
        //The address sent should never be below 0x2000 or above 0x4017.
        //Use fourth nibble (0xF000).
        switch(address>>12){
            case 2:
                //Fall through to PPU registers.
            case 3:
                //PPU Registers
                switch(address&7){

                    //Read 0x2000, PPU Control Register
                    case 0x0:
                        return nes.cpu.mem[0x2000];

                    //Read 0x2001, PPU Masking Register
                    case 0x1:
                        return nes.cpu.mem[0x2001];

                    //Read 0x2002, PPU Status Register
                    case 0x2:
                        //Reset the scroll and vram address toggle.
                        nes.ppu.firstWrite = true;
                        //Get the value from memory.
                        var tmp = nes.cpu.mem[0x2002];
                        //Clear the vertical blank flag, for some reason reading the status register does this.
                        nes.cpu.mem[0x2002] &= 127;
                        //Return the status.
                        return tmp;

                    //Read 0x2003, Return 0
                    case 0x3:
                        return 0;

                    //Read 0x2004, Sprite Memory
                    case 0x4:
                        //Return the sprite memory at the previously set sprite ram address.
                        return nes.ppu.spriteMem[nes.ppu.sramAddress];

                    //Read 0x2005, Return 0
                    case 0x5:
                        return 0;

                    //Read 0x2006, Return 0
                    case 0x6:
                        return 0;

                    //Read 0x2007, VRAM
                    case 0x7:
                        //???
                        nes.ppu.cntsToAddress();
                        nes.ppu.regsToAddress();
                        //If address is in range 0x0000-0x3EFF, return buffered values.
                        if(nes.ppu.vramAddress <= 0x3EFF){
                            //Get the value from the previous read?
                            var tmp = nes.ppu.vramBufferedReadValue;
                            //Update buffered value.
                            if(nes.ppu.vramAddress < 0x2000){
                                //Not mirrored, get normally.
                                nes.ppu.vramBufferedReadValue = nes.ppu.vramMem[nes.ppu.vramAddress];
                                //Mapper latch access.
                                nes.mmc.latchAccess(nes.ppu.vramAddress);
                            }
                            else{
                                //Mirrored, take into account the address mirroring table.
                                nes.ppu.vramBufferedReadValue = nes.ppu.vramMem[nes.ppu.vramMirrorTable[nes.ppu.vramAddress]];
                            }
                        }
                        else{
                            //No buffering in this mem range, read normally.
                            var tmp = nes.ppu.vramMem[nes.ppu.vramMirrorTable[nes.ppu.vramAddress]];
                        }
                        //Increment the vram address by either 1 or 32, depending on bit 2 of the control register.
                        nes.ppu.vramAddress += 1+nes.ppu.f_addrInc*31;
                        //???
                        nes.ppu.cntsFromAddress();
                        nes.ppu.regsFromAddress();
                        //Return the value.
                        return tmp;

                }
                break;
            case 4:
                //Sound/Joypad Registers
                switch(address){

                    //Read 0x4015, Sound channel enable, DMC status
                    case 0x4015:
                        return nes.apu.readReg();

                    //Read 0x4016, Joystick 1
                    case 0x4016:
                        //Get the button state.
                        var tmp = nes.controllers.state1[this.joy1Strobe];
                        //Increment the strobe.
                        this.joy1Strobe++;
                        //Reset it to 0 if at 24.
                        if(this.joy1Strobe === 24){
                            this.joy1Strobe = 0;
                        }
                        //Return the button state.
                        return tmp;

                    //Read 0x4017, Joystick 2
                    case 0x4017:
                        //Get the button state.
                        var tmp = nes.controllers.state2[this.joy2Strobe];
                        //Increment the strobe.
                        this.joy2Strobe++;
                        //Reset it to 0 if at 24.
                        if(this.joy2Strobe === 24){
                            this.joy2Strobe = 0;
                        }
                        //Nintendo Zapper Emulation, FIXME
                        //if(this.mousePressed){
                        //   //Get a square around the mouse.
                        //   var sx = Math.max(0,this.mouseX-4);
                        //   var ex = Math.min(256,this.mouseX+4);
                        //   var sy = Math.max(0,this.mouseY-4);
                        //   var ey = Math.min(240,this.mouseY+4);
                        //   var w = 0;
                        //   //Loop through each pixel in the square.
                        //   for(var y=sy;y<ey;y++){
                        //       for(var x=sx;x<ex;x++){
                        //           //Check if a white pixel was clicked on.
                        //           if(nes.ppu.buffer[(y<<8)+x] === 0xFFFFFF){
                        //               w = 8;
                        //               break;
                        //           }
                        //       }
                        //   }
                        //   //???
                        //   w |= 16;
                        //   return (temp|w)&0xFFFF;
                        //}
                        //Return the button state.
                        return tmp;

                }
                break;
        }
        return 0;
    },

    /**
     * Loads the data banks from the rom(nes.rom).
     */

    loadROM:function nes_mappers_mmc0_loadROM(){
        //Load PRG-ROM.
        if(nes.rom.romCount > 1){
            //Load the two first banks into memory.
            this.load16kRomBank(0,0x8000);
            this.load16kRomBank(1,0xC000);
        }
        else{
            //Load the one bank into both memory locations:
            this.load16kRomBank(0,0x8000);
            this.load16kRomBank(0,0xC000);
        }
        //Load CHR-ROM.
        this.loadCHRROM();
        //Load the battery ram, if any.
        nes.loadBatteryRam();
        //Do Reset-Interrupt.
        nes.cpu.requestInterrupt(2);
    },

    /**
     * Loads the character rom banks from the rom(nes.rom).
     */

    loadCHRROM:function nes_mappers_mmc0_loadCHRROM(){
        //Check if the rom has VROM.
        if(nes.rom.vromCount > 0){
            if(nes.rom.vromCount === 1){
                this.load4kVromBank(0,0x0000);
                this.load4kVromBank(0,0x1000);
            }
            else{
                this.load4kVromBank(0,0x0000);
                this.load4kVromBank(1,0x1000);
            }
        }
    },

    /**
     * Loads the specified 8 kilobyte rom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load8kRomBank:function nes_mappers_mmc0_load8kRomBank(bank,address){
        //Load the rom bank into the specified address.
        nes.copyArrayElements(nes.rom.rom[parseInt(bank/2,10)%nes.rom.romCount],(bank%2)*8192,nes.cpu.mem,address,8192);
    },

    /**
     * Loads the specified 16 kilobyte rom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load16kRomBank:function nes_mappers_mmc0_load16kRomBank(bank,address){
        //Load the rom bank into the specified address.
        nes.copyArrayElements(nes.rom.rom[bank%nes.rom.romCount],0,nes.cpu.mem,address,16384);
    },

    /**
     * Loads the specified 32 kilobyte rom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load32kRomBank:function nes_mappers_mmc0_load32kRomBank(bank,address){
        //Load two 16kb banks into the specified address.
        this.load16kRomBank(bank*2,address);
        this.load16kRomBank(bank*2+1,address+16384);
    },

    /**
     * Loads the specified 1 kilobyte vrom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load1kVromBank:function nes_mappers_mmc0_load8kVromBank(bank,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            nes.copyArrayElements(nes.rom.vrom[parseInt(bank/4,10)%nes.rom.vromCount],0,nes.ppu.vramMem,(bank%4)*1024,1024);
            //Update vrom tiles.
            var vromTile = nes.rom.vromTile[bank4k];
            var baseIndex = address>>4;
            for(var i=0;i<64;i++){
                nes.ppu.ptTile[baseIndex+i] = vromTile[((bank%4)<<6)+i];
            }
        }
    },

    /**
     * Loads the specified 2 kilobyte vrom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load2kVromBank:function nes_mappers_mmc0_load2kVromBank(bank,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            nes.copyArrayElements(nes.rom.vrom[parseInt(bank/2,10)%nes.rom.vromCount],(bank%2)*2048,nes.ppu.vramMem,address,2048);
            //Update tiles.
            var vromTile = nes.rom.vromTile[bank4k];
            var baseIndex = address>>4;
            for(var i=0;i<128;i++){
                nes.ppu.ptTile[baseIndex+i] = vromTile[((bank%2)<<7)+i];
            }
        }
    },

    /**
     * Loads the specified 4 kilobyte vrom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load4kVromBank:function nes_mappers_mmc0_load4kVromBank(bank,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            nes.copyArrayElements(nes.rom.vrom[bank%nes.rom.vromCount],0,nes.ppu.vramMem,address,4096);
            nes.copyArrayElements(nes.rom.vromTile[bank%nes.rom.vromCount],0,nes.ppu.ptTile,address>>4,256);
        }
    },

    /**
     * Loads the specified 8 kilobyte vrom bank into the specified address in memory.
     * @param {Number} bank
     * @param {Number} address
     */

    load8kVromBank:function nes_mappers_mmc0_load8kVromBank(bankStart,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //Load two 4kb banks into the specified address.
            this.load4kVromBank((bankStart)%nes.rom.vromCount,address);
            this.load4kVromBank((bankStart+1)%nes.rom.vromCount,address+4096);
        }
    },

    /**
     * @ignore
     * Used by mmc2.
     */
     
    latchAccess:function nes_mappers_mmc0_latchAccess(address){},

    /**
     * @ignore
     * Used by mmc3.
     */

    clockIrqCounter:function nes_mappers_mmc0_clockIrqCounter(){}

};

//
//  Mapper 1
//____________//

/**
 * @namespace Memory Mapper 1, Nintendo MMC1
 * @augments nes.mappers.mmc0
 */

nes.mappers.mmc1 = nes.copyObject(nes.mappers.mmc0);

nes.applyObject(nes.mappers.mmc1,{

//Properties

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    regBuffer:0,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    regBufferCounter:0,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    mirroring:0,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    prgSwitchingArea:1,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    prgSwitchingSize:1,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    vromSwitchingSize:0,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    romSelectionReg0:0,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc1
     */

    romSelectionReg1:0,

//Methods

    /**
     * Resets the mapper.
     * @memberOf nes.mappers.mmc1
     */

    reset:function nes_mappers_mmc1_reset(){
        //Reset most the the mapper through the mmc0 reset method.
        nes.mappers.mmc0.reset.apply(this);
        //5-bit Buffer
        this.regBuffer = 0;
        this.regBufferCounter = 0;
        //Register 0 Values
        this.mirroring = 0;
        this.oneScreenMirroring = 0;//FromBF
        this.prgSwitchingArea = 1;
        this.prgSwitchingSize = 1;
        this.vromSwitchingSize = 0;
        //Register 1 Values
        this.romSelectionReg0 = 0;
        //Register 2 Values
        this.romSelectionReg1 = 0;
        //Reguster 3
        this.romBankSelect = 0;//FromBF
    },

    /**
     * Similar to nes.mappers.mmc0.write(), but intercepts writes to mmc1 specific addresses.
     * @param {Number} address
     * @param {Number} value
     * @memberOf nes.mappers.mmc1
     */

    write:function nes_mappers_mmc1_write(address,value){
        //Writes below mmc1 registers are handled by mmc0.
        if(address < 0x8000){
            return nes.mappers.mmc0.write.apply(this,arguments);
        }
        //See what should be done with the written value.
        if((value&128) !== 0){
            //Reset buffering.
            this.regBufferCounter = 0;
            this.regBuffer = 0;
            //Reset register.
            if(this.getRegNumber(address) === 0){
                this.prgSwitchingArea = 1;
                this.prgSwitchingSize = 1;
            }
        }
        else{
            //Continue buffering.
            this.regBuffer = (this.regBuffer&(0xFF-(1<<this.regBufferCounter)))|((value&1)<<this.regBufferCounter);
            this.regBufferCounter++;
            //???
            if(this.regBufferCounter === 5){
                //Use the buffered value.
                this.setReg(this.getRegNumber(address),this.regBuffer);
                //Reset buffer.
                this.regBuffer = 0;
                this.regBufferCounter = 0;
            }
        }
    },

    /**
     * Similar to nes.mappers.mmc0.setReg(), but intercepts writes to mmc1 specific registers.
     * @param {Number} reg
     * @param {Number} value
     * @memberOf nes.mappers.mmc1
     */

    setReg:function nes_mappers_mmc1_setReg(reg,value){
        switch(reg){

            //Register 0, PPU Mirroring, ROM loading flags.
            case 0:
                //Check if the ppu mirroring specified is different than the current.
                if(value&3 !== this.mirroring){
                    //Set the mirroring.
                    this.mirroring = value&3;
                    //Check for singlescreen mirroring.
                    if((this.mirroring&2) === 0){
                        nes.ppu.setMirroring(3);
                    }
                    //Else check for horizontal mirroring.
                    else if((this.mirroring&1) !== 0){
                        nes.ppu.setMirroring(1);
                    }
                    //Else set it as vertical mirroring.
                    else{
                        nes.ppu.setMirroring(0);
                    }
                }
                //Set the PRG wwitching area.
                this.prgSwitchingArea = (value>>2)&1;
                //Set the PRG switching size.
                this.prgSwitchingSize = (value>>3)&1;
                //Set the VROM switching size.
                this.vromSwitchingSize = (value>>4)&1;
                break;

            //Register 1
            case 1:
                //Set the ROM selection register 0 flag.
                this.romSelectionReg0 = (value>>4)&1;
                //Check whether the cart has VROM.
                if(nes.rom.vromCount > 0){
                    //Select VROM bank at 0x0000.
                    if(this.vromSwitchingSize === 0){
                        //Swap 8kb VROM, the location depends on the romSelectionReg0 flag.
                        this.load8kVromBank((value&0xF)+(this.romSelectionReg0*parseInt(nes.rom.vromCount/2,10)),0x0000);
                    }
                    else{
                        //Swap 4kb VROM, the location depends on the romSelectionReg0 flag.
                        this.load4kVromBank((value&0xF)+(this.romSelectionReg0*parseInt(nes.rom.vromCount/2,10)),0x0000);
                    }
                }
                break;

            //Register 2
            case 2:
                //Set the ROM selection register 1 flag.
                this.romSelectionReg1 = (value>>4)&1;
                //Check whether the cart has VROM.
                if(nes.rom.vromCount > 0){
                    //Select VROM bank at 0x1000.
                    if(this.vromSwitchingSize === 1){
                        //Swap 4kB of VROM, the location depends on the romSelectionReg1 flag.
                        this.load4kVromBank((value&0xF)+(this.romSelectionReg1*parseInt(nes.rom.vromCount/2,10)),0x1000);
                    }
                }
                break;

            //Register 3, ROM bank select.
            default:
                //Initiate the base bank as 0.
                var baseBank = 0;
                //Check for a size 1024 kb cart.
                if(nes.rom.romCount >= 32){
                    if(this.vromSwitchingSize === 0 && this.romSelectionReg0 === 1){
                        baseBank = 16;
                    }
                    else{
                        baseBank = (this.romSelectionReg0|(this.romSelectionReg1<<1))<<3;
                    }
                }
                //Else check for a size 512kb cart.
                else if(nes.rom.romCount >= 16){
                    //???
                    if(this.romSelectionReg0 === 1){
                        baseBank = 8;
                    }
                }
                //Check for 32kb of rom.
                if(this.prgSwitchingSize === 0){
                    //Load the rom bank.
                    this.load32kRomBank(baseBank+(value&0xF),0x8000);
                }
                //Else its 16kb or rom.
                else{
                    //Load the rom bank.
                    this.load16kRomBank(baseBank*2+(value&0xF),0xC000-(this.prgSwitchingArea*0x4000));
                }

        }
    },

    /**
     * Returns the the register number associated with the specified address.
     * @returns {Number}
     * @param {Number} address
     * @memberOf nes.mappers.mmc1
     */

    getRegNumber:function nes_mappers_mmc1_getRegNumber(address){
        //Return the value associated with the specified address.
        if(address >= 0x8000 && address <= 0x9FFF){
            return 0;
        }
        if(address >= 0xA000 && address <= 0xBFFF){
            return 1;
        }
        if(address >= 0xC000 && address <= 0xDFFF){
            return 2;
        }
        return 3;
    },

    /**
     * Loads the data banks from the rom(nes.rom).
     * @memberOf nes.mappers.mmc1
     */

    loadROM:function nes_mappers_mmc1_loadROM(rom){
        //Load PRG-ROM.
        this.load16kRomBank(0,0x8000);
        this.load16kRomBank(nes.rom.romCount-1,0xC000);
        //Load CHR-ROM.
        this.loadCHRROM();
        //Load the battery ram, if any.
        nes.loadBatteryRam();
        //Do Reset-Interrupt.
        nes.cpu.requestInterrupt(2);
    },

    //switchLowHighPrgRom:function nes_mappers_mmc1_switchLowHighPrgRom(oldSetting){},

    //switch16to32:function nes_mappers_mmc1_switch16to32(){},

    //switch32to16:function nes_mappers_mmc1_switch32to16(){},

});

//
//  Mapper 2
//____________//

/**
 * @namespace Memory Mapper 2, UNROM
 * @augments nes.mappers.mmc0
 */

nes.mappers.mmc2 = nes.copyObject(nes.mappers.mmc0);

nes.applyObject(nes.mappers.mmc2,{

    /**
     * Similar to nes.mappers.mmc0.write(), but intercepts writes to mmc2 specific addresses.
     * <br>
     * Member of nes.mappers.mmc2
     * @param {Number} address
     * @param {Number} value
     */

    write:function nes_mappers_mmc2_write(address,value){
        //Writes below mmc2 registers are handled by mmc0.
        if(address < 0x8000){
            return nes.mappers.mmc0.write.apply(this,arguments);
        }
        //This is a ROM bank select command.
        //Swap in the given ROM bank at 0x8000:
        this.load16kRomBank(value,0x8000);
    },

    /**
     * Loads the data banks from the rom(nes.rom).
     * Member of nes.mappers.mmc2
     */

    loadROM:function nes_mappers_mmc2_loadROM(){
        //Load PRG-ROM.
        this.load16kRomBank(0,0x8000);
        this.load16kRomBank(nes.rom.romCount-1,0xC000);
        //Load CHR-ROM.
        this.loadCHRROM();
        //Do Reset-Interrupt.
        nes.cpu.requestInterrupt(2);
    },

});

//
//  Mapper 4
//____________//

/**
 * @namespace Memory Mapper 4, Nintendo MMC3
 * @augments nes.mappers.mmc0
 */

nes.mappers.mmc4 = nes.copyObject(nes.mappers.mmc0);

nes.applyObject(nes.mappers.mmc4,{

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc4
     */

    command:null,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc4
     */

    prgAddressSelect:null,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc4
     */

    chrAddressSelect:null,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc4
     */

    irqCounter:null,

    /**
     * Unknown
     * @type Number
     * @memberOf nes.mappers.mmc4
     */

    irqLatchValue:null,

    /**
     * Unknown
     * @type Boolean
     * @memberOf nes.mappers.mmc4
     */

    irqEnable:false,

    /**
     * Unknown
     * @type Boolean
     * @memberOf nes.mappers.mmc4
     */

    prgAddressChanged:false,

    /**
     * Similar to nes.mappers.mmc0.write(), but intercepts writes to mmc4 specific addresses.
     * @param {Number} address
     * @param {Number} value
     * @memberOf nes.mappers.mmc4
     */

    write:function nes_mappers_mmc4_write(address,value){
        //Writes below mmc4 registers are handled by mmc0.
        if(address < 0x8000){
            return nes.mappers.mmc0.write.apply(this,arguments);
        }
        //Switch through the address(registers).
        switch(address){

            //Set Command/Address Register
            case 0x8000:
                //Set the command from the value.
                this.command = value&7;
                //Check to see if the program address specified in the value is different than the current one.
                if((value>>6)&1 !== this.prgAddressSelect){
                    //If so change it and flag it as having been changed.
                    this.prgAddressSelect = (value>>6)&1;
                    this.prgAddressChanged = true;
                }
                //Set the character address select flag from the value.
                this.chrAddressSelect = (value>>7)&1;
                break;

            //Execute Command
            case 0x8001:
                //Execute the command specified earlier with the specified value.
                this.executeCommand(this.command,value);
                break;

            //Set PPU Mirroring
            case 0xA000:
                //Set the ppu mirroring to vertical(0) or horizontal(1).
                nes.ppu.setMirroring(value&1);
                break;

            //SaveRAM Toggle
            case 0xA001:
                //Toggle the saveRAM, FIXME.
                //nes.rom.setSaveState((value&1) !== 0);
                break;

            //Interrupt Counter Register
            case 0xC000:
                //Set the interrupt counter to the value.
                this.irqCounter = value;
                //???
                //nes.ppu.mapperIrqCounter = 0;
                break;

            //Latch Interrupt Register
            case 0xC001:
                //Set the interrupt latch value.
                this.irqLatchValue = value;
                break;

            //Disable the Interrupt
            case 0xE000:
                //Set the interrupt enabled flag.
                this.irqEnable = 0;
                //???
                //irqCounter = irqLatchValue;
                break;

            //Enable the Interrupt
            case 0xE001:
                //Set the interrupt enabled flag.
                this.irqEnable = 1;
                break;

            //Unknown Register
            default:
                //Not a MMC4 register.
                //The game has probably crashed, since it tries to write to rom at invalid locations.

        }
    },

    /**
     * Runs the specified command with the passed argument.
     * @param {Number} command
     * @param {Number} argument
     * @memberOf nes.mappers.mmc4
     */

    executeCommand:function nes_mappers_mmc4_executeCommand(command,argument){
        switch(command){

            //Select 2 1kb VROM pages at 0x0000.
            case 0:
                //Load the 2 vrom banks specified by the character address flag.
                this.load1kVromBank(argument,this.chrAddressSelect*0x1000);
                this.load1kVromBank(argument+1,0x0400+(this.chrAddressSelect*0x1000));
                break;

            //Select 2 1kb VROM pages at 0x0800.
            case 1:
                //Load the 2 vrom banks specified by the character address flag.
                this.load1kVromBank(argument,0x0800+(this.chrAddressSelect*0x1000));
                this.load1kVromBank(argument+1,0x0C00+(this.chrAddressSelect*0x1000));
                break;

            //Select 1kb VROM Page at 0x1000.
            case 2:
                //Load the vrom bank specified by the character address select flag.
                this.load1kVromBank(argument,this.chrAddressSelect*0x1000);
                break;

            //Select 1k VROM Page at 0x1400.
            case 3:
                //Load the vrom bank specified by the character address select flag.
                this.load1kVromBank(argument,0x1400-(this.chrAddressSelect*0x1000));
                break;

            //Select 1k VROM Page at 0x1800.
            case 4:
                //Load the vrom bank specified by the character address select flag.
                this.load1kVromBank(argument,0x1800-(this.chrAddressSelect*0x1000));
                break;

            //Select 1k VROM Page at 0x1C00.
            case 5:
                //Load the vrom bank specified by the character address select flag.
                this.load1kVromBank(argument,0x1C00-(this.chrAddressSelect*0x1000));
                break;

            //Select ROM page 1.
            case 6:
                //Check if the rom bank address changed.
                if(this.prgAddressChanged){
                    //Load the hardwire bank specified by the program address select flag.
                    this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000-(this.prgAddressSelect*0x4000));
                    //Reset the address changed flag.
                    this.prgAddressChanged = false;
                }
                //Select first switchable ROM page.
                this.load8kRomBank(argument,0x8000+(this.prgAddressSelect*0x4000));
                break;

            //Select ROM page 2.
            case 7:
                //Select second switchable ROM page.
                this.load8kRomBank(argument,0xA000);
                //Check the the rom bank address changed.
                if(this.prgAddressChanged){
                    //Load the hardwired bank specified by the programm address select flag.
                    this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000-(this.prgAddressSelect*0x4000));
                    //Reset the address changed flag.
                    this.prgAddressChanged = false;
                }
                break;

        }
    },

    /**
     * Loads the data banks from the rom(nes.rom).
     * @memberOf nes.mappers.mmc4
     */

    loadROM:function nes_mappers_mmc4_loadROM(){
        //Load hardwired PRG banks, 0xC000 and 0xE000.
        this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000);
        this.load8kRomBank(((nes.rom.romCount-1)*2)+1,0xE000);
        //Load swappable PRG banks, 0x8000 and 0xA000.
        this.load8kRomBank(0,0x8000);
        this.load8kRomBank(1,0xA000);
        //Load CHR-ROM.
        this.loadCHRROM();
        //Load the battery ram, if any.
        nes.loadBatteryRam();
        //Do Reset-Interrupt.
        nes.cpu.requestInterrupt(2);
    }

});
