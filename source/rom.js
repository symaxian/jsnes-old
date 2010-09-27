
JSNES.ROM = function(data){

    //Reset the header.
    this.header = new Array(16);

    //Load the header.
    for(var i=0;i<16;i++){
        this.header[i] = data.charCodeAt(i) & 0xFF;
    }

    //Get the rom count.
    this.romCount = this.header[4];

    //Get the number of 4kb vrom banks, not 8kb.
    this.vromCount = this.header[5]*2;

    //Get the mirroring type.
    this.mirroring = (this.header[6]&1);

    //Get the battery ram flag.
    this.batteryRam = (this.header[6]&2) !== 0;

    //Get the trainer flag.
    this.trainer = (this.header[6]&4) !== 0;

    //Get the four screen flag.
    this.fourScreen = (this.header[6]&8) !== 0;

    //Get the mapper needed.
    this.mapperType = (this.header[6]>>4) | (this.header[7]&0xF0);

    //Load the battery ram, FIXME.
    if(this.batteryRam){
        //this.loadBatteryRam();
    }

    //Check whether any byte 8-15 is not a zero.
    for(var i=8;i<16;i++){
        if(this.header[i] !== 0){
            //Ignore byte 7.
            this.mapperType &= 0xF;
        }
    }

    //Load PRG-ROM banks.
    this.rom = new Array(this.romCount);
    var offset = 16;
    for(var i=0;i<this.romCount;i++){
        this.rom[i] = new Array(16384);
        for(var j=0;j<16384;j++){
            if(offset+j >= data.length){
                break;
            }
            this.rom[i][j] = data.charCodeAt(offset+j) & 0xFF;
        }
        offset += 16384;
    }

    //Reset the vrom and vrom tiles.
    this.vrom = new Array(this.vromCount);
    this.vromTile = new Array(this.vromCount);

    //Loop through the vrom banks.
    for(var i=0;i<this.vromCount;i++){

        //Create the tiles.
        this.vromTile[i] = new Array(256);
        for(var j=0;j<256;j++){
            this.vromTile[i][j] = new Tile();
        }

        //Load the bank.
        this.vrom[i] = new Array(4096);
        for(var j=0;j<4096;j++){
            if(offset+j >= data.length){
                break;
            }
            this.vrom[i][j] = data.charCodeAt(offset+j)&0xFF;
        }
        offset += 4096;

        //Convert the bank to the tile.
        for(var j=0;j<4096;j++){
            if((j%16)<8){
                this.vromTile[i][j>>4].setScanline(j%16,this.vrom[i][j],this.vrom[i][j+8]);
            }
            else{
                this.vromTile[i][j>>4].setScanline((j%16)-8,this.vrom[i][j-8],this.vrom[i][j]);
            }
        }

    }

};
