//=============================
//== Central Processing Unit ==
//=============================

//Notes

//  Check to remove the "NEW" flags.

//  Check if moving the 8 status flags into one number would be faster.
//      More bitwise operations.
//      Setting and getting the status would be one operation.
//      Less memory.

nes.cpu = {

//Properties

    //Operation Info
    opInfo:[117506570,100796962,255,255,255,50462754,84017154,255,50397732,33686818,33620994,255,255,67306274,100860674,255,33685769,84020002,255,255,255,67241506,100795906,255,33620493,67307810,255,255,255,67307554,117639170,255,100860700,100796929,255,255,50462726,50462721,84017191,255,67174950,33686785,33621031,255,67306246,67306241,100860711,255,33685767,84019969,255,255,255,67241473,100795943,255,33620524,67307777,255,255,255,67307521,117639207,255,100729385,100796951,255,255,255,50462743,84017184,255,50397731,33686807,33621024,255,50529051,67306263,100860704,255,33685771,84019991,255,255,255,67241495,100795936,255,33620495,67307799,255,255,255,67307543,117639200,255,100729386,100796928,255,255,255,50462720,84017192,255,67174949,33686784,33621032,255,84085787,67306240,100860712,255,33685772,84019968,255,255,255,67241472,100795944,255,33620526,67307776,255,255,255,67307520,117639208,255,255,100796975,255,255,50462769,50462767,50462768,255,33620502,255,33620533,255,67306289,67306287,67306288,255,33685763,100797231,255,255,67241521,67241519,67241776,255,33620535,84085039,33620534,255,255,84084783,255,255,33686815,100796957,33686814,255,50462751,50462749,50462750,255,33620531,33686813,33620530,255,67306271,67306269,67306270,255,33685764,84019997,255,255,67241503,67241501,67241758,255,33620496,67307805,33620532,255,67307551,67307549,67307806,255,33686803,100796945,255,255,50462739,50462737,84017172,255,33620506,33686801,33620501,255,67306259,67306257,100860692,255,33685768,84019985,255,255,255,67241489,100795924,255,33620494,67307793,255,255,255,67307537,117639188,255,33686802,100796971,255,255,50462738,50462763,84017176,255,33620505,33686827,33620513,255,67306258,67306283,100860696,255,33685765,84020011,255,255,255,67241515,100795928,255,33620525,67307819,255,255,255,67307563,117639192,255],

    //Memory
    mem:null,

    //Accelerator
    REG_ACC:null,

    //X Index
    REG_X:null,

    //Y Index
    REG_Y:null,

    //Stack Pointer
    REG_SP:null,

    //Program Counter
    REG_PC:null,

    //Status Registers
    F_SIGN:null,
    F_OVERFLOW:null,
    F_NOTUSED:null,
    F_BRK:null,
    F_DECIMAL:null,
    F_INTERRUPT:null,
    F_ZERO:null,
    F_CARRY:null,

    //Interrupt Flags
    irqRequested:null,
    irqType:null,

    //Cycles to Halt
    cyclesToHalt:null,

//Methods

    reset:function nes_cpu_reset(){

        //Reset the memory.
        this.mem = new Array(0x10000);

        //Set addresses up to 0x2000 to 0xFF.
        for(var i=0;i<0x2000;i++){
            this.mem[i] = 0xFF;
        }

        //Set some odd addresses to some odd values.
        for(var i=0;i<4;i++){
            this.mem[i*0x800+0x008] = 0xF7;
            this.mem[i*0x800+0x009] = 0xEF;
            this.mem[i*0x800+0x00A] = 0xDF;
            this.mem[i*0x800+0x00F] = 0xBF;
        }

        //Set all other addresses to 0.
        for(var i=0x2001;i<0x10000;i++){
            this.mem[i] = 0;
        }

        //Reset the CPU registers.
        this.REG_ACC = 0;
        this.REG_X = 0;
        this.REG_Y = 0;

        //Reset the stack pointer.
        this.REG_SP = 0x01FF;

        //Reset the program counter.
        this.REG_PC = 0x8000-1;
        this.REG_PC = 0x8000-1;

        //Set the CPU flags.
        this.F_SIGN = 0;
        this.F_OVERFLOW = 0;
        this.F_NOTUSED = 1;
        this.F_BRK = 1;
        this.F_DECIMAL = 0;
        this.F_INTERRUPT = 1;
        this.F_ZERO = 1;
        this.F_CARRY = 0;

        //Reset the interrupt flags.
        this.irqRequested = false;
        this.irqType = null;

        //Reset the cycles to halt number to 0.
        this.cyclesToHalt = 0;

    },

    load:function nes_cpu_load(addr){

        //Check if the address is in the cpu memory.
        if(addr < 0x2000){
            return this.mem[addr&0x7FF];
        }

        //Else load the address from the mmc.
        return nes.mmap.load(addr);

    },
    
    load16bit:function nes_cpu_load(addr){

        //Check if the address is in the cpu memory.
        if(addr < 0x1FFF){
            return this.mem[addr&0x7FF]|(this.mem[(addr+1)&0x7FF]<<8);
        }

        //Else load the address from the mmc.
        return nes.mmap.load(addr)|(nes.mmap.load(addr+1)<<8);

    },

    write:function nes_cpu_write(addr,val){

        //Check if the address is in the cpu memory.
        if(addr < 0x2000){
            this.mem[addr&0x7FF] = val;
        }

        //Else write the address to the mmc.
        else{
            nes.mmap.write(addr,val);
        }

    },

    requestIrq:function(type){

        //Check if an interrupt is not already requested and the new interrupt is normal.
        if(!this.irqRequested && type !== 0){

            //Set the request.
            this.irqRequested = true;
            this.irqType = type;

        }

    },

    push:function nes_cpu_push(value){

        //???
        nes.mmap.write(this.REG_SP,value);

        //???
        this.REG_SP--;
        this.REG_SP = 0x0100|(this.REG_SP&0xFF);

    },

    stackWrap:function nes_cpu_stackWrap(){

        //Wrap the stack pointer around.
        this.REG_SP = 0x0100|(this.REG_SP&0xFF);

    },

    pull:function nes_cpu_pull(){

        //???
        this.REG_SP++;
        this.REG_SP = 0x0100|(this.REG_SP&0xFF);

        //Return the address at the stack pointer.
        return nes.mmap.load(this.REG_SP);

    },

    pageCrossed:function nes_cpu_pageCrossed(addr1,addr2){

        //???
        return (addr1&0xFF00) !== (addr2&0xFF00);

    },

    haltCycles:function nes_cpu_haltCycles(cycles){

        //Add the specified number of cycles to halt.
        this.cyclesToHalt += cycles;

    },

    doNonMaskableInterrupt:function nes_cpu_doNonMaskableInterrupt(status){

        //Check whether vBlank interrupts are enabled.
        if((nes.mmap.load(0x2000)&128) !== 0){

            //???
            this.REG_PC++;
            this.push((this.REG_PC>>8)&0xFF);
            this.push(this.REG_PC&0xFF);
            //this.F_INTERRUPT = 1;
            this.push(status);

            //???
            this.REG_PC = nes.mmap.load(0xFFFA)|(nes.mmap.load(0xFFFB)<<8);
            this.REG_PC--;

        }

    },

    doResetInterrupt:function doResetInterrupt(){

        //???
        this.REG_PC = nes.mmap.load(0xFFFC)|(nes.mmap.load(0xFFFD)<<8);
        this.REG_PC--;

    },

    doIrq:function nes_cpu_doIrq(status){

        //???
        this.REG_PC++;
        this.push((this.REG_PC>>8)&0xFF);
        this.push(this.REG_PC&0xFF);
        this.push(status);
        this.F_INTERRUPT = 1;
        this.F_BRK = 0;

        //???
        this.REG_PC = nes.mmap.load(0xFFFE)|(nes.mmap.load(0xFFFF)<<8);
        this.REG_PC--;

    },

    emulate:function nes_cpu_emulate(){

        //Check if an interrupt was requested.
        if(this.irqRequested){

            //Cache the cpu status.
            var temp = this.F_CARRY|((this.F_ZERO===0?1:0)<<1)|(this.F_INTERRUPT<<2)|(this.F_DECIMAL<<3)|(this.F_BRK<<4)|(this.F_NOTUSED<<5)|(this.F_OVERFLOW<<6)|(this.F_SIGN<<7);

            //Switch between the interrupt types.
            switch(this.irqType){

                //Normal Interrupt
                case 0: {
                    if(this.F_INTERRUPT === 0){
                        doIrq(temp);
                    }
                    break;
                }

                //Non-Maskable Interrupt
                case 1:{
                    this.doNonMaskableInterrupt(temp);
                    break;
                }

                //Reset Interrupt
                case 2:{
                    this.doResetInterrupt();
                    break;
                }

            }

            //Reset the interrupt requested flag.
            this.irqRequested = false;

        }

        var opinf = this.opInfo[nes.mmap.load(this.REG_PC+1)];
        var cycleCount = (opinf>>24);
        var cycleAdd = 0;

        //Get the address mode.
        var addrMode = (opinf>>8)&0xFF;

        //Increment PC by number of op bytes.
        var opaddr = this.REG_PC;
        this.REG_PC += (opinf>>16)&0xFF;

        //Initiate the address at 0.
        var addr = 0;

        //Switch between the address modes.
        switch(addrMode){

            //Zero Page Mode
            //Use the address given after the opcode, but without high byte.
            case 0:{
                addr = this.load(opaddr+2);
                break;
            }

            //Relative Mode
            //???
            case 1:{
                addr = this.load(opaddr+2);
                if(addr<0x80){
                    addr += this.REG_PC;
                }
                else{
                    addr += this.REG_PC-256;
                }
                break;
            }

            //Ignore
            //Address is implied in instruction.
            case 2:{
                break;
            }

            //Absolute Mode
            //Use the two bytes following the operation code as the address.
            case 3:{
                addr = this.load16bit(opaddr+2);
                break;
            }

            //Accumulator Mode
            //The address is in the accumulator register.
            case 4:{
                addr = this.REG_ACC;
                break;
            }

            //Imediate Mode
            //The address is given after the operation code.
            case 5:{
                addr = this.REG_PC;
                break;
            }

            //Zero Page Indexed Mode X
            //Use the address after the operation code plus the x register.
            case 6:{
                addr = (this.load(opaddr+2)+this.REG_X)&0xFF;
                break;
            }

            //Zero Page Indexed Mode Y
            //Use the address after the operation code plus the y register.
            case 7:{
                addr = (this.load(opaddr+2)+this.REG_Y)&0xFF;
                break;
            }

            //Absolute Indexed Mode X
            //Same as zero page indexed x without the high byte.
            case 8:{
                addr = this.load16bit(opaddr+2);
                if((addr&0xFF00) !== ((addr+this.REG_X)&0xFF00)){
                    cycleAdd = 1;
                }
                addr += this.REG_X;
                break;
            }

            //Absolute Indexed Mode Y
            //Same as zero page indexed y without the high byte.
            case 9:{
                addr = this.load16bit(opaddr+2);
                if((addr&0xFF00) !== ((addr+this.REG_Y)&0xFF00)){
                    cycleAdd = 1;
                }
                addr += this.REG_Y;
                break;
            }

            //Pre-Indexed Indirect Mode
            //The address is in the 16-bit address starting at the given location plus the x register.
            case 10:{
                addr = this.load(opaddr+2);
                if((addr&0xFF00) !== ((addr+this.REG_X)&0xFF00)){
                    cycleAdd = 1;
                }
                addr += this.REG_X;
                addr &= 0xFF;
                addr = this.load16bit(addr);
                break;
            }

            //Post-Indexed Indirect Mode
            case 11:{
                //The address is in the 16-bit address starting at the given location plus the y register.
                addr = this.load16bit(this.load(opaddr+2));
                if((addr&0xFF00) !== ((addr+this.REG_Y)&0xFF00)){
                    cycleAdd = 1;
                }
                addr += this.REG_Y;
                break;
            }

            //Indirect Absolute Mode
            //Use the 16-bit address specified at the given location.
            case 12:{
                addr = this.load16bit(opaddr+2);
                if(addr < 0x1FFF){
                    addr = this.mem[addr]+(this.mem[(addr&0xFF00)|(((addr&0xFF)+1)&0xFF)]<<8);
                }
                else{
                    addr = nes.mmap.load(addr)+(nes.mmap.load((addr&0xFF00)|(((addr & 0xFF)+1)&0xFF))<<8);
                }
                break;
            }

        }

        //Wrap around for addresses above 0xFFFF.
        addr &= 0xFFFF;

        //This should be compiled to a jump table.
        switch(opinf&0xFF){

            //ADC
            case 0:{
                //Add with carry.
                temp = this.REG_ACC + this.load(addr) + this.F_CARRY;
                this.F_OVERFLOW = ((!(((this.REG_ACC ^ this.load(addr)) & 0x80)!=0) && (((this.REG_ACC ^ temp) & 0x80))!=0)?1:0);
                this.F_CARRY = (temp>255?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                this.REG_ACC = (temp&255);
                cycleCount+=cycleAdd;
                break;

            }

            //AND
            case 1:{
                //AND memory with accumulator.
                this.REG_ACC = this.REG_ACC & this.load(addr);
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                //this.REG_ACC = temp;
                if(addrMode!=11)cycleCount+=cycleAdd; // PostIdxInd = 11
                break;
            }

            //ASL
            case 2:{
                //Shift left one bit.
                if(addrMode == 4){
                    this.F_CARRY = (this.REG_ACC>>7)&1;
                    this.REG_ACC = (this.REG_ACC<<1)&255;
                    this.F_SIGN = (this.REG_ACC>>7)&1;
                    this.F_ZERO = this.REG_ACC;
                }
                else{
                    temp = this.load(addr);
                    this.F_CARRY = (temp>>7)&1;
                    temp = (temp<<1)&255;
                    this.F_SIGN = (temp>>7)&1;
                    this.F_ZERO = temp;
                    this.write(addr, temp);
                }
                break;
            }

            //BCC
            case 3:{
                //Branch on carry clear.
                if(this.F_CARRY == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //BCS
            case 4:{
                //Branch on carry set.
                if(this.F_CARRY == 1){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //BEQ
            case 5:{
                //Branch on zero.
                if(this.F_ZERO == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //BIT
            case 6:{
                //???
                temp = this.load(addr);
                this.F_SIGN = (temp>>7)&1;
                this.F_OVERFLOW = (temp>>6)&1;
                temp &= this.REG_ACC;
                this.F_ZERO = temp;
                break;
            }

            //BMI
            case 7:{
                //Branch on negative result.
                if(this.F_SIGN == 1){
                    cycleCount++;
                    this.REG_PC = addr;
                }
                break;
            }

            //BNE
            case 8:{
                //Branch on not zero.
                if(this.F_ZERO != 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //BPL
            case 9:{
                //Branch on positive result.
                if(this.F_SIGN == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //BRK
            case 10:{
                //???
                this.REG_PC+=2;
                this.push((this.REG_PC>>8)&255);
                this.push(this.REG_PC&255);
                this.F_BRK = 1;
                this.push(
                    (this.F_CARRY)|
                    ((this.F_ZERO==0?1:0)<<1)|
                    (this.F_INTERRUPT<<2)|
                    (this.F_DECIMAL<<3)|
                    (this.F_BRK<<4)|
                    (this.F_NOTUSED<<5)|
                    (this.F_OVERFLOW<<6)|
                    (this.F_SIGN<<7)
                );
                this.F_INTERRUPT = 1;
                //this.REG_PC = load(0xFFFE) | (load(0xFFFF) << 8);
                this.REG_PC = this.load16bit(0xFFFE);
                this.REG_PC--;
                break;
            }

            //BVC
            case 11:{
                //Branch on overflow clear.
                if(this.F_OVERFLOW == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //BVS
            case 12:{
                //Branch on overflow set.
                if(this.F_OVERFLOW == 1){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;
            }

            //CLC
            case 13:{
                //Clear the carry flag.
                this.F_CARRY = 0;
                break;
            }

            //CLD
            case 14:{
                //Clear the decimal flag.
                this.F_DECIMAL = 0;
                break;
            }

            //CLI
            case 15:{
                //Clear the interrupt flag.
                this.F_INTERRUPT = 0;
                break;
            }

            //CLV
            case 16:{
                //Clear the overflow flag.
                this.F_OVERFLOW = 0;
                break;
            }

            //CMP
            case 17:{
                //Compare memory and accumulator.
                temp = this.REG_ACC - this.load(addr);
                this.F_CARRY = (temp>=0?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                cycleCount+=cycleAdd;
                break;
            }

            //CPX
            case 18:{
                //Compare memory and index X.
                temp = this.REG_X - this.load(addr);
                this.F_CARRY = (temp>=0?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                break;
            }

            //CPY
            case 19:{
                //Compare memory and index Y.
                temp = this.REG_Y - this.load(addr);
                this.F_CARRY = (temp>=0?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                break;
            }

            //DEC
            case 20:{
                //Decrement memory by one.
                temp = (this.load(addr)-1)&0xFF;
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                this.write(addr, temp);
                break;
            }

            //DEX
            case 21:{
                //Decrement index X by one.
                this.REG_X = (this.REG_X-1)&0xFF;
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                break;
            }

            //DEC
            case 22:{
                //Decrement index Y by one.
                this.REG_Y = (this.REG_Y-1)&0xFF;
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                break;
            }

            //EOR
            case 23:{
                //XOR Memory with accumulator, store in accumulator.
                this.REG_ACC = (this.load(addr)^this.REG_ACC)&0xFF;
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                cycleCount+=cycleAdd;
                break;
            }

            //INC
            case 24:{
                //Increment memory by one.
                temp = (this.load(addr)+1)&0xFF;
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                this.write(addr, temp&0xFF);
                break;
            }

            //INX
            case 25:{
                //Increment index X by one.
                this.REG_X = (this.REG_X+1)&0xFF;
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                break;
            }

            //INY
            case 26:{
                //Increment index Y by one.
                this.REG_Y++;
                this.REG_Y &= 0xFF;
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                break;
            }

            //JMP
            case 27:{
                //Jump to new location.
                this.REG_PC = addr-1;
                break;
            }

            //JSR
            case 28:{
                //Jump to new location, saving return address by pushing the return address onto the stack.
                this.push((this.REG_PC>>8)&255);
                this.push(this.REG_PC&255);
                this.REG_PC = addr-1;
                break;
            }

            //LDA
            case 29:{
                //Load accumulator with memory.
                this.REG_ACC = this.load(addr);
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                cycleCount+=cycleAdd;
                break;
            }

            //LDX
            case 30:{
                //Load index X with memory.
                this.REG_X = this.load(addr);
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                cycleCount+=cycleAdd;
                break;
            }

            //LDY
            case 31:{
                //Load index Y with memory.
                this.REG_Y = this.load(addr);
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                cycleCount+=cycleAdd;
                break;
            }

            //LSR
            case 32:{
                //Shift right one bit.
                if(addrMode == 4){ // ADDR_ACC
                    temp = (this.REG_ACC & 0xFF);
                    this.F_CARRY = temp&1;
                    temp >>= 1;
                    this.REG_ACC = temp;
                }
                else{
                    temp = this.load(addr) & 0xFF;
                    this.F_CARRY = temp&1;
                    temp >>= 1;
                    this.write(addr, temp);
                }
                this.F_SIGN = 0;
                this.F_ZERO = temp;
                break;
            }

            //NOP
            case 33:{
                //No operation, ignore.
                break;
            }

            //ORA
            case 34:{
                //OR memory with accumulator, store in accumulator.
                temp = (this.load(addr)|this.REG_ACC)&255;
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                this.REG_ACC = temp;
                if(addrMode!=11)cycleCount+=cycleAdd; // PostIdxInd = 11
                break;
            }

            //PHA
            case 35:{
                //Push accumulator onto the stack.
                this.push(this.REG_ACC);
                break;
            }

            //PHP
            case 36:{
                //Push processor status onto the stack.
                this.F_BRK = 1;
                this.push(
                    (this.F_CARRY)|
                    ((this.F_ZERO==0?1:0)<<1)|
                    (this.F_INTERRUPT<<2)|
                    (this.F_DECIMAL<<3)|
                    (this.F_BRK<<4)|
                    (this.F_NOTUSED<<5)|
                    (this.F_OVERFLOW<<6)|
                    (this.F_SIGN<<7)
                );
                break;
            }

            //PLA
            case 37:{
                //Pull accumulator from the stack.
                this.REG_ACC = this.pull();
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                break;
            }

            //PLP
            case 38:{
                //Pull processor status from the stack.
                temp = this.pull();
                this.F_CARRY     = (temp   )&1;
                this.F_ZERO      = (((temp>>1)&1)==1)?0:1;
                this.F_INTERRUPT = (temp>>2)&1;
                this.F_DECIMAL   = (temp>>3)&1;
                this.F_BRK       = (temp>>4)&1;
                this.F_NOTUSED   = (temp>>5)&1;
                this.F_OVERFLOW  = (temp>>6)&1;
                this.F_SIGN      = (temp>>7)&1;
                this.F_NOTUSED = 1;
                break;
            }

            //ROL
            case 39:{
                //Rotate one bit left.
                if(addrMode == 4){
                    temp = this.REG_ACC;
                    add = this.F_CARRY;
                    this.F_CARRY = (temp>>7)&1;
                    temp = ((temp<<1)&0xFF)+add;
                    this.REG_ACC = temp;
                }
                else{
                    temp = this.load(addr);
                    add = this.F_CARRY;
                    this.F_CARRY = (temp>>7)&1;
                    temp = ((temp<<1)&0xFF)+add;    
                    this.write(addr, temp);
                }
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                break;
            }

            //ROR
            case 40:{
                //Rotate one bit right.
                if(addrMode == 4){ // ADDR_ACC = 4
                    add = this.F_CARRY<<7;
                    this.F_CARRY = this.REG_ACC&1;
                    temp = (this.REG_ACC>>1)+add;   
                    this.REG_ACC = temp;
                }
                else{
                    temp = this.load(addr);
                    add = this.F_CARRY<<7;
                    this.F_CARRY = temp&1;
                    temp = (temp>>1)+add;
                    this.write(addr, temp);
                }
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                break;
            }

            //RTI
            case 41:{
                //Return from interrupt, pull status and PC from stack.
                temp = this.pull();
                this.F_CARRY     = (temp   )&1;
                this.F_ZERO      = ((temp>>1)&1)==0?1:0;
                this.F_INTERRUPT = (temp>>2)&1;
                this.F_DECIMAL   = (temp>>3)&1;
                this.F_BRK       = (temp>>4)&1;
                this.F_NOTUSED   = (temp>>5)&1;
                this.F_OVERFLOW  = (temp>>6)&1;
                this.F_SIGN      = (temp>>7)&1;
                this.REG_PC = this.pull();
                this.REG_PC += (this.pull()<<8);
                if(this.REG_PC==0xFFFF){
                    return;
                }
                this.REG_PC--;
                this.F_NOTUSED = 1;
                break;
            }

            //RTS
            case 42:{
                //Return from subroutine, pull PC from stack.
                this.REG_PC = this.pull();
                this.REG_PC += (this.pull()<<8);
                if(this.REG_PC==0xFFFF){
                    return; // return from NSF play routine:
                }
                break;
            }

            //SBC
            case 43:{
                //???
                temp = this.REG_ACC-this.load(addr)-(1-this.F_CARRY);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                this.F_OVERFLOW = ((((this.REG_ACC^temp)&0x80)!=0 && ((this.REG_ACC^this.load(addr))&0x80)!=0)?1:0);
                this.F_CARRY = (temp<0?0:1);
                this.REG_ACC = (temp&0xFF);
                if(addrMode!=11)cycleCount+=cycleAdd; // PostIdxInd = 11
                break;
            }

            //SEC
            case 44:{
                //Set carry flag.
                this.F_CARRY = 1;
                break;
            }

            //SED
            case 45:{
                //Set decimal mode.
                this.F_DECIMAL = 1;
                break;
            }

            //SEI
            case 46:{
                //Set interrupt disable status.
                this.F_INTERRUPT = 1;
                break;
            }

            //STA
            case 47:{
                //Store accumulator in memory.
                this.write(addr,this.REG_ACC);
                break;
            }

            //STX
            case 48:{
                //Store index X in memory.
                this.write(addr,this.REG_X);
                break;
            }

            //STY
            case 49:{
                //Store index Y in memory.
                this.write(addr, this.REG_Y);
                break;
            }

            //TAX
            case 50:{
                //Transfer accumulator to index X.
                this.REG_X = this.REG_ACC;
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                break;
            }

            //TAY
            case 51:{
                //Transfer accumulator to index Y.
                this.REG_Y = this.REG_ACC;
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                break;
            }

            //TSX
            case 52:{
                //Transfer stack pointer to index X.
                this.REG_X = (this.REG_SP-0x0100);
                this.F_SIGN = (this.REG_SP>>7)&1;
                this.F_ZERO = this.REG_X;
                break;
            }

            //TXA
            case 53:{
                //Transfer index X to accumulator.
                this.REG_ACC = this.REG_X;
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                break;
            }

            //TXS
            case 54:{
                //Transfer index X to stack pointer.
                this.REG_SP = (this.REG_X+0x0100);
                this.stackWrap();
                break;
            }

            //TYA
            case 55:{
                //Transfer index Y to accumulator.
                this.REG_ACC = this.REG_Y;
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                break;
            }

            //???
            default:{
                //Invalid operation code, stop emulation.
                nes.stop();
                alert('Game crashed, invalid opcode at address 0x'+opaddr.toString(16)+'.');
                break;
            }

        }

        //Return the number of cycles.
        return cycleCount;

    },

};