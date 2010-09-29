
nes.mappers = {};

//==============
//== Mapper 0 ==
//==============

nes.mappers[0] = function mmc0(){};

nes.mappers[0].prototype = {

    reset:function mmc0_reset(){

        //Reset the controller strobes.
        this.joy1Strobe = 0;
        this.joy2Strobe = 0;
        this.joypadLastWrite = 0;

        //Reset the mouse flags.
        this.mousePressed = false;
        this.mouseX = null;
        this.mouseY = null;

    },

    load:function mmc0_load(address){

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

    write:function mmc0_write(address,value){

        //Write the value into memory.
        nes.cpu.mem[address] = value;

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
                    //nes.apu.writeReg(address, value);
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
                    //nes.apu.writeReg(address, value);
                    break;

                //Write 0x4000-0x4017, Sound Registers
                default:
                    //nes.apu.writeReg(address,value);

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

    regLoad:function mmc0_regLoad(address){
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
                        return //nes.apu.readReg(address);

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

    loadROM:function mmc0_loadROM(){

        //Load PRG-ROM.
        if(nes.rom.romCount > 1){
            //Load the two first banks into memory.
            this.loadRomBank(0,0x8000);
            this.loadRomBank(1,0xC000);
        }
        else{
            //Load the one bank into both memory locations:
            this.loadRomBank(0,0x8000);
            this.loadRomBank(0,0xC000);
        }

        //Load CHR-ROM.
        this.loadCHRROM();

        //Load Battery RAM if present.
        this.loadBatteryRam();

        //Do Reset-Interrupt.
        nes.cpu.requestInterrupt(2);

    },

    //Load CHR-ROM

    loadCHRROM:function mmc0_loadCHRROM(){
        if(nes.rom.vromCount > 0){
            if(nes.rom.vromCount === 1){
                this.loadVromBank(0,0x0000);
                this.loadVromBank(0,0x1000);
            }
            else{
                this.loadVromBank(0,0x0000);
                this.loadVromBank(1,0x1000);
            }
        }
    },

    //Load Battery Ram

    loadBatteryRam:function mmc0_loadBatteryRam(){
        if(nes.rom.batteryRam){
            var ram = nes.rom.batteryRam;
            if(ram !== null && ram.length === 0x2000){
                //Load Battery RAM into memory.
                arraycopy(ram,0,nes.cpu.mem,0x6000,0x2000);
            }
        }
    },

    //Load ROM Banks

    loadRomBank:function mmc0_loadRomBank(bank,address){
        bank %= nes.rom.romCount;
        //Load the rom bank into the specified address.
        arraycopy(nes.rom.rom[bank],0,nes.cpu.mem,address,16384);
    },

    load8kRomBank:function mmc0_load8kRomBank(bank8k,address){
        //???
        var bank16k = parseInt(bank8k/2,10)%nes.rom.romCount;
        var offset = (bank8k%2)*8192;
        arraycopy(nes.rom.rom[bank16k],offset,nes.cpu.mem,address,8192);
    },

    load32kRomBank:function mmc0_load32kRomBank(bank,address){
        //Load two 16kb banks.
        this.loadRomBank((bank*2)%nes.rom.romCount,address);
        this.loadRomBank((bank*2+1)%nes.rom.romCount,address+16384);
    },

    //Load VROM Banks

    loadVromBank:function mmc0_loadVromBank(bank,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            arraycopy(nes.rom.vrom[bank%nes.rom.vromCount],0,nes.ppu.vramMem,address,4096);
            var vromTile = nes.rom.vromTile[bank % nes.rom.vromCount];
            arraycopy(vromTile,0,nes.ppu.ptTile,address>>4,256);
        }
    },

    load1kVromBank:function mmc0_load8kVromBank(bank1k,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            var bank4k = parseInt(bank1k/4,10)%nes.rom.vromCount;
            var bankoffset = (bank1k%4)*1024;
            arraycopy(nes.rom.vrom[bank4k],0,nes.ppu.vramMem,bankoffset,1024);
            //Update tiles.
            var vromTile = nes.rom.vromTile[bank4k];
            var baseIndex = address>>4;
            for(var i=0;i<64;i++){
                nes.ppu.ptTile[baseIndex+i] = vromTile[((bank1k%4)<<6)+i];
            }
        }
    },

    load2kVromBank:function mmc0_load2kVromBank(bank2k,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            var bank4k = parseInt(bank2k/2,10)%nes.rom.vromCount;
            var bankoffset = (bank2k%2)*2048;
            arraycopy(nes.rom.vrom[bank4k],bankoffset,nes.ppu.vramMem,address,2048);
            //Update tiles.
            var vromTile = nes.rom.vromTile[bank4k];
            var baseIndex = address >> 4;
            for(var i=0;i<128;i++){
                nes.ppu.ptTile[baseIndex+i] = vromTile[((bank2k%2)<<7)+i];
            }
        }
    },

    load8kVromBank:function mmc0_load8kVromBank(bank4kStart,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            this.loadVromBank((bank4kStart)%nes.rom.vromCount,address);
            this.loadVromBank((bank4kStart+1)%nes.rom.vromCount,address+4096);
        }
    },

    //Used by mmc3.
    clockIrqCounter:function mmc0_clockIrqCounter(){},

    //Used by mmc2.
    latchAccess:function mmc0_latchAccess(address){},

};

