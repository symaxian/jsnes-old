
nes.mappers = {};

//==============
//== Mapper 0 ==
//==============

nes.mappers[0] = function nes_mappers_0(){};

nes.mappers[0].prototype = {

    reset:function nes_mappers_0_reset(){

        //Reset the controller strobes.
        this.joy1Strobe = 0;
        this.joy2Strobe = 0;
        this.joypadLastWrite = 0;

        //Reset the mouse flags.
        //this.mousePressed = false;
        //this.mouseX = null;
        //this.mouseY = null;

    },

    load:function nes_mappers_0_load(address){

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

    load16bit:function nes_cpu_load16Bit(addr){

        //Load two addresses from memory and combine them.
        return this.load(addr)|(this.load(addr+1)<<8);

    },

    write:function nes_mappers_0_write(address,value){

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
                    var baseAddress = value*0x100;
                    for(var i=nes.ppu.sramAddress;i<256;i++){
                        var data = nes.cpu.mem[baseAddress+i];
                        nes.ppu.spriteMem[i] = data;
                        nes.ppu.spriteRamWriteUpdate(i,data);
                    }
                    nes.cpu.haltCycles(513);
                    break;

                //Write 0x4015, Sound Channel Switch, DMC Status
                case 0x4015:
                    nes.apu.writeReg(address, value);
                    break;

                //Write 0x4016, Joystick Strobe Reset
                case 0x4016:
                    if(value === 0 && this.joypadLastWrite === 1){
                        this.joy1Strobe = 0;
                        this.joy2Strobe = 0;
                    }
                    this.joypadLastWrite = value;
                    break;

                //Write 0x4017, Sound Channel Frame Sequencer
                case 0x4017:
                    nes.apu.writeReg(address, value);
                    break;

                //Write 0x4000-0x4017, Sound Registers
                default:
                    nes.apu.writeReg(address,value);

            }
        }
        else{
            //ROM
            nes.cpu.mem[address] = value;
            //Battery RAM, FIXME
            if(address >= 0x6000 && address < 0x8000){
                //nes.rom.writeBatteryRam(address,value);
            }
        }

    },

    regLoad:function nes_mappers_0_regLoad(address){
        //use fourth nibble (0xF000)
        switch(address>>12){
            case 0:
            case 1:
                break;
            case 2:
            case 3:
                //PPU Registers
                switch(address&7){

                    //Read 0x2000, PPU Control Register
                    case 0x0: return nes.cpu.mem[0x2000];

                    //Read 0x2001, PPU Masking Register
                    case 0x1: return nes.cpu.mem[0x2001];

                    //Read 0x2002, PPU Status Register
                    case 0x2: return nes.ppu.readStatusRegister();

                    //Read 0x2003, Return 0
                    case 0x3: return 0;

                    //Read 0x2004, Sprite Memory
                    case 0x4: return nes.ppu.spriteMem[nes.ppu.sramAddress];

                    //Read 0x2005, Return 0
                    case 0x5: return 0;

                    //Read 0x2006, Return 0
                    case 0x6: return 0;

                    //Read 0x2007, VRAM
                    case 0x7: return nes.ppu.vramLoad();

                }
                break;

            case 4:
                //Sound/Joypad Registers
                switch(address){

                    //Read 0x4015, Sound channel enable, DMC status
                    case 0x4015:
                        return nes.apu.readReg(address);

                    //Read 0x4016, Joystick 1
                    case 0x4016:

                        //Get the button state.
                        var temp = nes.controllers.state1[this.joy1Strobe];

                        //Increment the strobe.
                        this.joy1Strobe++;

                        //Reset it to 0 if at 24.
                        if(this.joy1Strobe === 24){
                            this.joy1Strobe = 0;
                        }

                        //Return the button state.
                        return temp;

                    //Read 0x4017, Joystick 2
                    case 0x4017:

                        //Get the button state.
                        var temp = nes.controllers.state2[this.joy2Strobe];

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
                        //               console.log('Clicked on white!');
                        //               break;
                        //           }
                        //       }
                        //   }
                        //   //???
                        //   w |= 16;
                        //   return (temp|w)&0xFFFF;
                        //}

                        //Return the button state.
                        return temp;

                }
                break;
        }
        return 0;
    },

    //Load ROM

    loadROM:function nes_mappers_0_loadROM(){

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

        //Load Battery RAM if present.
        this.loadBatteryRam();

        //Do Reset-Interrupt.
        nes.cpu.requestInterrupt(2);

    },

    //Load CHR-ROM

    loadCHRROM:function nes_mappers_0_loadCHRROM(){
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

    //Load Battery Ram

    loadBatteryRam:function nes_mappers_0_loadBatteryRam(){
        //Check if the rom has batteryRAM.
        if(nes.rom.batteryRam){
            var ram = nes.rom.batteryRam;
            if(ram !== null && ram.length === 0x2000){
                //Load Battery RAM into memory.
                nes.copyArrayElements(ram,0,nes.cpu.mem,0x6000,0x2000);
            }
        }
    },

    //Load ROM Banks

    load8kRomBank:function nes_mappers_0_load8kRomBank(bank,address){
        //Load the rom bank into the specified address.
        nes.copyArrayElements(nes.rom.rom[parseInt(bank/2,10)%nes.rom.romCount],(bank%2)*8192,nes.cpu.mem,address,8192);
    },

    load16kRomBank:function nes_mappers_0_load16kRomBank(bank,address){
        //Load the rom bank into the specified address.
        nes.copyArrayElements(nes.rom.rom[bank%nes.rom.romCount],0,nes.cpu.mem,address,16384);
    },

    load32kRomBank:function nes_mappers_0_load32kRomBank(bank,address){
        //Load two 16kb banks into the specified address.
        this.load16kRomBank(bank*2,address);
        this.load16kRomBank(bank*2+1,address+16384);
    },

    //Load VROM Banks

    load1kVromBank:function nes_mappers_0_load8kVromBank(bank,address){
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

    load2kVromBank:function nes_mappers_0_load2kVromBank(bank,address){
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

    load4kVromBank:function nes_mappers_0_load4kVromBank(bank,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            nes.copyArrayElements(nes.rom.vrom[bank%nes.rom.vromCount],0,nes.ppu.vramMem,address,4096);
            nes.copyArrayElements(nes.rom.vromTile[bank%nes.rom.vromCount],0,nes.ppu.ptTile,address>>4,256);
        }
    },

    load8kVromBank:function nes_mappers_0_load8kVromBank(bankStart,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //Load two 4kb banks into the specified address.
            this.load4kVromBank((bankStart)%nes.rom.vromCount,address);
            this.load4kVromBank((bankStart+1)%nes.rom.vromCount,address+4096);
        }
    },

    //Used by mmc3.
    clockIrqCounter:function nes_mappers_0_clockIrqCounter(){},

    //Used by mmc2.
    latchAccess:function nes_mappers_0_latchAccess(address){},

};

