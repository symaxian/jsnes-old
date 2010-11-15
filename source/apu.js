//===========================
//== Audio Processing Unit ==
//===========================

/**
 * @namespace The audio processing unit for the nes.
 */

nes.apu = {

//Properties

    //Dynamic Audio Layer
    dynamicAudio:{writeInt:function(){}},

    //The Active Flag
    active:true,

    //Channels
    square1:null,
    square2:null,
    triangle:null,
    noise:null,
    dmc:null,

    //Frame Interrupt Variables
    frameIrqEnabled:null,
    frameIrqActive:null,
    frameIrqCounter:null,
    frameIrqCounterMax:null,

    //Hardware Initiation Flag & Counter
    initCounter:null,
    initiatingHardware:null,

    //Sound Buffer
    bufferIndex:null,
    sampleBuffer:null,

    //Misc
    masterFrameCounter:null,
    derivedFrameCounter:null,
    countSequence:null,
    sampleTimer:null,
    frameTime:null,
    sampleTimerMax:null,
    sampleCount:null,
    triValue:null,

    //Channel Samples
    smpSquare1:null,
    smpSquare2:null,
    smpTriangle:null,
    smpDmc:null,
    accCount:null,

    //DC Removal
    prevSampleL:0,
    prevSampleR:0,
    smpAccumL:0,
    smpAccumR:0,

    //DAC Range
    dacRange:0,
    dcValue:0,

    //Master Volume
    masterVolume:null,

    //Stereo Positioning
    stereoPosLSquare1:null,
    stereoPosLSquare2:null,
    stereoPosLTriangle:null,
    stereoPosLNoise:null,
    stereoPosLDMC:null,
    stereoPosRSquare1:null,
    stereoPosRSquare2:null,
    stereoPosRTriangle:null,
    stereoPosRNoise:null,
    stereoPosRDMC:null,

    //Panning
    panning:[80,170,100,150,128],

    //Sampling Extrema
    maxSample:null,
    minSample:null,

    //Lookup Tables
    lengthLookup:[0x0A,0xFE,0x14,0x02,0x28,0x04,0x50,0x06,0xA0,0x08,0x3C,0x0A,0x0E,0x0C,0x1A,0x0E,0x0C,0x10,0x18,0x12,0x30,0x14,0x60,0x16,0xC0,0x18,0x48,0x1A,0x10,0x1C,0x20,0x1E],
    dmcFreqLookup:[0xD60,0xBE0,0xAA0,0xA00,0x8F0,0x7F0,0x710,0x6B0,0x5F0,0x500,0x470,0x400,0x350,0x2A0,0x240,0x1B0],
    noiseWavelengthLookup:[0x004,0x008,0x010,0x020,0x040,0x060,0x080,0x0A0,0x0CA,0x0FE,0x17C,0x1FC,0x2FA,0x3F8,0x7F2,0xFE4],

//Methods

    reset:function nes_apu_reset(){
        //Check if the dynamicAudioPath was sent.
        if(typeof nes.dynamicAudioPath === 'string' && nes.dynamicAudioPath !== ''){
            //Initiate the dynamic audio wrapper.
            this.dynamicAudio = new DynamicAudio({swf:nes.dynamicAudioPath});
            //Reset the channels.
            this.square1.reset();
            this.square2.reset();
            this.triangle.reset();
            this.noise.reset();
            this.dmc.reset();
            //Frame interrupt variables.
            this.frameIrqEnabled = false;
            this.frameIrqActive = null;
            this.frameIrqCounter = null;
            this.frameIrqCounterMax = 4;
            //Set the harware initiation flag and counter, how many cpu cycles must pass before the apu is "ready".
            this.initCounter = 2048;
            this.initiatingHardware = false;
            //???
            this.triValue = 0;
            //DAC range.
            this.dacRange = 0;
            this.dcValue = 0;
            //Master volume.
            this.masterVolume = 256;
            //???
            this.extraCycles = null;
            //Update the stereo panning/positioning.
            this.updateStereoPos();
            //Init some tables.
            this.initDACtables();
            //Init sound registers.
            for(var i=0x4000;i<0x4014;i++){
                this.writeReg(i,0);
            }
            this.writeReg(0x4010,0x10);
            //???
            this.sampleTimerMax = 1832727040/44100;
            //???
            this.frameTime = parseInt((14915*nes.frameRate)/60,10);
            //???
            this.sampleTimer = 0;
            //Disable the channels.
            this.updateChannelEnable(0);
            //???
            this.masterFrameCounter = 0;
            this.derivedFrameCounter = 4;
            this.countSequence = 0;
            this.sampleCount = 0;
            //Reset the sample buffer and buffer index.
            this.bufferIndex = 0;
            this.sampleBuffer = new Array(16384);
            //???
            this.accCount = 0;
            //Reset the channel samples.
            this.smpSquare1 = 0;
            this.smpSquare2 = 0;
            this.smpTriangle = 0;
            this.smpDmc = 0;
            //DC removal variables.
            this.prevSampleL = 0;
            this.prevSampleR = 0;
            this.smpAccumL = 0;
            this.smpAccumR = 0;
            //Set the minimum and maximum sampling values.
            this.maxSample = -500000;
            this.minSample = 500000;
        }
        else{
            //Path to dynamic audio flash object not specified, deactivate the apu.
            this.active = false;
        }
    },

    readReg:function nes_apu_readReg(){
        //Construct the value that would normally be held in 0x4015 from the apu flags.
        var temp = (this.dmc.getIrqStatus()<<7)|(((this.frameIrqActive && this.frameIrqEnabled)?1:0)<<6)|(this.getChannelLengthStatus(this.dmc)<<4)|(this.getChannelLengthStatus(this.noise)<<3)|(this.getChannelLengthStatus(this.triangle)<<2)|(this.getChannelLengthStatus(this.square2)<<1)|this.getChannelLengthStatus(this.square1);
        //???
        this.frameIrqActive = false;
        this.dmc.irqGenerated = false;
        //Return the previously constructed byte.
        return temp&0xFFFF;
    },

    writeReg:function nes_apu_writeReg(address,value){
        //Square Wave 1 Control
        if(address >= 0x4000 && address < 0x4004){
            this.square1.writeReg(address,value);
        }
        //Square Wave 2 Control
        else if(address >= 0x4004 && address < 0x4008){
            this.square2.writeReg(address,value);
        }
        //Triangle Control
        else if(address >= 0x4008 && address < 0x400C){
            this.triangle.writeReg(address,value);
        }
        //Noise Control
        else if(address >= 0x400C && address <= 0x400F){
            this.noise.writeReg(address,value);
        }
        //DMC Play mode & DMA frequency
        else if(address === 0x4010){
            this.dmc.writeReg(address,value);
        }
        //DMC Delta Counter
        else if(address === 0x4011){
            this.dmc.writeReg(address,value);
        }
        //DMC Play code starting address
        else if(address === 0x4012){
            this.dmc.writeReg(address,value);
        }
        //DMC Play code length
        else if(address === 0x4013){
            this.dmc.writeReg(address,value);
        }
        //Channel enable.
        else if(address === 0x4015){
            //???
            this.updateChannelEnable(value);
            //???
            if(value !== 0 && this.initCounter > 0){
                //Start hardware initialization.
                this.initiatingHardware = true;
            }
            //DMC/IRQ Status
            this.dmc.writeReg(address,value);
        }
        //Frame counter control.
        else if(address === 0x4017){
            //???
            this.countSequence = (value>>7)&1;
            this.masterFrameCounter = 0;
            this.frameIrqActive = false;
            //???
            this.frameIrqEnabled = (((value>>6)&0x1) === 0);
            //???
            if(this.countSequence === 0){
                //NTSC
                this.frameIrqCounterMax = 4;
                this.derivedFrameCounter = 4;
            }
            else{
                //PAL
                this.frameIrqCounterMax = 5;
                this.derivedFrameCounter = 0;
                this.frameCounterTick();
            }
        }

    },

    //Updates channel enable status.
    //This is done on writes to the channel enable register, 0x4015.
    updateChannelEnable:function nes_apu_updateChannelEnable(value){
        //Set the enabled status's for the channels.
        this.square1.setEnabled((value&1) !== 0);
        this.square2.setEnabled((value&2) !== 0);
        this.triangle.setEnabled((value&4) !== 0);
        this.noise.setEnabled((value&8) !== 0);
        this.dmc.setEnabled((value&16) !== 0);
    },

    //Clocks the frame counter.
    //It should be clocked at twice the cpu speed, so the cycles will be divided by 2 for those counters that are clocked at cpu speed.
    clockFrameCounter:function nes_apu_clockFrameCounter(nCycles){
        //Check if active.
        if(this.active){
            //Do not clock the frame counter if still initiating hardware.
            if(this.initCounter > 0 && this.initiatingHardware){
                this.initCounter -= nCycles;
                if(this.initCounter <= 0){
                    this.initiatingHardware = false;
                }
                return;
            }
            //Don't process ticks beyond next sampling.
            nCycles += this.extraCycles;
            var maxCycles = this.sampleTimerMax-this.sampleTimer;
            if((nCycles<<10) > maxCycles){
                this.extraCycles = ((nCycles<<10)-maxCycles)>>10;
                nCycles -= this.extraCycles;
            }
            else{
                this.extraCycles = 0;
            }
            //Clock the dm channel.
            if(this.dmc.isEnabled){
                this.dmc.shiftCounter -= (nCycles<<3);
                while(this.dmc.shiftCounter <= 0 && this.dmc.dmaFrequency > 0){
                    this.dmc.shiftCounter += this.dmc.dmaFrequency;
                }
            }
            //Clock the triangle channel.
            if(this.triangle.progTimerMax > 0){
                this.triangle.progTimerCount -= nCycles;
                while(this.triangle.progTimerCount <= 0){
                    this.triangle.progTimerCount += this.triangle.progTimerMax+1;
                    if(this.triangle.linearCounter>0 && this.triangle.lengthCounter>0){
                        this.triangle.triangleCounter++;
                        this.triangle.triangleCounter &= 0x1F;
                        if(this.triangle.isEnabled){
                            if(this.triangle.triangleCounter>=0x10){
                                //Normal value.
                                this.triangle.sampleValue = (this.triangle.triangleCounter&0xF);
                            }
                            else{
                                //Inverted value.
                                this.triangle.sampleValue = (0xF - (this.triangle.triangleCounter&0xF));
                            }
                            this.triangle.sampleValue <<= 4;
                        }
                    }
                }
            }
            //Clock the square1 channel.
            this.square1.progTimerCount -= nCycles;
            if(this.square1.progTimerCount <= 0){
                this.square1.progTimerCount += (this.square1.progTimerMax+1)<<1;
                this.square1.squareCounter++;
                this.square1.squareCounter &= 0x7;
                this.square1.updateSampleValue();
            }

            //Clock the square2 channel.
            this.square2.progTimerCount -= nCycles;
            if(this.square2.progTimerCount <= 0){
                this.square2.progTimerCount += (this.square2.progTimerMax+1)<<1;
                this.square2.squareCounter++;
                this.square2.squareCounter &= 0x7;
                this.square2.updateSampleValue();
            }
            //Clock the noise channel.
            var acc_c = nCycles;
            if(this.noise.progTimerCount-acc_c > 0){
                //Do all cycles at once.
                this.noise.progTimerCount -= acc_c;
                this.noise.accCount += acc_c;
                this.noise.accValue += acc_c*this.noise.sampleValue;
            }
            else{
                //Slow-step.
                while((acc_c--) > 0){
                    if(--this.noise.progTimerCount <= 0 && this.noise.progTimerMax > 0){
                        //Update this.noise shift register.
                        this.noise.shiftReg <<= 1;
                        this.noise.tmp = (((this.noise.shiftReg<<(this.noise.randomMode === 0?1:6))^this.noise.shiftReg)&0x8000);
                        if(this.noise.tmp !== 0){
                            //Sample value must be 0.
                            this.noise.shiftReg |= 0x01;
                            this.noise.randomBit = 0;
                            this.noise.sampleValue = 0;
                        }
                        else{
                            //Find sample value.
                            this.noise.randomBit = 1;
                            if(this.noise.isEnabled && this.noise.lengthCounter>0){
                                this.noise.sampleValue = this.noise.masterVolume;
                            }
                            else{
                                this.noise.sampleValue = 0;
                            }
                        }
                        this.noise.progTimerCount += this.noise.progTimerMax;
                    }
                    this.noise.accValue += this.noise.sampleValue;
                    this.noise.accCount++;
                }
            }
            //Frame interrupt handling.
            if(this.frameIrqEnabled && this.frameIrqActive){
                nes.cpu.requestIrq(0);
            }
            //Clock frame counter at double CPU speed.
            this.masterFrameCounter += (nCycles<<1);
            if(this.masterFrameCounter >= this.frameTime){
                //240Hz tick.
                this.masterFrameCounter -= this.frameTime;
                this.frameCounterTick();
            }
            //Accumulate sample values.
            //Special treatment for triangle channel, need to interpolate.
            if(this.triangle.sampleCondition){
                this.triValue = Math.min(parseInt((this.triangle.progTimerCount<<4)/(this.triangle.progTimerMax+1),10),16);
                if(this.triangle.triangleCounter >= 16){
                    this.triValue = 16-this.triValue;
                }
                //Add non-interpolated sample value.
                this.triValue += this.triangle.sampleValue;
            }
            //Now sample normally.
            if(nCycles === 2){
                this.smpTriangle += this.triValue<<1;
                this.smpDmc += this.dmc.sample<<1;
                this.smpSquare1 += this.square1.sampleValue<<1;
                this.smpSquare2 += this.square2.sampleValue<<1;
                this.accCount += 2;
            }
            else if(nCycles === 4){
                this.smpTriangle += this.triValue<<2;
                this.smpDmc += this.dmc.sample<<2;
                this.smpSquare1 += this.square1.sampleValue<<2;
                this.smpSquare2 += this.square2.sampleValue<<2;
                this.accCount += 4;
            }
            else{
                this.smpTriangle += nCycles*this.triValue;
                this.smpDmc += nCycles*this.dmc.sample;
                this.smpSquare1 += nCycles*this.square1.sampleValue;
                this.smpSquare2 += nCycles*this.square2.sampleValue;
                this.accCount += nCycles;
            }
            //Clock sample timer.
            this.sampleTimer += nCycles<<10;
            if(this.sampleTimer >= this.sampleTimerMax){
                //Sample channels.
                this.sample();
                this.sampleTimer -= this.sampleTimerMax;
            }
        }
    },

    frameCounterTick:function nes_apu_frameCounterTick(){
        //???
        this.derivedFrameCounter++;
        if(this.derivedFrameCounter >= this.frameIrqCounterMax){
            this.derivedFrameCounter = 0;
        }
        //???
        if(this.derivedFrameCounter === 1 || this.derivedFrameCounter === 3){
            //Clock length & sweep.
            this.triangle.clockLengthCounter();
            this.square1.clockLengthCounter();
            this.square2.clockLengthCounter();
            this.noise.clockLengthCounter();
            this.square1.clockSweep();
            this.square2.clockSweep();
        }
        //???
        if(this.derivedFrameCounter >= 0 && this.derivedFrameCounter < 4){
            //Clock linear & decay.
            this.square1.clockEnvDecay();
            this.square2.clockEnvDecay();
            this.noise.clockEnvDecay();
            this.triangle.clockLinearCounter();
        }
        //???
        if(this.derivedFrameCounter === 3 && this.countSequence === 0){
            //Enable IRQ.
            this.frameIrqActive = true;
        }
        //End of 240Hz tick.
    },

    //Samples the channels, mixes the output together, and writes the samples to the dynamic audio wrapper.
    sample:function nes_apu_sample(){
        //???
        if(this.accCount > 0){
            //Square Wave 1
            this.smpSquare1 <<= 4;
            this.smpSquare1 = parseInt(this.smpSquare1/this.accCount,10);
            //Square Wave 2
            this.smpSquare2 <<= 4;
            this.smpSquare2 = parseInt(this.smpSquare2/this.accCount,10);
            //Triangle Wave
            this.smpTriangle = parseInt(this.smpTriangle/this.accCount,10);
            //DMC
            this.smpDmc <<= 4;
            this.smpDmc = parseInt(this.smpDmc / this.accCount,10);
            //???
            this.accCount = 0;
        }
        else{
            //Square Wave 1
            this.smpSquare1 = this.square1.sampleValue<<4;
            //Square Wave 2
            this.smpSquare2 = this.square2.sampleValue<<4;
            //Triangle Wave
            this.smpTriangle = this.triangle.sampleValue;
            //DMC
            this.smpDmc = this.dmc.sample<<4;
        }
        //???
        var smpNoise = parseInt((this.noise.accValue<<4)/this.noise.accCount,10);
        //???
        this.noise.accValue = smpNoise>>4;
        this.noise.accCount = 1;
        //Left sound channel.
        var sq_index  = (this.smpSquare1*this.stereoPosLSquare1+this.smpSquare2*this.stereoPosLSquare2)>>8;
        var tnd_index = (3*this.smpTriangle*this.stereoPosLTriangle+(smpNoise<<1)*this.stereoPosLNoise+this.smpDmc*this.stereoPosLDMC)>>8;
        if(sq_index >= this.square_table.length){
            sq_index  = this.square_table.length-1;
        }
        if(tnd_index >= this.tnd_table.length){
            tnd_index = this.tnd_table.length-1;
        }
        var sampleValueL = this.square_table[sq_index]+this.tnd_table[tnd_index]-this.dcValue;
        //Right sound channel.
        sq_index = (this.smpSquare1*this.stereoPosRSquare1+this.smpSquare2*this.stereoPosRSquare2)>>8;
        tnd_index = (3*this.smpTriangle*this.stereoPosRTriangle+(smpNoise<<1)*this.stereoPosRNoise+this.smpDmc*this.stereoPosRDMC)>>8;
        if(sq_index >= this.square_table.length){
            sq_index = this.square_table.length-1;
        }
        if(tnd_index >= this.tnd_table.length){
            tnd_index = this.tnd_table.length-1;
        }
        var sampleValueR = this.square_table[sq_index]+this.tnd_table[tnd_index]-this.dcValue;
        //Remove DC from left channel.
        var smpDiffL = sampleValueL-this.prevSampleL;
        this.prevSampleL += smpDiffL;
        this.smpAccumL += smpDiffL-(this.smpAccumL>>10);
        sampleValueL = this.smpAccumL;
        //Remove DC from right channel.
        var smpDiffR = sampleValueR-this.prevSampleR;
        this.prevSampleR += smpDiffR;
        this.smpAccumR += smpDiffR-(this.smpAccumR>>10);
        sampleValueR = this.smpAccumR;
        //Check that the sample values are not greater than or less than the maximum and minimum sample values.
        if(sampleValueL > this.maxSample){
            this.maxSample = sampleValueL;
        }
        if(sampleValueL < this.minSample){
            this.minSample = sampleValueL;
        }
        //Add the left and right sample values to the buffer, incrementing the index as well.
        this.sampleBuffer[this.bufferIndex++] = sampleValueL;
        this.sampleBuffer[this.bufferIndex++] = sampleValueR;
        //Send the buffer to the speakers if its full(the index is at the end).
        if(this.bufferIndex === this.sampleBuffer.length){
            //Write the samples to the audio wrapper.
            this.dynamicAudio.writeInt(this.sampleBuffer);
            //Reset the buffer and buffer index.
            this.sampleBuffer = new Array(16384);
            this.bufferIndex = 0;
        }
        //Reset sampled values.
        this.smpSquare1 = 0;
        this.smpSquare2 = 0;
        this.smpTriangle = 0;
        this.smpDmc = 0;
    },

    getLengthMax:function nes_apu_getLengthMax(value){
        //???
        return this.lengthLookup[value>>3];
    },

    getDmcFrequency:function nes_apu_getDmcFrequency(value){
        //???
        if(value >= 0 && value < 0x10){
            return this.dmcFreqLookup[value];
        }
        return 0;
    },

    getNoiseWaveLength:function nes_apu_getNoiseWaveLength(value){
        //???
        if(value >= 0 && value < 0x10){
            return this.noiseWavelengthLookup[value];
        }
        return 0;
    },

    setMasterVolume:function nes_apu_setMasterVolume(value){
        //Keep the master volume between 0 and 256.
        if(value < 0){
            value = 0;
        }
        if(value > 256){
            value = 256;
        }
        //Set the master volume.
        this.masterVolume = value;
        //Update the positioning.
        this.updateStereoPos();
    },

    updateStereoPos:function nes_apu_updateSteroPos(){
        //Update left.
        this.stereoPosLSquare1 = (this.panning[0]*this.masterVolume)>>8;
        this.stereoPosLSquare2 = (this.panning[1]*this.masterVolume)>>8;
        this.stereoPosLTriangle = (this.panning[2]*this.masterVolume)>>8;
        this.stereoPosLNoise = (this.panning[3]*this.masterVolume)>>8;
        this.stereoPosLDMC = (this.panning[4]*this.masterVolume)>>8;
        //Update right.
        this.stereoPosRSquare1 = this.masterVolume-this.stereoPosLSquare1;
        this.stereoPosRSquare2 = this.masterVolume-this.stereoPosLSquare2;
        this.stereoPosRTriangle = this.masterVolume-this.stereoPosLTriangle;
        this.stereoPosRNoise = this.masterVolume-this.stereoPosLNoise;
        this.stereoPosRDMC = this.masterVolume-this.stereoPosLDMC;
    },

    initDACtables:function nes_apu_initDACtables(){
        //???
        var max_sqr = 0;
        this.square_table = new Array(512);
        for(var i=0;i<512;i++){
            value = 95.52/(8128/(i/16)+100);
            value *= 0.98411;
            value *= 50000;
            var ival = parseInt(value,10);
            this.square_table[i] = ival;
            if(ival > max_sqr){
                max_sqr = ival;
            }
        }
        //???
        var max_tnd = 0;
        this.tnd_table = new Array(3264);
        for(var i=0;i<3264;i++){
            var value = 163.67/(24329/(i/16)+100);
            value *= 0.98411;
            value *= 50000;
            ival = parseInt(value,10);
            this.tnd_table[i] = ival;
            if(ival > max_tnd){
                max_tnd = ival;
            }
        }
        //???
        this.dacRange = max_sqr+max_tnd;
        this.dcValue = this.dacRange/2;
    },

    getChannelLengthStatus:function nes_apu_getChannelLengthStatus(channel){
        //Return the length status.
        return ((channel.lengthCounter === 0 || !channel.isEnabled)?0:1);
    },

    //================
    //== DM Channel ==
    //================

    dmc:{

    //Properties

        isEnabled:null,
        hasSample:null,
        irqGenerated:false,

        playMode:null,
        dmaFrequency:null,
        dmaCounter:null,
        deltaCounter:null,
        playStartAddress:null,
        playAddress:null,
        playLength:null,
        playLengthCounter:null,
        shiftCounter:null,
        reg4012:null,
        reg4013:null,
        sample:null,
        dacLsb:null,
        data:null,

    //Methods

        reset:function(){
            //Reset all the properties.
            this.isEnabled = false;
            this.irqGenerated = false;
            this.playMode = 0;
            this.dmaFrequency = 0;
            this.dmaCounter = 0;
            this.deltaCounter = 0;
            this.playStartAddress = 0;
            this.playAddress = 0;
            this.playLength = 0;
            this.playLengthCounter = 0;
            this.sample = 0;
            this.dacLsb = 0;
            this.shiftCounter = 0;
            this.reg4012 = 0;
            this.reg4013 = 0;
            this.data = 0;
        },

        clockDmc:function(){
            //Only alter DAC value if the sample buffer has data.
            if(this.hasSample){
                if((this.data&1) === 0){
                    // Decrement delta.
                    if(this.deltaCounter > 0){
                        this.deltaCounter--;
                    }
                }
                else{
                    //Increment delta.
                    if(this.deltaCounter < 63){
                        this.deltaCounter++;
                    }
                }
                //Update sample value.
                this.sample = this.isEnabled?(this.deltaCounter<<1)+this.dacLsb:0;
                //Update shift register.
                this.data >>= 1;
            }
            //???
            this.dmaCounter--;
            if(this.dmaCounter <= 0){
                //No more sample bits.
                this.hasSample = false;
                //End of sample.
                if(this.playLengthCounter === 0 && this.playMode === 1){
                    //Start from beginning of sample.
                    this.playAddress = this.playStartAddress;
                    this.playLengthCounter = this.playLength;
                
                }
                //End of sample.
                if(this.playLengthCounter > 0){
                    //Fetch next sample.
                    //Fetch byte.
                    this.data = nes.mmc.load(this.playAddress);
                    nes.cpu.haltCycles(4);
                    //???
                    this.playLengthCounter--;
                    this.playAddress++;
                    if(this.playAddress > 0xFFFF){
                        this.playAddress = 0x8000;
                    }
                    //???
                    this.hasSample = true;
                    //???
                    if(this.playLengthCounter === 0){
                        //Last byte of sample fetched, generate IRQ.
                        if(this.playMode === 2){
                            //Generate IRQ.
                            this.irqGenerated = true;
                        }
                    }
                }
                //???
                this.dmaCounter = 8;
            }
            //Request a normal interrupt if generated.
            if(this.irqGenerated){
                nes.cpu.requestIrq(0);
            }
        },

        writeReg:function(address,value){
            //Check the register address.
            if(address === 0x4010){
                //Play mode, DMA Frequency.
                if((value>>6) === 0){
                    //Set the play mode to normal.
                    this.playMode = 0;
                }
                else if(((value>>6)&1) === 1){
                    //Set the play mode to loop.
                    this.playMode = 1;
                }
                else if((value>>6) === 2){
                    //Set the play mode to interrupt.
                    this.playMode = 2;
                    this.irqGenerated = false;
                }
                //???
                this.dmaFrequency = nes.apu.getDmcFrequency(value&0xF);
            }
            else if(address === 0x4011){
                //Delta counter load register.
                this.deltaCounter = (value>>1)&63;
                this.dacLsb = value&1;
                //Update sample value.
                this.sample = ((this.deltaCounter<<1)+this.dacLsb);
            }
            else if(address === 0x4012){
                //DMA address load register.
                this.playStartAddress = (value<<6)|0x0C000;
                this.playAddress = this.playStartAddress;
                this.reg4012 = value;
            }
            else if(address === 0x4013){
                //Length of play code.
                this.playLength = (value<<4)+1;
                this.playLengthCounter = this.playLength;
                this.reg4013 = value;
            }
            else if(address === 0x4015){
                //DMC/IRQ Status
                if(((value>>4)&1) === 0){
                    //Disable
                    this.playLengthCounter = 0;
                }
                else{
                    //Restart
                    this.playAddress = this.playStartAddress;
                    this.playLengthCounter = this.playLength;
                }
                this.irqGenerated = false;
            }
        },

        setEnabled:function(value){
            //???
            if((!this.isEnabled) && value){
                this.playLengthCounter = this.playLength;
            }
            //Set the enabled flag.
            this.isEnabled = value;
        },

        getIrqStatus:function(){
            //???
            return (this.irqGenerated?1:0);
        },

    },

    //===================
    //== Noise Channel ==
    //===================

    noise:{

    //Properties

        isEnabled:null,
        envDecayDisable:null,
        envDecayLoopEnable:null,
        lengthCounterEnable:null,
        envReset:null,

        lengthCounter:null,
        progTimerCount:null,
        progTimerMax:null,
        envDecayRate:null,
        envDecayCounter:null,
        envVolume:null,
        masterVolume:null,
        shiftReg:16384,
        randomBit:null,
        randomMode:null,
        sampleValue:null,
        accValue:0,
        accCount:1,
        tmp:null,

    //Methods

        reset:function(){
            //Reset all the properties.
            this.progTimerCount = 0;
            this.progTimerMax = 0;
            this.isEnabled = false;
            this.lengthCounter = 0;
            this.lengthCounterEnable = false;
            this.envDecayDisable = false;
            this.envDecayLoopEnable = false;
            this.envDecayRate = 0;
            this.envDecayCounter = 0;
            this.envVolume = 0;
            this.masterVolume = 0;
            this.shiftReg = 1;
            this.randomBit = 0;
            this.randomMode = 0;
            this.sampleValue = 0;
            this.tmp = 0;
        },

        clockLengthCounter:function(){
            //???
            if(this.lengthCounterEnable && this.lengthCounter>0){
                this.lengthCounter--;
                if(this.lengthCounter === 0){
                    this.updateSampleValue();
                }
            }
        },

        clockEnvDecay:function(){
            if(this.envReset){
                //Reset envelope.
                this.envReset = false;
                this.envDecayCounter = this.envDecayRate+1;
                this.envVolume = 0xF;
            }
            else if(--this.envDecayCounter <= 0){
                //Normal handling.
                this.envDecayCounter = this.envDecayRate+1;
                if(this.envVolume>0){
                    this.envVolume--;
                }
                else{
                    this.envVolume = this.envDecayLoopEnable?0xF:0;
                }
            }
            //???
            this.masterVolume = this.envDecayDisable ? this.envDecayRate : this.envVolume;
            //Update the sample value.
            this.updateSampleValue();
        },

        updateSampleValue:function(){
            //???
            if(this.isEnabled && this.lengthCounter > 0){
                this.sampleValue = this.randomBit*this.masterVolume;
            }
        },

        writeReg:function(address,value){
            //Volume/Envelope decay
            if(address === 0x400C){
                this.envDecayDisable = ((value&0x10) !== 0);
                this.envDecayRate = value&0xF;
                this.envDecayLoopEnable = ((value&0x20) !== 0);
                this.lengthCounterEnable = ((value&0x20) === 0);
                this.masterVolume = this.envDecayDisable?this.envDecayRate:this.envVolume;
            }
            //Programmable timer
            else if(address === 0x400E){
                this.progTimerMax = nes.apu.getNoiseWaveLength(value&0xF);
                this.randomMode = value>>7;
            }
            //Length counter
            else if(address === 0x400F){
                this.lengthCounter = nes.apu.getLengthMax(value&248);
                this.envReset = true;
            }
            //Update the sample value.
            this.updateSampleValue();
        },

        setEnabled:function(value){
            //Set the enabled flag.
            this.isEnabled = value;
            //If not enabled, set the length counter to 0.
            if(!value){
                this.lengthCounter = 0;
            }
            //Update the sample value.
            this.updateSampleValue();
        },

    },

    //======================
    //== Triangle Channel ==
    //======================

    triangle:{

    //Properties

        isEnabled:null,
        sampleCondition:null,
        lengthCounterEnable:null,
        lcHalt:null,
        lcControl:null,

        progTimerCount:null,
        progTimerMax:null,
        triangleCounter:null,
        lengthCounter:null,
        linearCounter:null,
        lcLoadValue:null,
        sampleValue:null,

    //Methods

        reset:function(){
            //Reset all the properties.
            this.progTimerCount = 0;
            this.progTimerMax = 0;
            this.triangleCounter = 0;
            this.isEnabled = false;
            this.sampleCondition = false;
            this.lengthCounter = 0;
            this.lengthCounterEnable = false;
            this.linearCounter = 0;
            this.lcLoadValue = 0;
            this.lcHalt = true;
            this.lcControl = false;
            this.sampleValue = 0xF;
        },

        clockLengthCounter:function(){
            //???
            if(this.lengthCounterEnable && this.lengthCounter>0){
                this.lengthCounter--;
                if(this.lengthCounter === 0){
                    this.updateSampleCondition();
                }
            }
        },

        clockLinearCounter:function(){
            //???
            if(this.lcHalt){
                //Load
                this.linearCounter = this.lcLoadValue;
                this.updateSampleCondition();
            }
            else if(this.linearCounter > 0){
                //Decrement
                this.linearCounter--;
                this.updateSampleCondition();
            }
            //???
            if(!this.lcControl){
                //Clear halt flag.
                this.lcHalt = false;
            }
        },

        writeReg:function(address,value){
            //Check the register address.
            if(address === 0x4008){
                //New values for linear counter.
                this.lcControl  = (value&0x80)!==0;
                this.lcLoadValue =  value&0x7F;
                //Length counter enable.
                this.lengthCounterEnable = !this.lcControl;
            }
            else if(address === 0x400A){
                //Programmable timer.
                this.progTimerMax &= 0x700;
                this.progTimerMax |= value;
            }
            else if(address === 0x400B){
                //Programmable timer, length counter.
                this.progTimerMax &= 0xFF;
                this.progTimerMax |= ((value&0x07)<<8);
                this.lengthCounter = nes.apu.getLengthMax(value&0xF8);
                this.lcHalt = true;
            }
            //???
            this.updateSampleCondition();
        },

        clockProgrammableTimer:function(nCycles){
            //???
            if(this.progTimerMax > 0){
                this.progTimerCount += nCycles;
                while(this.progTimerMax > 0 && this.progTimerCount >= this.progTimerMax){
                    this.progTimerCount -= this.progTimerMax;
                    if(this.isEnabled && this.lengthCounter>0 && this.linearCounter > 0){
                        this.clockTriangleGenerator();
                    }
                }
            }
        },

        clockTriangleGenerator:function(){
            //???
            this.triangleCounter++;
            this.triangleCounter &= 0x1F;
        },

        setEnabled:function(value){
            //Set the enabled flag.
            this.isEnabled = value;
            //If not enabled, set the length counter to 0.
            if(!value){
                this.lengthCounter = 0;
            }
        },

        updateSampleCondition:function(){
            //???
            this.sampleCondition = this.isEnabled && this.progTimerMax > 7 && this.linearCounter > 0 && this.lengthCounter > 0;
        },

    },

    //======================
    //== Square Channel 1 ==
    //======================

    square1:{

    //Properties

        dutyLookup:[0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,1,0,0,1,1,1,1,1],

        impLookup:[1,-1,0,0,0,0,0,0,1,0,-1,0,0,0,0,0,1,0,0,0,-1,0,0,0,-1,0,1,0,0,0,0,0],

        isEnabled:null,
        lengthCounterEnable:null,
        sweepActive:null,
        envDecayDisable:null,
        envDecayLoopEnable:null,
        envReset:null,
        updateSweepPeriod:null,

        progTimerCount:null,
        progTimerMax:null,
        lengthCounter:null,
        squareCounter:null,
        sweepCounter:null,
        sweepCounterMax:null,
        sweepMode:null,
        sweepShiftAmount:null,
        envDecayRate:null,
        envDecayCounter:null,
        envVolume:null,
        masterVolume:null,
        dutyMode:null,
        sampleValue:null,

    //Methods

        reset:function(){
            //Reset...numbers?
            this.progTimerCount = 0;
            this.progTimerMax = 0;
            this.lengthCounter = 0;
            this.squareCounter = 0;
            this.sweepCounter = 0;
            this.sweepCounterMax = 0;
            this.sweepMode = 0;
            this.sweepShiftAmount = 0;
            this.envDecayRate = 0;
            this.envDecayCounter = 0;
            this.envVolume = 0;
            this.masterVolume = 0;
            this.dutyMode = 0;
            //Reset...booleans?
            this.isEnabled = false;
            this.lengthCounterEnable = false;
            this.sweepActive = false;
            this.envDecayDisable = false;
            this.envDecayLoopEnable = false;
        },

        clockLengthCounter:function(){
            //???
            if(this.lengthCounterEnable && this.lengthCounter > 0){
                this.lengthCounter--;
                if(this.lengthCounter === 0){
                    this.updateSampleValue();
                }
            }
        },

        clockEnvDecay:function(){
            if(this.envReset){
                //Reset envelope.
                this.envReset = false;
                this.envDecayCounter = this.envDecayRate+1;
                this.envVolume = 0xF;
            }
            else if((--this.envDecayCounter) <= 0){
                //Normal handling.
                this.envDecayCounter = this.envDecayRate+1;
                if(this.envVolume>0){
                    this.envVolume--;
                }
                else{
                    this.envVolume = this.envDecayLoopEnable?0xF:0;
                }
            }
            //Set the master volume.
            this.masterVolume = this.envDecayDisable?this.envDecayRate:this.envVolume;
            //Update the sample value.
            this.updateSampleValue();
        },

        clockSweep:function(){
            //???
            if(--this.sweepCounter <= 0){
                this.sweepCounter = this.sweepCounterMax + 1;
                if(this.sweepActive && this.sweepShiftAmount>0 && this.progTimerMax>7){
                    //Calculate result from shifter.
                    if(this.sweepMode === 0){
                        this.progTimerMax += (this.progTimerMax>>this.sweepShiftAmount);
                        if(this.progTimerMax > 4095){
                            this.progTimerMax = 4095;
                        }
                    }
                    else{
                        this.progTimerMax = this.progTimerMax-((this.progTimerMax>>this.sweepShiftAmount)-(this.sqr1?1:0));
                    }
                }
            }
            //???
            if(this.updateSweepPeriod){
                this.updateSweepPeriod = false;
                this.sweepCounter = this.sweepCounterMax+1;
            }
        },

        updateSampleValue:function(){
            //???
            if((this.isEnabled && this.lengthCounter > 0 && this.progTimerMax > 7) && !(this.sweepMode === 0 && (this.progTimerMax+(this.progTimerMax>>this.sweepShiftAmount)) > 4095)){
                this.sampleValue = this.masterVolume*this.dutyLookup[(this.dutyMode<<3)+this.squareCounter];
            }
            else{
                this.sampleValue = 0;
            }
        },

        writeReg:function(address,value){
            //Switch between the registry addresses.
            if(address === 0x4000){
                // Volume/Envelope decay:
                this.envDecayDisable = ((value&0x10) !== 0);
                this.envDecayRate = value&0xF;
                this.envDecayLoopEnable = ((value&0x20) !== 0);
                this.dutyMode = (value>>6)&0x3;
                this.lengthCounterEnable = ((value&0x20) === 0);
                this.masterVolume = this.envDecayDisable?this.envDecayRate:this.envVolume;
                this.updateSampleValue();
            }
            else if(address === 0x4001){
                //Sweep
                this.sweepActive = ((value&0x80) !== 0);
                this.sweepCounterMax = ((value>>4)&7);
                this.sweepMode = (value>>3)&1;
                this.sweepShiftAmount = value&7;
                this.updateSweepPeriod = true;
            }
            else if(address === 0x4002){
                //Programmable Timer
                this.progTimerMax &= 0x700;
                this.progTimerMax |= value;
            }
            else if(address === 0x4003){
                //Programmable Timer, Length Counter
                this.progTimerMax &= 0xFF;
                this.progTimerMax |= ((value&0x7)<<8);
                //???
                if(this.isEnabled){
                    this.lengthCounter = nes.apu.getLengthMax(value&0xF8);
                }
                //???
                this.envReset = true;
            }
        },

        setEnabled:function(value){
            //Set the enabled flag.
            this.isEnabled = value;
            //If not enabled, set the length counter to 0.
            if(!value){
                this.lengthCounter = 0;
            }
            //Update the sample value.
            this.updateSampleValue();
        },

    },

    //======================
    //== Square Channel 2 ==
    //======================

    square2:{

    //Properties

        dutyLookup:[0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,1,0,0,1,1,1,1,1],

        impLookup:[1,-1,0,0,0,0,0,0,1,0,-1,0,0,0,0,0,1,0,0,0,-1,0,0,0,-1,0,1,0,0,0,0,0],

        isEnabled:null,
        lengthCounterEnable:null,
        sweepActive:null,
        envDecayDisable:null,
        envDecayLoopEnable:null,
        envReset:null,
        updateSweepPeriod:null,

        progTimerCount:null,
        progTimerMax:null,
        lengthCounter:null,
        squareCounter:null,
        sweepCounter:null,
        sweepCounterMax:null,
        sweepMode:null,
        sweepShiftAmount:null,
        envDecayRate:null,
        envDecayCounter:null,
        envVolume:null,
        masterVolume:null,
        dutyMode:null,
        sampleValue:null,

    //Methods

        reset:function(){
            //Reset...numbers?
            this.progTimerCount = 0;
            this.progTimerMax = 0;
            this.lengthCounter = 0;
            this.squareCounter = 0;
            this.sweepCounter = 0;
            this.sweepCounterMax = 0;
            this.sweepMode = 0;
            this.sweepShiftAmount = 0;
            this.envDecayRate = 0;
            this.envDecayCounter = 0;
            this.envVolume = 0;
            this.masterVolume = 0;
            this.dutyMode = 0;
            //Reset...booleans?
            this.isEnabled = false;
            this.lengthCounterEnable = false;
            this.sweepActive = false;
            this.envDecayDisable = false;
            this.envDecayLoopEnable = false;
        },

        clockLengthCounter:function(){
            //???
            if(this.lengthCounterEnable && this.lengthCounter > 0){
                this.lengthCounter--;
                if(this.lengthCounter === 0){
                    this.updateSampleValue();
                }
            }
        },

        clockEnvDecay:function(){
            if(this.envReset){
                //Reset envelope.
                this.envReset = false;
                this.envDecayCounter = this.envDecayRate+1;
                this.envVolume = 0xF;
            }
            else if((--this.envDecayCounter) <= 0){
                //Normal handling.
                this.envDecayCounter = this.envDecayRate+1;
                if(this.envVolume>0){
                    this.envVolume--;
                }
                else{
                    this.envVolume = this.envDecayLoopEnable?0xF:0;
                }
            }
            //Set the master volume.
            this.masterVolume = this.envDecayDisable?this.envDecayRate:this.envVolume;
            //Update the sample value.
            this.updateSampleValue();
        },

        clockSweep:function(){
            //???
            if(--this.sweepCounter <= 0){
                this.sweepCounter = this.sweepCounterMax + 1;
                if(this.sweepActive && this.sweepShiftAmount>0 && this.progTimerMax>7){
                    //Calculate result from shifter.
                    if(this.sweepMode === 0){
                        this.progTimerMax += (this.progTimerMax>>this.sweepShiftAmount);
                        if(this.progTimerMax > 4095){
                            this.progTimerMax = 4095;
                        }
                    }
                    else{
                        this.progTimerMax = this.progTimerMax-((this.progTimerMax>>this.sweepShiftAmount)-(this.sqr1?1:0));
                    }
                }
            }
            //???
            if(this.updateSweepPeriod){
                this.updateSweepPeriod = false;
                this.sweepCounter = this.sweepCounterMax+1;
            }
        },

        updateSampleValue:function(){
            //???
            if((this.isEnabled && this.lengthCounter > 0 && this.progTimerMax > 7) && !(this.sweepMode === 0 && (this.progTimerMax+(this.progTimerMax>>this.sweepShiftAmount)) > 4095)){
                this.sampleValue = this.masterVolume*this.dutyLookup[(this.dutyMode<<3)+this.squareCounter];
            }
            else{
                this.sampleValue = 0;
            }
        },

        writeReg:function(address,value){
            //Switch between the registry addresses.
            if(address === 0x4004){
                // Volume/Envelope decay:
                this.envDecayDisable = ((value&0x10) !== 0);
                this.envDecayRate = value&0xF;
                this.envDecayLoopEnable = ((value&0x20) !== 0);
                this.dutyMode = (value>>6)&0x3;
                this.lengthCounterEnable = ((value&0x20) === 0);
                this.masterVolume = this.envDecayDisable?this.envDecayRate:this.envVolume;
                this.updateSampleValue();
            }
            else if(address === 0x4005){
                //Sweep
                this.sweepActive = ((value&0x80) !== 0);
                this.sweepCounterMax = ((value>>4)&7);
                this.sweepMode = (value>>3)&1;
                this.sweepShiftAmount = value&7;
                this.updateSweepPeriod = true;
            }
            else if(address === 0x4006){
                //Programmable Timer
                this.progTimerMax &= 0x700;
                this.progTimerMax |= value;
            }
            else if(address === 0x4007){
                //Programmable Timer, Length Counter
                this.progTimerMax &= 0xFF;
                this.progTimerMax |= ((value&0x7)<<8);
                //???
                if(this.isEnabled){
                    this.lengthCounter = nes.apu.getLengthMax(value&0xF8);
                }
                //???
                this.envReset = true;
            }
        },

        setEnabled:function(value){
            //Set the enabled flag.
            this.isEnabled = value;
            //If not enabled, set the length counter to 0.
            if(!value){
                this.lengthCounter = 0;
            }
            //Update the sample value.
            this.updateSampleValue();
        },

    },

};
