//=============================
//== Central Processing Unit ==
//=============================

nes.cpu = {

//Properties

    //Interrupt Types
    IRQ_NORMAL: 0,
    IRQ_NMI: 1,
    IRQ_RESET: 2,

    //Operation Info
    opInfo:[117506570,100796962,255,255,255,50462754,84017154,255,50397732,33686818,33620994,255,255,67306274,100860674,255,33685769,84020002,255,255,255,67241506,100795906,255,33620493,67307810,255,255,255,67307554,117639170,255,100860700,100796929,255,255,50462726,50462721,84017191,255,67174950,33686785,33621031,255,67306246,67306241,100860711,255,33685767,84019969,255,255,255,67241473,100795943,255,33620524,67307777,255,255,255,67307521,117639207,255,100729385,100796951,255,255,255,50462743,84017184,255,50397731,33686807,33621024,255,50529051,67306263,100860704,255,33685771,84019991,255,255,255,67241495,100795936,255,33620495,67307799,255,255,255,67307543,117639200,255,100729386,100796928,255,255,255,50462720,84017192,255,67174949,33686784,33621032,255,84085787,67306240,100860712,255,33685772,84019968,255,255,255,67241472,100795944,255,33620526,67307776,255,255,255,67307520,117639208,255,255,100796975,255,255,50462769,50462767,50462768,255,33620502,255,33620533,255,67306289,67306287,67306288,255,33685763,100797231,255,255,67241521,67241519,67241776,255,33620535,84085039,33620534,255,255,84084783,255,255,33686815,100796957,33686814,255,50462751,50462749,50462750,255,33620531,33686813,33620530,255,67306271,67306269,67306270,255,33685764,84019997,255,255,67241503,67241501,67241758,255,33620496,67307805,33620532,255,67307551,67307549,67307806,255,33686803,100796945,255,255,50462739,50462737,84017172,255,33620506,33686801,33620501,255,67306259,67306257,100860692,255,33685768,84019985,255,255,255,67241489,100795924,255,33620494,67307793,255,255,255,67307537,117639188,255,33686802,100796971,255,255,50462738,50462763,84017176,255,33620505,33686827,33620513,255,67306258,67306283,100860696,255,33685765,84020011,255,255,255,67241515,100795928,255,33620525,67307819,255,255,255,67307563,117639192,255],

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

        //Set every all other addresses to 0.
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
        this.REG_PC_NEW = 0x8000-1;

        //Set the CPU flags.
        this.F_SIGN = 0;
        this.F_OVERFLOW = 0;
        this.F_NOTUSED = 1;
        this.F_BRK = 1;
        this.F_DECIMAL = 0;
        this.F_INTERRUPT = 1;
        this.F_ZERO = 1;
        this.F_CARRY = 0;

        //Can probably be removed later.
        this.F_NOTUSED_NEW = 1;
        this.F_BRK_NEW = 1;
        this.F_INTERRUPT_NEW = 1;

        //Reset the cycles to halt number to 0.
        this.cyclesToHalt = 0;

        //Reset the interrupt flags.
        this.irqRequested = false;
        this.irqType = null;

    },


    // Emulates a single CPU instruction, returns the number of cycles
    emulate:function nes_cpu_emulate(){

        //Check if an interrupt was requested.
        if(this.irqRequested){

            //Cache the cpu status.
            var temp = this.F_CARRY|((this.F_ZERO===0?1:0)<<1)|(this.F_INTERRUPT<<2)|(this.F_DECIMAL<<3)|(this.F_BRK<<4)|(this.F_NOTUSED<<5)|(this.F_OVERFLOW<<6)|(this.F_SIGN<<7);

            //Remove?
            this.REG_PC_NEW = this.REG_PC;
            this.F_INTERRUPT_NEW = this.F_INTERRUPT;

            //Switch between the interrupt types.
            switch(this.irqType){

                //Normal Interrupt
                case 0: {
                    if(this.F_INTERRUPT !== 0){
                        break;
                    }
                    doIrq(temp);
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

            //Remove?
            this.REG_PC = this.REG_PC_NEW;
            this.F_INTERRUPT = this.F_INTERRUPT_NEW;
            this.F_BRK = this.F_BRK_NEW;

            //Reset the interrupt requested flag.
            this.irqRequested = false;

        }

        var opinf = this.opInfo[nes.mmap.load(this.REG_PC+1)];
        var cycleCount = (opinf>>24);
        var cycleAdd = 0;

        // Find address mode:
        var addrMode = (opinf >> 8) & 0xFF;

        // Increment PC by number of op bytes:
        var opaddr = this.REG_PC;
        this.REG_PC += ((opinf >> 16) & 0xFF);
        
        var addr = 0;
        switch(addrMode){
            case 0:{
                // Zero Page mode. Use the address given after the opcode, 
                // but without high byte.
                addr = this.load(opaddr+2);
                break;

            }case 1:{
                // Relative mode.
                addr = this.load(opaddr+2);
                if(addr<0x80){
                    addr += this.REG_PC;
                }else{
                    addr += this.REG_PC-256;
                }
                break;
            }case 2:{
                // Ignore. Address is implied in instruction.
                break;
            }case 3:{
                // Absolute mode. Use the two bytes following the opcode as 
                // an address.
                addr = this.load16bit(opaddr+2);
                break;
            }case 4:{
                // Accumulator mode. The address is in the accumulator 
                // register.
                addr = this.REG_ACC;
                break;
            }case 5:{
                // Immediate mode. The value is given after the opcode.
                addr = this.REG_PC;
                break;
            }case 6:{
                // Zero Page Indexed mode, X as index. Use the address given 
                // after the opcode, then add the
                // X register to it to get the final address.
                addr = (this.load(opaddr+2)+this.REG_X)&0xFF;
                break;
            }case 7:{
                // Zero Page Indexed mode, Y as index. Use the address given 
                // after the opcode, then add the
                // Y register to it to get the final address.
                addr = (this.load(opaddr+2)+this.REG_Y)&0xFF;
                break;
            }case 8:{
                // Absolute Indexed Mode, X as index. Same as zero page 
                // indexed, but with the high byte.
                addr = this.load16bit(opaddr+2);
                if((addr&0xFF00)!=((addr+this.REG_X)&0xFF00)){
                    cycleAdd = 1;
                }
                addr+=this.REG_X;
                break;
            }case 9:{
                // Absolute Indexed Mode, Y as index. Same as zero page 
                // indexed, but with the high byte.
                addr = this.load16bit(opaddr+2);
                if((addr&0xFF00)!=((addr+this.REG_Y)&0xFF00)){
                    cycleAdd = 1;
                }
                addr+=this.REG_Y;
                break;
            }case 10:{
                // Pre-indexed Indirect mode. Find the 16-bit address 
                // starting at the given location plus
                // the current X register. The value is the contents of that 
                // address.
                addr = this.load(opaddr+2);
                if((addr&0xFF00)!=((addr+this.REG_X)&0xFF00)){
                    cycleAdd = 1;
                }
                addr+=this.REG_X;
                addr&=0xFF;
                addr = this.load16bit(addr);
                break;
            }case 11:{
                // Post-indexed Indirect mode. Find the 16-bit address 
                // contained in the given location
                // (and the one following). Add to that address the contents 
                // of the Y register. Fetch the value
                // stored at that adress.
                addr = this.load16bit(this.load(opaddr+2));
                if((addr&0xFF00)!=((addr+this.REG_Y)&0xFF00)){
                    cycleAdd = 1;
                }
                addr+=this.REG_Y;
                break;
            }case 12:{
                // Indirect Absolute mode. Find the 16-bit address contained 
                // at the given location.
                addr = this.load16bit(opaddr+2);// Find op
                if(addr < 0x1FFF) {
                    addr = this.mem[addr] + (this.mem[(addr & 0xFF00) | (((addr & 0xFF) + 1) & 0xFF)] << 8);// Read from address given in op
                }
                else{
                    addr = nes.mmap.load(addr) + (nes.mmap.load((addr & 0xFF00) | (((addr & 0xFF) + 1) & 0xFF)) << 8);
                }
                break;

            }

        }
        // Wrap around for addresses above 0xFFFF:
        addr&=0xFFFF;

        // ----------------------------------------------------------------------------------------------------
        // Decode & execute instruction:
        // ----------------------------------------------------------------------------------------------------

        // This should be compiled to a jump table.
        switch(opinf&0xFF){
            case 0:{
                // *******
                // * ADC *
                // *******

                // Add with carry.
                temp = this.REG_ACC + this.load(addr) + this.F_CARRY;
                this.F_OVERFLOW = ((!(((this.REG_ACC ^ this.load(addr)) & 0x80)!=0) && (((this.REG_ACC ^ temp) & 0x80))!=0)?1:0);
                this.F_CARRY = (temp>255?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                this.REG_ACC = (temp&255);
                cycleCount+=cycleAdd;
                break;

            }case 1:{
                // *******
                // * AND *
                // *******

                // AND memory with accumulator.
                this.REG_ACC = this.REG_ACC & this.load(addr);
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                //this.REG_ACC = temp;
                if(addrMode!=11)cycleCount+=cycleAdd; // PostIdxInd = 11
                break;
            }case 2:{
                // *******
                // * ASL *
                // *******

                // Shift left one bit
                if(addrMode == 4){ // ADDR_ACC = 4

                    this.F_CARRY = (this.REG_ACC>>7)&1;
                    this.REG_ACC = (this.REG_ACC<<1)&255;
                    this.F_SIGN = (this.REG_ACC>>7)&1;
                    this.F_ZERO = this.REG_ACC;

                }else{

                    temp = this.load(addr);
                    this.F_CARRY = (temp>>7)&1;
                    temp = (temp<<1)&255;
                    this.F_SIGN = (temp>>7)&1;
                    this.F_ZERO = temp;
                    this.write(addr, temp);

                }
                break;

            }case 3:{

                // *******
                // * BCC *
                // *******

                // Branch on carry clear
                if(this.F_CARRY == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 4:{

                // *******
                // * BCS *
                // *******

                // Branch on carry set
                if(this.F_CARRY == 1){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 5:{

                // *******
                // * BEQ *
                // *******

                // Branch on zero
                if(this.F_ZERO == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 6:{

                // *******
                // * BIT *
                // *******

                temp = this.load(addr);
                this.F_SIGN = (temp>>7)&1;
                this.F_OVERFLOW = (temp>>6)&1;
                temp &= this.REG_ACC;
                this.F_ZERO = temp;
                break;

            }case 7:{

                // *******
                // * BMI *
                // *******

                // Branch on negative result
                if(this.F_SIGN == 1){
                    cycleCount++;
                    this.REG_PC = addr;
                }
                break;

            }case 8:{

                // *******
                // * BNE *
                // *******

                // Branch on not zero
                if(this.F_ZERO != 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 9:{

                // *******
                // * BPL *
                // *******

                // Branch on positive result
                if(this.F_SIGN == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 10:{

                // *******
                // * BRK *
                // *******

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

            }case 11:{

                // *******
                // * BVC *
                // *******

                // Branch on overflow clear
                if(this.F_OVERFLOW == 0){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 12:{

                // *******
                // * BVS *
                // *******

                // Branch on overflow set
                if(this.F_OVERFLOW == 1){
                    cycleCount += ((opaddr&0xFF00)!=(addr&0xFF00)?2:1);
                    this.REG_PC = addr;
                }
                break;

            }case 13:{

                // *******
                // * CLC *
                // *******

                // Clear carry flag
                this.F_CARRY = 0;
                break;

            }case 14:{

                // *******
                // * CLD *
                // *******

                // Clear decimal flag
                this.F_DECIMAL = 0;
                break;

            }case 15:{

                // *******
                // * CLI *
                // *******

                // Clear interrupt flag
                this.F_INTERRUPT = 0;
                break;

            }case 16:{

                // *******
                // * CLV *
                // *******

                // Clear overflow flag
                this.F_OVERFLOW = 0;
                break;

            }case 17:{

                // *******
                // * CMP *
                // *******

                // Compare memory and accumulator:
                temp = this.REG_ACC - this.load(addr);
                this.F_CARRY = (temp>=0?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                cycleCount+=cycleAdd;
                break;

            }case 18:{

                // *******
                // * CPX *
                // *******

                // Compare memory and index X:
                temp = this.REG_X - this.load(addr);
                this.F_CARRY = (temp>=0?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                break;

            }case 19:{

                // *******
                // * CPY *
                // *******

                // Compare memory and index Y:
                temp = this.REG_Y - this.load(addr);
                this.F_CARRY = (temp>=0?1:0);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                break;

            }case 20:{

                // *******
                // * DEC *
                // *******

                // Decrement memory by one:
                temp = (this.load(addr)-1)&0xFF;
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                this.write(addr, temp);
                break;

            }case 21:{

                // *******
                // * DEX *
                // *******

                // Decrement index X by one:
                this.REG_X = (this.REG_X-1)&0xFF;
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                break;

            }case 22:{

                // *******
                // * DEY *
                // *******

                // Decrement index Y by one:
                this.REG_Y = (this.REG_Y-1)&0xFF;
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                break;

            }case 23:{

                // *******
                // * EOR *
                // *******

                // XOR Memory with accumulator, store in accumulator:
                this.REG_ACC = (this.load(addr)^this.REG_ACC)&0xFF;
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                cycleCount+=cycleAdd;
                break;

            }case 24:{

                // *******
                // * INC *
                // *******

                // Increment memory by one:
                temp = (this.load(addr)+1)&0xFF;
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                this.write(addr, temp&0xFF);
                break;

            }case 25:{

                // *******
                // * INX *
                // *******

                // Increment index X by one:
                this.REG_X = (this.REG_X+1)&0xFF;
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                break;

            }case 26:{

                // *******
                // * INY *
                // *******

                // Increment index Y by one:
                this.REG_Y++;
                this.REG_Y &= 0xFF;
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                break;

            }case 27:{

                // *******
                // * JMP *
                // *******

                // Jump to new location:
                this.REG_PC = addr-1;
                break;

            }case 28:{

                // *******
                // * JSR *
                // *******

                // Jump to new location, saving return address.
                // Push return address on stack:
                this.push((this.REG_PC>>8)&255);
                this.push(this.REG_PC&255);
                this.REG_PC = addr-1;
                break;

            }case 29:{

                // *******
                // * LDA *
                // *******

                // Load accumulator with memory:
                this.REG_ACC = this.load(addr);
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                cycleCount+=cycleAdd;
                break;

            }case 30:{

                // *******
                // * LDX *
                // *******

                // Load index X with memory:
                this.REG_X = this.load(addr);
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                cycleCount+=cycleAdd;
                break;

            }case 31:{

                // *******
                // * LDY *
                // *******

                // Load index Y with memory:
                this.REG_Y = this.load(addr);
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                cycleCount+=cycleAdd;
                break;

            }case 32:{

                // *******
                // * LSR *
                // *******

                // Shift right one bit:
                if(addrMode == 4){ // ADDR_ACC

                    temp = (this.REG_ACC & 0xFF);
                    this.F_CARRY = temp&1;
                    temp >>= 1;
                    this.REG_ACC = temp;

                }else{

                    temp = this.load(addr) & 0xFF;
                    this.F_CARRY = temp&1;
                    temp >>= 1;
                    this.write(addr, temp);

                }
                this.F_SIGN = 0;
                this.F_ZERO = temp;
                break;

            }case 33:{

                // *******
                // * NOP *
                // *******

                // No OPeration.
                // Ignore.
                break;

            }case 34:{

                // *******
                // * ORA *
                // *******

                // OR memory with accumulator, store in accumulator.
                temp = (this.load(addr)|this.REG_ACC)&255;
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                this.REG_ACC = temp;
                if(addrMode!=11)cycleCount+=cycleAdd; // PostIdxInd = 11
                break;

            }case 35:{

                // *******
                // * PHA *
                // *******

                // Push accumulator on stack
                this.push(this.REG_ACC);
                break;

            }case 36:{

                // *******
                // * PHP *
                // *******

                // Push processor status on stack
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

            }case 37:{

                // *******
                // * PLA *
                // *******

                // Pull accumulator from stack
                this.REG_ACC = this.pull();
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                break;

            }case 38:{

                // *******
                // * PLP *
                // *******

                // Pull processor status from stack
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

            }case 39:{

                // *******
                // * ROL *
                // *******

                // Rotate one bit left
                if(addrMode == 4){ // ADDR_ACC = 4

                    temp = this.REG_ACC;
                    add = this.F_CARRY;
                    this.F_CARRY = (temp>>7)&1;
                    temp = ((temp<<1)&0xFF)+add;
                    this.REG_ACC = temp;

                }else{

                    temp = this.load(addr);
                    add = this.F_CARRY;
                    this.F_CARRY = (temp>>7)&1;
                    temp = ((temp<<1)&0xFF)+add;    
                    this.write(addr, temp);

                }
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                break;

            }case 40:{

                // *******
                // * ROR *
                // *******

                // Rotate one bit right
                if(addrMode == 4){ // ADDR_ACC = 4

                    add = this.F_CARRY<<7;
                    this.F_CARRY = this.REG_ACC&1;
                    temp = (this.REG_ACC>>1)+add;   
                    this.REG_ACC = temp;

                }else{

                    temp = this.load(addr);
                    add = this.F_CARRY<<7;
                    this.F_CARRY = temp&1;
                    temp = (temp>>1)+add;
                    this.write(addr, temp);

                }
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp;
                break;

            }case 41:{

                // *******
                // * RTI *
                // *******

                // Return from interrupt. Pull status and PC from stack.
                
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

            }case 42:{

                // *******
                // * RTS *
                // *******

                // Return from subroutine. Pull PC from stack.
                
                this.REG_PC = this.pull();
                this.REG_PC += (this.pull()<<8);
                
                if(this.REG_PC==0xFFFF){
                    return; // return from NSF play routine:
                }
                break;

            }case 43:{

                // *******
                // * SBC *
                // *******

                temp = this.REG_ACC-this.load(addr)-(1-this.F_CARRY);
                this.F_SIGN = (temp>>7)&1;
                this.F_ZERO = temp&0xFF;
                this.F_OVERFLOW = ((((this.REG_ACC^temp)&0x80)!=0 && ((this.REG_ACC^this.load(addr))&0x80)!=0)?1:0);
                this.F_CARRY = (temp<0?0:1);
                this.REG_ACC = (temp&0xFF);
                if(addrMode!=11)cycleCount+=cycleAdd; // PostIdxInd = 11
                break;

            }case 44:{

                // *******
                // * SEC *
                // *******

                // Set carry flag
                this.F_CARRY = 1;
                break;

            }case 45:{

                // *******
                // * SED *
                // *******

                // Set decimal mode
                this.F_DECIMAL = 1;
                break;

            }case 46:{

                // *******
                // * SEI *
                // *******

                // Set interrupt disable status
                this.F_INTERRUPT = 1;
                break;

            }case 47:{

                // *******
                // * STA *
                // *******

                // Store accumulator in memory
                this.write(addr, this.REG_ACC);
                break;

            }case 48:{

                // *******
                // * STX *
                // *******

                // Store index X in memory
                this.write(addr, this.REG_X);
                break;

            }case 49:{

                // *******
                // * STY *
                // *******

                // Store index Y in memory:
                this.write(addr, this.REG_Y);
                break;

            }case 50:{

                // *******
                // * TAX *
                // *******

                // Transfer accumulator to index X:
                this.REG_X = this.REG_ACC;
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                break;

            }case 51:{

                // *******
                // * TAY *
                // *******

                // Transfer accumulator to index Y:
                this.REG_Y = this.REG_ACC;
                this.F_SIGN = (this.REG_ACC>>7)&1;
                this.F_ZERO = this.REG_ACC;
                break;

            }case 52:{

                // *******
                // * TSX *
                // *******

                // Transfer stack pointer to index X:
                this.REG_X = (this.REG_SP-0x0100);
                this.F_SIGN = (this.REG_SP>>7)&1;
                this.F_ZERO = this.REG_X;
                break;

            }case 53:{

                // *******
                // * TXA *
                // *******

                // Transfer index X to accumulator:
                this.REG_ACC = this.REG_X;
                this.F_SIGN = (this.REG_X>>7)&1;
                this.F_ZERO = this.REG_X;
                break;

            }case 54:{

                // *******
                // * TXS *
                // *******

                // Transfer index X to stack pointer:
                this.REG_SP = (this.REG_X+0x0100);
                this.stackWrap();
                break;

            }case 55:{

                // *******
                // * TYA *
                // *******

                // Transfer index Y to accumulator:
                this.REG_ACC = this.REG_Y;
                this.F_SIGN = (this.REG_Y>>7)&1;
                this.F_ZERO = this.REG_Y;
                break;

            }default:{

                // *******
                // * ??? *
                // *******

                nes.stop();
                nes.crashMessage = "Game crashed, invalid opcode at address $"+opaddr.toString(16);
                break;

            }

        }

        //Return the number of cycles.
        return cycleCount;

    },
    
    load: function(addr){
        if (addr < 0x2000) {
            return this.mem[addr & 0x7FF];
        }
        else {
            return nes.mmap.load(addr);
        }
    },
    
    load16bit: function(addr){
        if (addr < 0x1FFF) {
            return this.mem[addr&0x7FF] | (this.mem[(addr+1)&0x7FF]<<8);
        }
        else {
            return nes.mmap.load(addr) | (nes.mmap.load(addr+1) << 8);
        }
    },
    
    write: function(addr,val){
        if(addr < 0x2000){
            this.mem[addr&0x7FF] = val;
        }
        else {
            nes.mmap.write(addr,val);
        }
    },

    requestIrq: function(type){
        if(this.irqRequested){
            if(type == this.IRQ_NORMAL){
                return;
            }
        }
        this.irqRequested = true;
        this.irqType = type;
    },

    push: function(value){
        nes.mmap.write(this.REG_SP, value);
        this.REG_SP--;
        this.REG_SP = 0x0100 | (this.REG_SP&0xFF);
    },

    stackWrap: function(){
        this.REG_SP = 0x0100 | (this.REG_SP&0xFF);
    },

    pull: function(){
        this.REG_SP++;
        this.REG_SP = 0x0100 | (this.REG_SP&0xFF);
        return nes.mmap.load(this.REG_SP);
    },

    pageCrossed: function(addr1, addr2){
        return ((addr1&0xFF00) != (addr2&0xFF00));
    },

    haltCycles: function(cycles){
        this.cyclesToHalt += cycles;
    },

    doNonMaskableInterrupt: function(status){
        if((nes.mmap.load(0x2000) & 128) != 0) { // Check whether VBlank Interrupts are enabled

            this.REG_PC_NEW++;
            this.push((this.REG_PC_NEW>>8)&0xFF);
            this.push(this.REG_PC_NEW&0xFF);
            //this.F_INTERRUPT_NEW = 1;
            this.push(status);

            this.REG_PC_NEW = nes.mmap.load(0xFFFA) | (nes.mmap.load(0xFFFB) << 8);
            this.REG_PC_NEW--;
        }
    },

    doResetInterrupt: function(){
        this.REG_PC_NEW = nes.mmap.load(0xFFFC) | (nes.mmap.load(0xFFFD) << 8);
        this.REG_PC_NEW--;
    },

    doIrq: function(status){
        this.REG_PC_NEW++;
        this.push((this.REG_PC_NEW>>8)&0xFF);
        this.push(this.REG_PC_NEW&0xFF);
        this.push(status);
        this.F_INTERRUPT_NEW = 1;
        this.F_BRK_NEW = 0;

        this.REG_PC_NEW = nes.mmap.load(0xFFFE) | (nes.mmap.load(0xFFFF) << 8);
        this.REG_PC_NEW--;
    },

    getStatus: function(){
        return this.F_CARRY|(this.F_ZERO<<1)|(this.F_INTERRUPT<<2)|(this.F_DECIMAL<<3)|(this.F_BRK<<4)|(this.F_NOTUSED<<5)|(this.F_OVERFLOW<<6)|(this.F_SIGN<<7);
    },

    setStatus: function(status){
        this.F_SIGN = (status>>7)&1;
        this.F_OVERFLOW = (status>>6)&1;
        this.F_NOTUSED = (status>>5)&1;
        this.F_BRK = (status>>4)&1;
        this.F_DECIMAL = (status>>3)&1;
        this.F_INTERRUPT = (status>>2)&1;
        this.F_ZERO = (status>>1)&1;
        this.F_CARRY = status&1;
    },

};
