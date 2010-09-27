
JSNES.ROM = function(){

    this.mapperName = ["Direct Access","Nintendo MMC1","UNROM","CNROM","Nintendo MMC3","Nintendo MMC5","FFE F4xxx","AOROM","FFE F3xxx","Nintendo MMC2","Nintendo MMC4","Color Dreams Chip","FFE F6xxx","Unknown Mapper","Unknown Mapper","100-in-1 switch","Bandai chip","FFE F8xxx","Jaleco SS8806 chip","Namcot 106 chip","Famicom Disk System","Konami VRC4a","Konami VRC2a","Konami VRC2a","Konami VRC6","Konami VRC4b","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Irem G-101 chip","Taito TC0190/TC0350","32kB ROM switch","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Tengen RAMBO-1 chip","Irem H-3001 chip","GNROM switch","SunSoft3 chip","SunSoft4 chip","SunSoft5 FME-7 chip","Unknown Mapper","Camerica chip","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Irem 74HC161/32-based","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Pirate HK-SF3 chip"];

};

JSNES.ROM.prototype = {

    // Mirroring types:
    VERTICAL_MIRRORING: 0,
    HORIZONTAL_MIRRORING: 1,
    FOURSCREEN_MIRRORING: 2,
    SINGLESCREEN_MIRRORING: 3,
    SINGLESCREEN_MIRRORING2: 4,
    SINGLESCREEN_MIRRORING3: 5,
    SINGLESCREEN_MIRRORING4: 6,
    CHRROM_MIRRORING: 7,

    header:null,
    rom:null,
    vrom:null,
    vromTile:null,

    romCount:null,
    vromCount:null,
    mirroring:null,
    batteryRam:null,
    trainer:null,
    fourScreen:null,
    mapperType:null,

    load:function(data){

        this.header = new Array(16);
        for (var i = 0; i < 16; i++) {
            this.header[i] = data.charCodeAt(i) & 0xFF;
        }
        this.romCount = this.header[4];
        this.vromCount = this.header[5]*2; // Get the number of 4kB banks, not 8kB
        this.mirroring = ((this.header[6] & 1) !== 0 ? 1 : 0);
        this.batteryRam = (this.header[6] & 2) !== 0;
        this.trainer = (this.header[6] & 4) !== 0;
        this.fourScreen = (this.header[6] & 8) !== 0;
        this.mapperType = (this.header[6] >> 4) | (this.header[7] & 0xF0);

        /* TODO
        if (this.batteryRam)
            this.loadBatteryRam();*/

        // Check whether byte 8-15 are zero's:
        for(var i=8;i<16;i++){
            if(this.header[i] !== 0){
                this.mapperType &= 0xF;//Ignore byte 7
                break;
            }
        }

        // Load PRG-ROM banks:
        this.rom = new Array(this.romCount);
        var offset = 16;
        for(var i=0; i<this.romCount;i++){
            this.rom[i] = new Array(16384);
            for(var j=0;j<16384;j++){
                if(offset+j >= data.length){
                    break;
                }
                this.rom[i][j] = data.charCodeAt(offset+j) & 0xFF;
            }
            offset += 16384;
        }

        //Load CHR-ROM banks.
        this.vrom = new Array(this.vromCount);
        for(var i=0;i<this.vromCount;i++){
            this.vrom[i] = new Array(4096);
            for(var j=0;j<4096;j++){
                if(offset+j >= data.length){
                    break;
                }
                this.vrom[i][j] = data.charCodeAt(offset+j)&0xFF;
            }
            offset += 4096;
        }

        //Create VROM tiles.
        this.vromTile = new Array(this.vromCount);
        for(var i=0;i<this.vromCount;i++){
            this.vromTile[i] = new Array(256);
            for(var j=0;j<256;j++){
                this.vromTile[i][j] = new Tile();
            }
        }

        //Convert CHR-ROM banks to tiles:
        for(var v=0;v<this.vromCount;v++){
            for(var i=0;i<4096;i++){
                if((i%16)<8){
                    this.vromTile[v][i>>4].setScanline(i%16,this.vrom[v][i],this.vrom[v][i+8]);
                }
                else{
                    this.vromTile[v][i>>4].setScanline((i%16)-8,this.vrom[v][i-8],this.vrom[v][i]);
                }
            }
        }

    },

    createMapper:function(){
        if(typeof JSNES.Mappers[this.mapperType] !== 'undefined'){
            return new JSNES.Mappers[this.mapperType](nes);
        }
        nes.updateStatus("This ROM uses a mapper not supported by JSNES: "+this.mapperName[this.mapperType]+"("+this.mapperType+")");
        return null;
    },

};
