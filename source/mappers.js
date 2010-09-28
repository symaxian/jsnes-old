
nes.mappers = {};

//==============
//== Mapper 0 ==
//==============

nes.mappers[0] = function(){
};

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

    write:function mmc0_write(address,value){

        //Check the address.
        if(address<0x2000){
            //RAM
            nes.cpu.mem[address&0x7FF] = value;
        }
        else if(address>0x4017){
            //ROM
            nes.cpu.mem[address] = value;
            //Battery RAM, FIXME
            if(address >= 0x6000 && address < 0x8000){
                //nes.rom.writeBatteryRam(address,value);
            }
        }
        else if(address > 0x2007 && address < 0x4000){
            //Registers
            this.regWrite(0x2000+(address&0x7),value);
        }
        else{
            //Registers
            this.regWrite(address,value);
        }

    },

    load:function mmc0_load(address){

        //Wrap around.
        //address &= 0xFFFF;

        //Check the address.
        if(address < 0x2000){
            //RAM
            return nes.cpu.mem[address&0x7FF];
        }
        if(address > 0x4017){
            //ROM
            return nes.cpu.mem[address];
        }
        else if(address >= 0x2000){
            //Registers
            return this.regLoad(address);
        }

    },

    regLoad:function mmc0_regLoad(address){
        switch (address >> 12) { // use fourth nibble (0xF000)
            case 0:
                break;
            
            case 1:
                break;
            
            case 2:
                // Fall through to case 3
            case 3:
                // PPU Registers
                switch(address & 0x7){
                    case 0x0:
                        // 0x2000:
                        // PPU Control Register 1.
                        // (the value is stored both
                        // in main memory and in the
                        // PPU as flags):
                        // (not in the real NES)
                        return nes.cpu.mem[0x2000];
                    
                    case 0x1:
                        // 0x2001:
                        // PPU Control Register 2.
                        // (the value is stored both
                        // in main memory and in the
                        // PPU as flags):
                        // (not in the real NES)
                        return nes.cpu.mem[0x2001];
                    
                    case 0x2:
                        // 0x2002:
                        // PPU Status Register.
                        // The value is stored in
                        // main memory in addition
                        // to as flags in the PPU.
                        // (not in the real NES)
                        return nes.ppu.readStatusRegister();
                    
                    case 0x3:
                        return 0;
                    
                    case 0x4:
                        // 0x2004:
                        // Sprite Memory read.
                        return nes.ppu.sramLoad();
                    case 0x5:
                        return 0;
                    
                    case 0x6:
                        return 0;
                    
                    case 0x7:
                        // 0x2007:
                        // VRAM read:
                        return nes.ppu.vramLoad();
                }
                break;
            case 4:

                //Sound/Joypad Registers
                switch(address){

                    case 0x4015:
                        //Read 0x4015, sound channel enable, DMC status
                        return //nes.apu.readReg(address);

                    case 0x4016:
                        //Read 0x4016, Joystick 1

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

                    case 0x4017:
                        //Read 0x4017, Joystick 2

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
                        //    //Get a square around the mouse.
                        //    var sx = Math.max(0,this.mouseX-4);
                        //    var ex = Math.min(256,this.mouseX+4);
                        //    var sy = Math.max(0,this.mouseY-4);
                        //    var ey = Math.min(240,this.mouseY+4);
                        //    var w = 0;
                        //    //Loop through each pixel in the square.
                        //    for(var y=sy;y<ey;y++){
                        //        for(var x=sx;x<ex;x++){
                        //            //Check if a white pixel was clicked on.
                        //            if(nes.ppu.buffer[(y<<8)+x] === 0xFFFFFF){
                        //                w = 8;
                        //                console.log('Clicked on white!');
                        //                break;
                        //            }
                        //        }
                        //    }
                        //    //???
                        //    w |= 16;
                        //    return (temp|w)&0xFFFF;
                        //}

                        //Return the button state.
                        return temp;

                }
                break;
        }
        return 0;
    },

    regWrite:function mmc0_regWrite(address,value){
        switch(address){
            case 0x2000:
                // PPU Control register 1
                nes.cpu.mem[address] = value;
                nes.ppu.updateControlReg1(value);
                break;
            
            case 0x2001:
                // PPU Control register 2
                nes.cpu.mem[address] = value;
                nes.ppu.updateControlReg2(value);
                break;
            
            case 0x2003:
                // Set Sprite RAM address:
                nes.ppu.writeSRAMAddress(value);
                break;
            
            case 0x2004:
                // Write to Sprite RAM:
                nes.ppu.sramWrite(value);
                break;
            
            case 0x2005:
                // Screen Scroll offsets:
                nes.ppu.scrollWrite(value);
                break;
            
            case 0x2006:
                // Set VRAM address:
                nes.ppu.writeVRAMAddress(value);
                break;
            
            case 0x2007:
                // Write to VRAM:
                nes.ppu.vramWrite(value);
                break;
            
            case 0x4014:
                // Sprite Memory DMA Access
                nes.ppu.sramDMA(value);
                break;
            
            case 0x4015:
                // Sound Channel Switch, DMC Status
                //nes.apu.writeReg(address, value);
                break;
            
            case 0x4016:
                //Write 0x4016, Joystick Strobe Reset
                if(value === 0 && this.joypadLastWrite === 1){
                    this.joy1Strobe = 0;
                    this.joy2Strobe = 0;
                }
                this.joypadLastWrite = value;
                break;
            
            case 0x4017:
                // Sound channel frame sequencer:
                //nes.apu.writeReg(address, value);
                break;
            
            default:
                // Sound registers
                if(address >= 0x4000 && address <= 0x4017){
                    //nes.apu.writeReg(address,value);
                }

        }
    },

    loadROM:function(){

        // Load ROM into memory:
        this.loadPRGROM();

        // Load CHR-ROM:
        this.loadCHRROM();

        // Load Battery RAM (if present):
        this.loadBatteryRam();

        // Reset IRQ:
        //nes.getCpu().doResetInterrupt();
        nes.cpu.requestIrq(2);

    },

    loadPRGROM:function(){
        if(nes.rom.romCount > 1){
            // Load the two first banks into memory.
            this.loadRomBank(0,0x8000);
            this.loadRomBank(1,0xC000);
        }
        else{
            // Load the one bank into both memory locations:
            this.loadRomBank(0,0x8000);
            this.loadRomBank(0,0xC000);
        }
    },

    loadCHRROM:function(){
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

    loadBatteryRam:function(){
        if(nes.rom.batteryRam){
            var ram = nes.rom.batteryRam;
            if(ram !== null && ram.length === 0x2000){
                //Load Battery RAM into memory.
                arraycopy(ram,0,nes.cpu.mem,0x6000,0x2000);
            }
        }
    },

    loadRomBank:function(bank,address){
        bank %= nes.rom.romCount;
        //Load the rom bank into the specified address.
        arraycopy(nes.rom.rom[bank],0,nes.cpu.mem,address,16384);
    },

    load32kRomBank:function(bank,address){
        //Load two 16kb banks.
        this.loadRomBank((bank*2)%nes.rom.romCount,address);
        this.loadRomBank((bank*2+1)%nes.rom.romCount,address+16384);
    },

    loadVromBank: function(bank, address) {
        if(nes.rom.vromCount !== 0){
            nes.ppu.triggerRendering();

            arraycopy(nes.rom.vrom[bank%nes.rom.vromCount],0,nes.ppu.vramMem,address,4096);

            var vromTile = nes.rom.vromTile[bank % nes.rom.vromCount];
            arraycopy(vromTile,0,nes.ppu.ptTile,address>>4,256);
        }
    },

    load8kVromBank: function(bank4kStart,address){
        if(nes.rom.vromCount !== 0){
            //???
            nes.ppu.triggerRendering();
            //???
            this.loadVromBank((bank4kStart)%nes.rom.vromCount,address);
            this.loadVromBank((bank4kStart+1)%nes.rom.vromCount,address+4096);
        }
    },

    load1kVromBank:function(bank1k,address){
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

    load2kVromBank:function(bank2k,address){
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

    load8kRomBank:function(bank8k,address){
        var bank16k = parseInt(bank8k/2,10)%nes.rom.romCount;
        var offset = (bank8k%2)*8192;
        //nes.cpu.mem.write(address,nes.rom.rom[bank16k],offset,8192);
        arraycopy(nes.rom.rom[bank16k],offset,nes.cpu.mem,address,8192);
    },

    clockIrqCounter: function() {
        //Used by MMC3.
    },

    latchAccess: function(address) {
        //Used by MMC2.
    },

};

//==============
//== Mapper 1 ==
//==============

nes.mappers[1] = function(nes) {
};

nes.mappers[1].prototype = new nes.mappers[0]();

nes.mappers[1].prototype.reset = function() {
    nes.mappers[0].prototype.reset.apply(this);
    
    // 5-bit buffer:
    this.regBuffer = 0;
    this.regBufferCounter = 0;

    // Register 0:
    this.mirroring = 0;
    this.oneScreenMirroring = 0;
    this.prgSwitchingArea = 1;
    this.prgSwitchingSize = 1;
    this.vromSwitchingSize = 0;

    // Register 1:
    this.romSelectionReg0 = 0;

    // Register 2:
    this.romSelectionReg1 = 0;

    // Register 3:
    this.romBankSelect = 0;
};

nes.mappers[1].prototype.write = function(address, value) {
    // Writes to addresses other than MMC registers are handled by NoMapper.
    if (address < 0x8000) {
        nes.mappers[0].prototype.write.apply(this, arguments);
        return;
    }

    // See what should be done with the written value:
    if ((value & 128) !== 0) {

        // Reset buffering:
        this.regBufferCounter = 0;
        this.regBuffer = 0;
    
        // Reset register:
        if (this.getRegNumber(address) === 0) {
        
            this.prgSwitchingArea = 1;
            this.prgSwitchingSize = 1;
        
        }
    }
    else {
    
        // Continue buffering:
        //regBuffer = (regBuffer & (0xFF-(1<<regBufferCounter))) | ((value & (1<<regBufferCounter))<<regBufferCounter);
        this.regBuffer = (this.regBuffer & (0xFF - (1 << this.regBufferCounter))) | ((value & 1) << this.regBufferCounter);
        this.regBufferCounter++;
        
        if (this.regBufferCounter == 5) {
            // Use the buffered value:
            this.setReg(this.getRegNumber(address), this.regBuffer);
        
            // Reset buffer:
            this.regBuffer = 0;
            this.regBufferCounter = 0;
        }
    }
};

nes.mappers[1].prototype.setReg = function(reg, value) {
    var tmp;

    switch (reg) {
        case 0:
            // Mirroring:
            tmp = value & 3;
            if (tmp !== this.mirroring) {
                // Set mirroring:
                this.mirroring = tmp;
                if ((this.mirroring & 2) === 0) {
                    // SingleScreen mirroring overrides the other setting:
                    nes.ppu.setMirroring(3);
                }
                // Not overridden by SingleScreen mirroring.
                else if ((this.mirroring & 1) !== 0){
                    //Set horizontal mirroring.
                    nes.ppu.setMirroring(1);
                }
                else{
                    //Set vertical mirroring.
                    nes.ppu.setMirroring(0);
                }
            }
    
            // PRG Switching Area;
            this.prgSwitchingArea = (value >> 2) & 1;
    
            // PRG Switching Size:
            this.prgSwitchingSize = (value >> 3) & 1;
    
            // VROM Switching Size:
            this.vromSwitchingSize = (value >> 4) & 1;
        
            break;
    
        case 1:
            // ROM selection:
            this.romSelectionReg0 = (value >> 4) & 1;
    
            // Check whether the cart has VROM:
            if (nes.rom.vromCount > 0) {
        
                // Select VROM bank at 0x0000:
                if (this.vromSwitchingSize === 0) {
        
                    // Swap 8kB VROM:
                    if (this.romSelectionReg0 === 0) {
                        this.load8kVromBank((value & 0xF), 0x0000);
                    }
                    else {
                        this.load8kVromBank(
                            parseInt(nes.rom.vromCount / 2, 10) +
                                (value & 0xF), 
                            0x0000
                        );
                    }
            
                }
                else {
                    // Swap 4kB VROM:
                    if (this.romSelectionReg0 === 0) {
                        this.loadVromBank((value & 0xF), 0x0000);
                    }
                    else {
                        this.loadVromBank(
                            parseInt(nes.rom.vromCount / 2, 10) +
                                (value & 0xF),
                            0x0000
                        );
                    }
                }
            }
        
            break;
    
        case 2:
            // ROM selection:
            this.romSelectionReg1 = (value >> 4) & 1;
    
            // Check whether the cart has VROM:
            if (nes.rom.vromCount > 0) {
                
                // Select VROM bank at 0x1000:
                if (this.vromSwitchingSize === 1) {
                    // Swap 4kB of VROM:
                    if (this.romSelectionReg1 === 0) {
                        this.loadVromBank((value & 0xF), 0x1000);
                    }
                    else {
                        this.loadVromBank(
                            parseInt(nes.rom.vromCount / 2, 10) +
                                (value & 0xF),
                            0x1000
                        );
                    }
                }
            }
            break;
    
        default:
            // Select ROM bank:
            // -------------------------
            tmp = value & 0xF;
            var bank;
            var baseBank = 0;
    
            if (nes.rom.romCount >= 32) {
                // 1024 kB cart
                if (this.vromSwitchingSize === 0) {
                    if (this.romSelectionReg0 === 1) {
                        baseBank = 16;
                    }
                }
                else {
                    baseBank = (this.romSelectionReg0 
                                | (this.romSelectionReg1 << 1)) << 3;
                }
            }
            else if (nes.rom.romCount >= 16) {
                // 512 kB cart
                if (this.romSelectionReg0 === 1) {
                    baseBank = 8;
                }
            }
    
            if (this.prgSwitchingSize === 0) {
                // 32kB
                bank = baseBank + (value & 0xF);
                this.load32kRomBank(bank, 0x8000);
            }
            else {
                // 16kB
                bank = baseBank * 2 + (value & 0xF);
                if (this.prgSwitchingArea === 0) {
                    this.loadRomBank(bank, 0xC000);
                }
                else {
                    this.loadRomBank(bank, 0x8000);
                }
            }  
    }
};

// Returns the register number from the address written to:
nes.mappers[1].prototype.getRegNumber = function(address) {
    if (address >= 0x8000 && address <= 0x9FFF) {
        return 0;
    }
    else if (address >= 0xA000 && address <= 0xBFFF) {
        return 1;
    }
    else if (address >= 0xC000 && address <= 0xDFFF) {
        return 2;
    }
    else {
        return 3;
    }
};

nes.mappers[1].prototype.loadROM = function(rom) {

    // Load PRG-ROM:
    this.loadRomBank(0, 0x8000);                         //   First ROM bank..
    this.loadRomBank(nes.rom.romCount - 1, 0xC000); // ..and last ROM bank.

    // Load CHR-ROM:
    this.loadCHRROM();

    // Load Battery RAM (if present):
    this.loadBatteryRam();

    // Do Reset-Interrupt:
    nes.cpu.requestIrq(2);
};

nes.mappers[1].prototype.switchLowHighPrgRom = function(oldSetting) {
    // not yet.
};

nes.mappers[1].prototype.switch16to32 = function() {
    // not yet.
};

nes.mappers[1].prototype.switch32to16 = function() {
    // not yet.
};

//==============
//== Mapper 2 ==
//==============

nes.mappers[2] = function() {
};

nes.mappers[2].prototype = new nes.mappers[0]();

nes.mappers[2].prototype.write = function(address, value) {
    // Writes to addresses other than MMC registers are handled by NoMapper.
    if (address < 0x8000) {
        nes.mappers[0].prototype.write.apply(this, arguments);
        return;
    }

    else {
        // This is a ROM bank select command.
        // Swap in the given ROM bank at 0x8000:
        this.loadRomBank(value, 0x8000);
    }
};

nes.mappers[2].prototype.loadROM = function(rom) {

    // Load PRG-ROM:
    this.loadRomBank(0, 0x8000);
    this.loadRomBank(nes.rom.romCount - 1, 0xC000);

    // Load CHR-ROM:
    this.loadCHRROM();

    // Do Reset-Interrupt:
    nes.cpu.requestIrq(2);
};

//==============
//== Mapper 4 ==
//==============

nes.mappers[4] = function() {
    
    this.CMD_SEL_2_1K_VROM_0000 = 0;
    this.CMD_SEL_2_1K_VROM_0800 = 1;
    this.CMD_SEL_1K_VROM_1000 = 2;
    this.CMD_SEL_1K_VROM_1400 = 3;
    this.CMD_SEL_1K_VROM_1800 = 4;
    this.CMD_SEL_1K_VROM_1C00 = 5;
    this.CMD_SEL_ROM_PAGE1 = 6;
    this.CMD_SEL_ROM_PAGE2 = 7;
    
    this.command = null;
    this.prgAddressSelect = null;
    this.chrAddressSelect = null;
    this.pageNumber = null;
    this.irqCounter = null;
    this.irqLatchValue = null;
    this.irqEnable = null;
    this.prgAddressChanged = false;
};

nes.mappers[4].prototype = new nes.mappers[0]();

nes.mappers[4].prototype.write = function(address, value) {

    //Writes below MMC registers are handled by mmc0.
    if(address < 0x8000){
        return nes.mappers[0].prototype.write.apply(this,arguments);
    }

    switch (address) {
        case 0x8000:
            // Command/Address Select register
            this.command = value & 7;
            var tmp = (value >> 6) & 1;
            if (tmp != this.prgAddressSelect) {
                this.prgAddressChanged = true;
            }
            this.prgAddressSelect = tmp;
            this.chrAddressSelect = (value >> 7) & 1;
            break;
    
        case 0x8001:
            // Page number for command
            this.executeCommand(this.command, value);
            break;
    
        case 0xA000:
            // Mirroring select
            if ((value & 1) !== 0) {
                //Set vertical mirroring.
                nes.ppu.setMirroring(1);
            }
            else{
                //Set vertical mirroring.
                nes.ppu.setMirroring(0);
            }
            break;
        
        case 0xA001:
            // SaveRAM Toggle
            // TODO
            //nes.getRom().setSaveState((value&1)!=0);
            break;
    
        case 0xC000:
            // IRQ Counter register
            this.irqCounter = value;
            //nes.ppu.mapperIrqCounter = 0;
            break;
    
        case 0xC001:
            // IRQ Latch register
            this.irqLatchValue = value;
            break;
    
        case 0xE000:
            // IRQ Control Reg 0 (disable)
            //irqCounter = irqLatchValue;
            this.irqEnable = 0;
            break;
    
        case 0xE001:        
            // IRQ Control Reg 1 (enable)
            this.irqEnable = 1;
            break;
    
        default:
            // Not a MMC3 register.
            // The game has probably crashed,
            // since it tries to write to ROM..
            // IGNORE.
    }
};

nes.mappers[4].prototype.executeCommand = function(cmd, arg) {
    switch (cmd) {
        case this.CMD_SEL_2_1K_VROM_0000:
            // Select 2 1KB VROM pages at 0x0000:
            if (this.chrAddressSelect === 0) {
                this.load1kVromBank(arg, 0x0000);
                this.load1kVromBank(arg + 1, 0x0400);
            }
            else {
                this.load1kVromBank(arg, 0x1000);
                this.load1kVromBank(arg + 1, 0x1400);
            }
            break;
        
        case this.CMD_SEL_2_1K_VROM_0800:           
            // Select 2 1KB VROM pages at 0x0800:
            if (this.chrAddressSelect === 0) {
                this.load1kVromBank(arg, 0x0800);
                this.load1kVromBank(arg + 1, 0x0C00);
            }
            else {
                this.load1kVromBank(arg, 0x1800);
                this.load1kVromBank(arg + 1, 0x1C00);
            }
            break;
    
        case this.CMD_SEL_1K_VROM_1000:         
            // Select 1K VROM Page at 0x1000:
            if (this.chrAddressSelect === 0) {
                this.load1kVromBank(arg, 0x1000);
            }
            else {
                this.load1kVromBank(arg, 0x0000);
            }
            break;
    
        case this.CMD_SEL_1K_VROM_1400:         
            // Select 1K VROM Page at 0x1400:
            if (this.chrAddressSelect === 0) {
                this.load1kVromBank(arg, 0x1400);
            }
            else {
                this.load1kVromBank(arg, 0x0400);
            }
            break;
    
        case this.CMD_SEL_1K_VROM_1800:
            // Select 1K VROM Page at 0x1800:
            if (this.chrAddressSelect === 0) {
                this.load1kVromBank(arg, 0x1800);
            }
            else {
                this.load1kVromBank(arg, 0x0800);
            }
            break;
    
        case this.CMD_SEL_1K_VROM_1C00:
            // Select 1K VROM Page at 0x1C00:
            if (this.chrAddressSelect === 0) {
                this.load1kVromBank(arg, 0x1C00);
            }else {
                this.load1kVromBank(arg, 0x0C00);
            }
            break;
    
        case this.CMD_SEL_ROM_PAGE1:
            if (this.prgAddressChanged) {
                // Load the two hardwired banks:
                if (this.prgAddressSelect === 0) { 
                    this.load8kRomBank(
                        ((nes.rom.romCount - 1) * 2),
                        0xC000
                    );
                }
                else {
                    this.load8kRomBank(
                        ((nes.rom.romCount - 1) * 2),
                        0x8000
                    );
                }
                this.prgAddressChanged = false;
            }
    
            // Select first switchable ROM page:
            if (this.prgAddressSelect === 0) {
                this.load8kRomBank(arg, 0x8000);
            }
            else {
                this.load8kRomBank(arg, 0xC000);
            }
            break;
        
        case this.CMD_SEL_ROM_PAGE2:
            // Select second switchable ROM page:
            this.load8kRomBank(arg, 0xA000);
    
            // hardwire appropriate bank:
            if (this.prgAddressChanged) {
                // Load the two hardwired banks:
                if (this.prgAddressSelect === 0) { 
                    this.load8kRomBank(
                        ((nes.rom.romCount - 1) * 2),
                        0xC000
                    );
                }
                else {              
                    this.load8kRomBank(
                        ((nes.rom.romCount - 1) * 2),
                        0x8000
                    );
                }
                this.prgAddressChanged = false;
            }
    }
};

nes.mappers[4].prototype.loadROM = function(rom) {

    // Load hardwired PRG banks (0xC000 and 0xE000):
    this.load8kRomBank(((nes.rom.romCount - 1) * 2), 0xC000);
    this.load8kRomBank(((nes.rom.romCount - 1) * 2) + 1, 0xE000);

    // Load swappable PRG banks (0x8000 and 0xA000):
    this.load8kRomBank(0, 0x8000);
    this.load8kRomBank(1, 0xA000);

    // Load CHR-ROM:
    this.loadCHRROM();

    // Load Battery RAM (if present):
    this.loadBatteryRam();

    // Do Reset-Interrupt:
    nes.cpu.requestIrq(2);
};