//==============
//== Mapper 1 ==
//==============

nes.mappers[1] = function nes_mappers_1(){};

nes.mappers[1].prototype = new nes.mappers[0]();

nes.mappers[1].prototype.reset = function nes_mappers_1_reset(){

    //Reset most the the mapper through the mapper0 reset method.
    nes.mappers[0].prototype.reset.apply(this);

    //5-bit Buffer
    this.regBuffer = 0;
    this.regBufferCounter = 0;

    //Register 0 Values
    this.mirroring = 0;
    this.oneScreenMirroring = 0;
    this.prgSwitchingArea = 1;
    this.prgSwitchingSize = 1;
    this.vromSwitchingSize = 0;

    //Register 1 Values
    this.romSelectionReg0 = 0;

    //Register 2 Values
    this.romSelectionReg1 = 0;

    //Register 3 Values
    this.romBankSelect = 0;

};

nes.mappers[1].prototype.write = function nes_mappers_1_write(address,value){

    //Writes below mmc1 registers are handled by mmc0.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
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
};

nes.mappers[1].prototype.setReg = function nes_mappers_1_setReg(reg,value){
    switch(reg){

        //Register 1, PPU Mirroring, ROM loading flags.
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
};

//Returns the register number from the address written to.
nes.mappers[1].prototype.getRegNumber = function(address){
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
};

nes.mappers[1].prototype.loadROM = function(rom){

    //Load PRG-ROM.
    this.load16kRomBank(0,0x8000);
    this.load16kRomBank(nes.rom.romCount-1,0xC000);

    //Load CHR-ROM.
    this.loadCHRROM();

    //Load Battery RAM.
    this.loadBatteryRam();

    //Do Reset-Interrupt.
    nes.cpu.requestInterrupt(2);

};

//FIXME

nes.mappers[1].prototype.switchLowHighPrgRom = function mmc1_switchLowHighPrgRom(oldSetting){};

nes.mappers[1].prototype.switch16to32 = function mmc1_switch16to32(){};

nes.mappers[1].prototype.switch32to16 = function mmc1_switch32to16(){};

//==============
//== Mapper 2 ==
//==============

nes.mappers[2] = function mmc2(){};

nes.mappers[2].prototype = new nes.mappers[0]();

nes.mappers[2].prototype.write = function mmc2_write(address,value){

    //Writes below mmc2 registers are handled by mmc0.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
    }

    //This is a ROM bank select command.
    //Swap in the given ROM bank at 0x8000:
    this.load16kRomBank(value,0x8000);

};