//==============
//== Mapper 1 ==
//==============

nes.mappers[1] = function mmc1(){};

nes.mappers[1].prototype = new nes.mappers[0]();

nes.mappers[1].prototype.reset = function mmc1_reset(){

    //Reset via the mmc0 reset method.
    nes.mappers[0].prototype.reset.apply(this);

    //5-bit buffer
    this.regBuffer = 0;
    this.regBufferCounter = 0;

    //Register 0
    this.mirroring = 0;
    this.oneScreenMirroring = 0;
    this.prgSwitchingArea = 1;
    this.prgSwitchingSize = 1;
    this.vromSwitchingSize = 0;

    //Register 1
    this.romSelectionReg0 = 0;

    //Register 2
    this.romSelectionReg1 = 0;

    //Register 3
    this.romBankSelect = 0;

};

nes.mappers[1].prototype.write = function mmc1_write(address,value){
    //Handle normal writes with the mmc0 write function.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
    }
    //See what should be done with the written value.
    if((value&128) !== 0){
        //Reset buffering.
        this.regBuffer = this.regBufferCounter = 0;
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

nes.mappers[1].prototype.setReg = function mmc1_setReg(reg,value){
    //Check the register.
    switch(reg){

        case 0:
            //Mirroring
            if(value&3 !== this.mirroring){
                //Set mirroring.
                this.mirroring = value&3;
                if((this.mirroring&2) === 0){
                    //SingleScreen mirroring overrides the other setting.
                    nes.ppu.setMirroring(3);
                }
                //Not overridden by SingleScreen mirroring.
                else if((this.mirroring&1) !== 0){
                    //Set horizontal mirroring.
                    nes.ppu.setMirroring(1);
                }
                else{
                    //Set vertical mirroring.
                    nes.ppu.setMirroring(0);
                }
            }
            //PRG Switching Area
            this.prgSwitchingArea = (value>>2)&1;
            //PRG Switching Size
            this.prgSwitchingSize = (value>>3)&1;
            //VROM Switching Size
            this.vromSwitchingSize = (value>>4)&1;
            break;

        case 1:
            //ROM selection.
            this.romSelectionReg0 = (value>>4)&1;
            //Check whether the cart has VROM.
            if(nes.rom.vromCount > 0){
                //Select VROM bank at 0x0000.
                if(this.vromSwitchingSize === 0){
                    //Swap 8kB VROM.
                    if(this.romSelectionReg0 === 0){
                        this.load8kVromBank((value&0xF),0x0000);
                    }
                    else{
                        this.load8kVromBank(parseInt(nes.rom.vromCount/2,10)+(value&0xF),0x0000);
                    }
                }
                else{
                    //Swap 4kB VROM.
                    if(this.romSelectionReg0 === 0){
                        this.loadVromBank((value&0xF),0x0000);
                    }
                    else{
                        this.loadVromBank(parseInt(nes.rom.vromCount/2,10)+(value&0xF),0x0000);
                    }
                }
            }
            break;

        case 2:
            //ROM selection:
            this.romSelectionReg1 = (value>>4)&1;
            //Check whether the cart has VROM.
            if(nes.rom.vromCount > 0){
                //Select VROM bank at 0x1000.
                if(this.vromSwitchingSize === 1){
                    //Swap 4kB of VROM.
                    if(this.romSelectionReg1 === 0){
                        this.loadVromBank((value&0xF),0x1000);
                    }
                    else{
                        this.loadVromBank(parseInt(nes.rom.vromCount/2,10)+(value&0xF),0x1000);
                    }
                }
            }
            break;

        default:
            //Select ROM bank.
            var baseBank = 0;
            //???
            if(nes.rom.romCount >= 32){
                //1024 kB cart
                if(this.vromSwitchingSize === 0){
                    if(this.romSelectionReg0 === 1){
                        baseBank = 16;
                    }
                }
                else{
                    baseBank = (this.romSelectionReg0|(this.romSelectionReg1<<1))<<3;
                }
            }
            else if(nes.rom.romCount >= 16){
                //512 kB cart
                if(this.romSelectionReg0 === 1){
                    baseBank = 8;
                }
            }
            //???
            if(this.prgSwitchingSize === 0){
                //32kB
                var bank = baseBank+(value&0xF);
                this.load32kRomBank(bank,0x8000);
            }
            else{
                //16kB
                var bank = baseBank*2+(value&0xF);
                if(this.prgSwitchingArea === 0){
                    this.loadRomBank(bank,0xC000);
                }
                else{
                    this.loadRomBank(bank,0x8000);
                }
            }
            break;

    }
};

nes.mappers[1].prototype.getRegNumber = function mmc1_getRegNumber(address){
    //Return the register number from the address written to.
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

nes.mappers[1].prototype.loadROM = function mmc1_loadROM(){

    //Load PRG-ROM, the first and last banks.
    this.loadRomBank(0,0x8000);
    this.loadRomBank(nes.rom.romCount-1,0xC000);

    //Load CHR-ROM.
    this.loadCHRROM();

    //Load Battery RAM if present.
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

nes.mappers[2] = function(){};

nes.mappers[2].prototype = new nes.mappers[0]();

nes.mappers[2].prototype.write = function mmc2_write(address,value){

    //Handle regular writes with the mmc0 write method.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
    }

    //This is a ROM bank select command.
    //Swap in the given ROM bank at 0x8000:
    this.loadRomBank(value,0x8000);

};

nes.mappers[2].prototype.loadROM = function mmc2_loadROM(){

    //Load PRG-ROM.
    this.loadRomBank(0,0x8000);
    this.loadRomBank(nes.rom.romCount-1,0xC000);

    //Load CHR-ROM.
    this.loadCHRROM();

    //Do Reset-Interrupt.
    nes.cpu.requestInterrupt(2);

};

//==============
//== Mapper 4 ==
//==============

nes.mappers[4] = function(){

    this.command = null;
    this.prgAddressSelect = null;
    this.chrAddressSelect = null;
    this.irqCounter = null;
    this.irqLatchValue = null;
    this.irqEnable = null;
    this.prgAddressChanged = false;

};

nes.mappers[4].prototype = new nes.mappers[0]();

nes.mappers[4].prototype.write = function mmc4_write(address,value){

    //Writes below MMC registers are handled by mmc0.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
    }

    switch(address){
        case 0x8000:
            //Command/Address Select register
            this.command = value&7;
            var tmp = (value>>6)&1;
            if(tmp !== this.prgAddressSelect){
                this.prgAddressChanged = true;
            }
            this.prgAddressSelect = tmp;
            this.chrAddressSelect = (value >> 7) & 1;
            break;
    
        case 0x8001:
            //Page number for command
            this.executeCommand(this.command, value);
            break;
    
        case 0xA000:
            //Mirroring select
            if((value & 1) !== 0){
                //Set vertical mirroring.
                nes.ppu.setMirroring(1);
            }
            else{
                //Set vertical mirroring.
                nes.ppu.setMirroring(0);
            }
            break;
        
        case 0xA001:
            //SaveRAM Toggle
            //TODO
            //nes.getRom().setSaveState((value&1)!=0);
            break;
    
        case 0xC000:
            //IRQ Counter register
            this.irqCounter = value;
            //nes.ppu.mapperIrqCounter = 0;
            break;
    
        case 0xC001:
            //IRQ Latch register
            this.irqLatchValue = value;
            break;
    
        case 0xE000:
            //IRQ Control Reg 0 (disable)
            //irqCounter = irqLatchValue;
            this.irqEnable = 0;
            break;
    
        case 0xE001:        
            //IRQ Control Reg 1 (enable)
            this.irqEnable = 1;
            break;
    
        default:
            //Not a MMC3 register.
            //The game has probably crashed, since it tries to write to ROM..
            //IGNORE.
    }
};

nes.mappers[4].prototype.executeCommand = function mmc4_executeCommand(cmd,arg){
    switch(cmd){

        //Select 2 1KB VROM pages at 0x0000.
        case 0:
            if(this.chrAddressSelect === 0){
                this.load1kVromBank(arg,0x0000);
                this.load1kVromBank(arg+1,0x0400);
            }
            else{
                this.load1kVromBank(arg,0x1000);
                this.load1kVromBank(arg+1,0x1400);
            }
            break;

        //Select 2 1KB VROM pages at 0x0800.
        case 1:
            if(this.chrAddressSelect === 0){
                this.load1kVromBank(arg,0x0800);
                this.load1kVromBank(arg+1,0x0C00);
            }
            else{
                this.load1kVromBank(arg,0x1800);
                this.load1kVromBank(arg+1,0x1C00);
            }
            break;

        //Select 1K VROM Page at 0x1000.
        case 2:
            if(this.chrAddressSelect === 0){
                this.load1kVromBank(arg,0x1000);
            }
            else{
                this.load1kVromBank(arg,0x0000);
            }
            break;

        //Select 1K VROM Page at 0x1400.
        case 3:
            if(this.chrAddressSelect === 0){
                this.load1kVromBank(arg,0x1400);
            }
            else{
                this.load1kVromBank(arg,0x0400);
            }
            break;

        //Select 1K VROM Page at 0x1800.
        case 4:
            if(this.chrAddressSelect === 0){
                this.load1kVromBank(arg,0x1800);
            }
            else{
                this.load1kVromBank(arg,0x0800);
            }
            break;

        //Select 1K VROM Page at 0x1C00.
        case 5:
            if(this.chrAddressSelect === 0){
                this.load1kVromBank(arg,0x1C00);
            }
            else{
                this.load1kVromBank(arg,0x0C00);
            }
            break;

        //Select ROM page 1.
        case 6:
            if(this.prgAddressChanged){
                //Load the two hardwired banks.
                if(this.prgAddressSelect === 0){
                    this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000);
                }
                else{
                    this.load8kRomBank(((nes.rom.romCount-1)*2),0x8000);
                }
                this.prgAddressChanged = false;
            }
            //Select first switchable ROM page.
            if(this.prgAddressSelect === 0){
                this.load8kRomBank(arg,0x8000);
            }
            else{
                this.load8kRomBank(arg,0xC000);
            }
            break;

        //Select ROM page 2.
        case 7:
            //Select second switchable ROM page.
            this.load8kRomBank(arg,0xA000);
            //Hardwire appropriate bank.
            if(this.prgAddressChanged){
                //Load the two hardwired banks.
                if(this.prgAddressSelect === 0){
                    this.load8kRomBank(((nes.rom.romCount-1)*2),0xC000);
                }
                else{
                    this.load8kRomBank(((nes.rom.romCount-1)*2),0x8000);
                }
                this.prgAddressChanged = false;
            }
            break;

    }
};

nes.mappers[4].prototype.loadROM = function mmc4_loadROM(){

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