nes.mappers[2].prototype.loadROM = function mmc2_loadROM(){

    //Load PRG-ROM.
    this.load16kRomBank(0,0x8000);
    this.load16kRomBank(nes.rom.romCount-1,0xC000);

    //Load CHR-ROM.
    this.loadCHRROM();

    //Do Reset-Interrupt.
    nes.cpu.requestInterrupt(2);

};

//==============
//== Mapper 4 ==
//==============

nes.mappers[4] = function nes_mappers_4(){

    //Initiate some needed variables.
    this.command = null;
    this.prgAddressSelect = null;
    this.chrAddressSelect = null;
    this.irqCounter = null;
    this.irqLatchValue = null;
    this.irqEnable = null;
    this.prgAddressChanged = false;

};

nes.mappers[4].prototype = new nes.mappers[0]();

nes.mappers[4].prototype.write = function nes_mappers_4_write(address,value){

    //Writes below mmc4 registers are handled by mmc0.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
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
            //The game has probably crashed, since it tries to write to ROM...

    }
};

nes.mappers[4].prototype.executeCommand = function nes_mappers_4_executeCommand(cmd,arg){
    switch(cmd){

        //Select 2 1kb VROM pages at 0x0000.
        case 0:
            //Load the 2 vrom banks specified by the character address flag.
            this.load1kVromBank(arg,this.chrAddressSelect*0x1000);
            this.load1kVromBank(arg+1,0x0400+(this.chrAddressSelect*0x1000));
            break;

        //Select 2 1kb VROM pages at 0x0800.
        case 1:
            //Load the 2 vrom banks specified by the character address flag.
            this.load1kVromBank(arg,0x0800+(this.chrAddressSelect*0x1000));
            this.load1kVromBank(arg+1,0x0C00+(this.chrAddressSelect*0x1000));
            break;

        //Select 1kb VROM Page at 0x1000.
        case 2:
            //Load the vrom bank specified by the character address select flag.
            this.load1kVromBank(arg,this.chrAddressSelect*0x1000);
            break;

        //Select 1k VROM Page at 0x1400.
        case 3:
            //Load the vrom bank specified by the character address select flag.
            this.load1kVromBank(arg,0x1400-(this.chrAddressSelect*0x1000));
            break;

        //Select 1k VROM Page at 0x1800.
        case 4:
            //Load the vrom bank specified by the character address select flag.
            this.load1kVromBank(arg,0x1800-(this.chrAddressSelect*0x1000));
            break;

        //Select 1k VROM Page at 0x1C00.
        case 5:
            //Load the vrom bank specified by the character address select flag.
            this.load1kVromBank(arg,0x1C00-(this.chrAddressSelect*0x1000));
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
            this.load8kRomBank(arg,0x8000+(this.prgAddressSelect*0x4000));
            break;

        //Select ROM page 2.
        case 7:
            //Select second switchable ROM page.
            this.load8kRomBank(arg,0xA000);
            //Check the the rom bank address changed.
            if(this.prgAddressChanged){
                //Load the hardwired bank specified by the programm address select flag.
                this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000-(this.prgAddressSelect*0x4000));
                //Reset the address changed flag.
                this.prgAddressChanged = false;
            }
            break;

    }
};

nes.mappers[4].prototype.loadROM = function nes_mappers_4_loadROM(){

    //Load hardwired PRG banks, 0xC000 and 0xE000.
    this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000);
    this.load8kRomBank(((nes.rom.romCount-1)*2)+1,0xE000);

    //Load swappable PRG banks, 0x8000 and 0xA000.
    this.load8kRomBank(0,0x8000);
    this.load8kRomBank(1,0xA000);

    //Load CHR-ROM.
    this.loadCHRROM();

    //Load Battery RAM if present.
    this.loadBatteryRam();

    //Do Reset-Interrupt.
    nes.cpu.requestInterrupt(2);

};
