//
//  Nintendo Entertainment System
//_________________________________//

//Todo List

	//Optimizations:
		//Clean up the ppu.
		//Clean up the apu?

	//Move to typed arrays eventually, very browser specific though.

	//Abstract 64 sprite objects out of the currently used arrays?
		//Might make it easier to move more towards native canvas rendering.

	//Move more towards using native canvas rendering methods, less javascript.
		//Move from rendering to the buffer to rendering directly onto the canvas.
		//Instead of redrawing the sprites pixel by pixel, keep them in 64 buffers and write the buffers to the canvas.
			//What to do about mirroring?

	//More comments, remove all instances of "//???".

	//Fix saving the battery ram.
		//Look into Ben's method.

	//Fix Mapper 1
		//Null tiles occur on some games, Final Fantasy, Kid Icaurus

	//Fix errors showing from the test rom?

	//Fix the Nintendo Zapper implementation?
		//Used in place of the controller.
		//It sets a certain number when the color white is clicked on.

	//Sound:
		//Fix skipping/lagging?
		//Research the error with the flash object not having the method "write".
			//Just not loaded in time?
		//Upgrade to Ben's newer dynamic audio wrapper?

//Notes

	//Status flags:
		//Uninitialized.
			//Error initializing emulator, division with id "jsnes" not found on the web page.
			//Error initializing emulator, your browser does not adequately support the canvas element needed for emulation.
		//Reset, ready to load a rom.
			//Error loading rom(src), error retrieving rom file.
			//Error loading rom(src), rom file does not appear to be a valid NES rom.
			//Error loading rom(src), rom uses a mapper currently unsupported by jsnes.
		//Running at x FPS.
		//Stopped.

	//PPU Mirroring Types
		//VERTICAL_MIRRORING:0,
		//HORIZONTAL_MIRRORING:1,
		//FOURSCREEN_MIRRORING:2,
		//SINGLESCREEN_MIRRORING:3,
		//SINGLESCREEN_MIRRORING2:4,
		//SINGLESCREEN_MIRRORING3:5,
		//SINGLESCREEN_MIRRORING4:6,
		//CHRROM_MIRRORING:7,

	//Common names for the memory mappers.
	//mapperNames = ["Direct Access","Nintendo MMC1","UNROM","CNROM","Nintendo MMC3","Nintendo MMC5","FFE F4xxx","AOROM","FFE F3xxx","Nintendo MMC2","Nintendo MMC4","Color Dreams Chip","FFE F6xxx","Unknown Mapper","Unknown Mapper","100-in-1 switch","Bandai chip","FFE F8xxx","Jaleco SS8806 chip","Namcot 106 chip","Famicom Disk System","Konami VRC4a","Konami VRC2a","Konami VRC2a","Konami VRC6","Konami VRC4b","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Irem G-101 chip","Taito TC0190/TC0350","32kB ROM switch","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Tengen RAMBO-1 chip","Irem H-3001 chip","GNROM switch","SunSoft3 chip","SunSoft4 chip","SunSoft5 FME-7 chip","Unknown Mapper","Camerica chip","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Irem 74HC161/32-based","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Unknown Mapper","Pirate HK-SF3 chip"];

/**
 * @namespace The global nes object.
 */

nes = {

//Properties

	/**
	 * A flag indicating whether the nes is running or not.
	 * @type Boolean
	 */

	running:false,

	/**
	 * The desired framerate for the nes to run at.
	 * @type Number
	 * @default 60
	 */

	frameRate:60,

	/**
	 * A placeholder for the interval to run the nes at.
	 * @type Interval
	 */

	frameInterval:null,

	/**
	 * The actual framerate that the nes is running at.
	 * @type Number
	 */

	fps:0,

	/**
	 * The current status of the nes.
	 * @type String
	 * @default "Uninitialized."
	 */

	status:'Uninitialized.',

	/**
	 * A placeholder for the memory mapper needed by the loaded rom file.
	 * @type Object
	 */

	mmc:null,

	/**
	 * The rom data.
	 * @type Object
	 */

	rom:null,

	/**
	 * The path to the dynamic audio flash object(lib/dynamicaudio.swf).
	 * @type String
	 */

	dynamicAudioPath:'',

//Methods

	/**
	 * Returns whether or not the browser supports the canvas element.
	 * @returns {Boolean}
	 */

	doesBrowserSupportCanvas:function nes_doesBrowserSupportCanvas(){
		//Create the screen.
		var canvas = document.createElement('canvas');
		//Check the canvas.
		if(typeof canvas.getContext === 'function'){
			//Get the canvas context.
			var context = canvas.getContext('2d');
			//Check the context.
			if(typeof context === 'object'){
				//Return true.
				return true;
			}
		}
		//Return false.
		return false;
	},

	/**
	 * Initiates the nes, returning whether it could be initiated or not.
	 * @returns {Boolean}
	 */

	init:function nes_init(dynamicAudioPath){
		//Get the jsnes screen division.
		var screenDiv = document.getElementById('jsnes');
		//Check the division.
		if(screenDiv !== null){
			//Check if canvas is supported.
			if(this.doesBrowserSupportCanvas()){
				//Initiate the screen.
				this.screen.init(screenDiv);
				//Set the dynamic audio flash object path.
				this.dynamicAudioPath = dynamicAudioPath;
				//Initiate the controllers.
				this.controllers.init();
				//Reset the system.
				this.reset();
				return true;
			}
			//Browser does not support canvas, set the status.
			this.status = 'Error initializing emulator, your browser does not adequately support the canvas element needed for emulation.';
			return false;
		}
		//Required division not found on web page, set the status.
		this.status = 'Error initializing emulator, division with id "jsnes" not found on the web page.';
		return false;
	},

	/**
	 * Resets the nes, clearing the current rom.
	 */

	reset:function nes_reset(){
		//Stop the nes if running.
		this.stop();
		//Reset the cpu.
		this.cpu.reset();
		//Reset the ppu.
		this.ppu.reset();
		//Reset the apu.
		this.apu.reset();
		//Reset(remove) the mmc.
		this.mmc = null;
		//Reset(remove) the rom.
		this.rom = null;
		//Set the status.
		this.status = 'Reset, ready to load a rom.';
	},

	/**
	 * Starts the nes if a valid rom is loaded.
	 */

	start:function nes_start(){
		//Check if a valid rom is loaded.
		if(this.hasRom()){
			//Set the running flag.
			this.running = true;
			//Start the frame interval.
			this.frameInterval = setInterval(function frameInterval(){nes.frame();},1000/nes.frameRate);
		}
	},

	/**
	 * Stops the nes if running.
	 */

	stop:function nes_stop(){
		//Set the running flag.
		this.running = false;
		//Set the status.
		this.status = 'Stopped.';
		//Clear the frame interval.
		clearInterval(this.frameInterval);
	},

	/**
	 * Stops then starts the nes.
	 */

	restart:function nes_restart(){
		//Stop the nes.
		this.stop();
		//Save the rom source.
		var romSource = this.rom.source;
		//Reset the nes.
		this.reset();
		//Load the rom.
		this.loadRom(romSource);
		//Start the nes.
		this.start();
	},

	/**
	 * Emulates one frame for the nes.
	 */

	frame:function nes_frame(){
		//Check if running.
		if(this.running){
			//Clear the ppu buffer.
			this.ppu.startFrame();
			//Reset the cycle count to 0.
			var cycles = 0;
			//Set the inFrameLoop flag.
			var inFrameLoop = true;
			//Start the frame loop.
			while(inFrameLoop){
				//Check if no cycles are to be halted.
				if(this.cpu.cyclesToHalt === 0){
					//Execute a CPU instruction.
					cycles = this.cpu.emulate();
					//Set the cycles to the apu.
					this.apu.clockFrameCounter(cycles);
					//???
					cycles *= 3;
				}
				//Else check if the number of cycles to halt is less than or equal to 8.
				else if(this.cpu.cyclesToHalt < 9){
					//???
					cycles = this.cpu.cyclesToHalt*3;
					//Set the cycles to halt to the apu.
					this.apu.clockFrameCounter(this.cpu.cyclesToHalt);
					//Set the cycles to halt to 0.
					this.cpu.cyclesToHalt = 0;
				}
				//Else the number of cycles to halt is greater than 8.
				else{
					//Set the cycles to 24.
					cycles = 24;
					//Set the cycles to halt to the apu.
					this.apu.clockFrameCounter(8);
					//Remove 8 from the cycles to halt counter.
					this.cpu.cyclesToHalt -= 8;
				}
				//Loop for every cycle executed by the cpu.
				for(;cycles>0;cycles--){
					//Check for a sprite 0 hit.
					if(this.ppu.curX === this.ppu.spr0HitX && this.ppu.f_spVisibility === 1 && this.ppu.scanline-21 === this.ppu.spr0HitY){
						//Set the sprite 0 hit flag.
						nes.cpu.mem[0x2002] |= 64;
					}
					//Check if the ppu is done rendering.
					if(this.ppu.requestEndFrame){
						//Decrement the non-maskable interrupt counter.
						this.ppu.nmiCounter--;
						//???
						if(this.ppu.nmiCounter === 0){
							//Reset the end of frame flag.
							this.ppu.requestEndFrame = false;
							//Draw the frame and start the vBlank period.
							this.ppu.endFrame();
							//Break the frame loop.
							inFrameLoop = false;
						}
					}
					//Increment the horizontal pixel counter for every cycle.
					this.ppu.curX++;
					//Check if 341 pixels have been accounted for, even though the scanlines are only 256 pixels wide.
					if(this.ppu.curX === 341){
						//Reset the horizontal pixel counter.
						this.ppu.curX = 0;
						//Have the ppu end the scanline.
						this.ppu.endScanline();
					}
				}
			}
			//Calculate the fps.
			var now = new Date().getTime();
			var frameDifference = this.lastFrameTime-now;
			this.fps = -1000/frameDifference;
			this.lastFrameTime = now;
			//Set the status.
			this.status = 'Running at '+this.fps.toFixed(2)+' FPS.';
		}
	},

	/**
	 * Returns whether a valid rom is currently loaded.
	 * @returns {Boolean}
	 */

	hasRom:function nes_hasRom(){
		//Return whether the current rom and mmc are not null.
		return this.rom !== null && this.mmc !== null;
	},

	/**
	 * Loads the specified rom file, returns true if succesfully loaded.
	 * @returns {Boolean}
	 * @param {String} src The source of the rom file.
	 */

	loadRom:function nes_loadRom(src){
		//Stop the emulator if running.
		this.stop();
		//Create a new HTTP request to get the rom file.
		var request = new XMLHttpRequest();
		request.open('GET',src,false);
		//Set the mime type to binary.
		request.overrideMimeType('text/plain; charset=x-user-defined');
		//Try to send the request.
		try{
			request.send(null);
		}
		catch(error){
			//Error retrieving file, set the status.
			this.status = 'Error loading rom('+src+'), error retrieving rom file.';
			//Return false.
			return false;
		}
		//Cache the rom data.
		var data = request.responseText;
		//Check that the rom file is valid.
		if(data.indexOf('NES\x1a') === 0){
			//Create a blank object for the rom data.
			var rom = {};
			//Create an array holding information about the rom.
			rom.header = new Array(16);
			//Load the header.
			for(var i=0;i<16;i++){
				rom.header[i] = data.charCodeAt(i)&0xFF;
			}
			//Get the rom count.
			rom.romCount = rom.header[4];
			//Get the number of 4kb vrom banks, not 8kb.
			rom.vromCount = rom.header[5]*2;
			//Get the mirroring type.
			rom.mirroring = (rom.header[6]&1);
			//Check whether the rom has battery ram.
			rom.hasBatteryRam = (rom.header[6]&2) !== 0;
			//Get the trainer flag.
			rom.trainer = (rom.header[6]&4) !== 0;
			//Get the four screen flag.
			rom.fourScreen = (rom.header[6]&8) !== 0;
			//Get the mapper needed.
			rom.mapperType = (rom.header[6]>>4)|(rom.header[7]&0xF0);
			//Check whether any byte 8-15 is not a zero.
			for(var i=8;i<16;i++){
				if(rom.header[i] !== 0){
					//If so ignore byte 7.
					rom.mapperType &= 0xF;
				}
			}
			//Load PRG-ROM banks.
			rom.rom = new Array(rom.romCount);
			var offset = 16;
			for(var i=0;i<rom.romCount;i++){
				rom.rom[i] = new Array(16384);
				for(var j=0;j<16384;j++){
					if(offset+j >= data.length){
						break;
					}
					rom.rom[i][j] = data.charCodeAt(offset+j)&0xFF;
				}
				offset += 16384;
			}
			//Reset the vrom and vrom tiles.
			rom.vrom = new Array(rom.vromCount);
			rom.vromTile = new Array(rom.vromCount);
			//Loop through the vrom banks.
			for(var i=0;i<rom.vromCount;i++){
				//Create the tiles.
				rom.vromTile[i] = new Array(256);
				for(var j=0;j<256;j++){
					rom.vromTile[i][j] = new Tile();
				}
				//Load the bank.
				rom.vrom[i] = new Array(4096);
				for(var j=0;j<4096;j++){
					if(offset+j >= data.length){
						break;
					}
					rom.vrom[i][j] = data.charCodeAt(offset+j)&0xFF;
				}
				offset += 4096;
				//Convert the bank to the tile.
				for(var j=0;j<4096;j++){
					if((j%16)<8){
						rom.vromTile[i][j>>4].setScanline(j%16,rom.vrom[i][j],rom.vrom[i][j+8]);
					}
					else{
						rom.vromTile[i][j>>4].setScanline((j%16)-8,rom.vrom[i][j-8],rom.vrom[i][j]);
					}
				}
			}
			//Reset the nes.
			this.reset();
			//Check the mapper needed.
			if(typeof this.mappers['mmc'+rom.mapperType] === 'object'){
				//Save the rom.
				this.rom = rom;
				//Save the rom's source.
				rom.source = src;
				//Save the rom's filename, not including the extension.
				rom.name = src.substring(src.lastIndexOf('/')+1);
				rom.name = rom.name.substring(0,rom.name.lastIndexOf('.'));
				//Get the mapper.
				this.mmc = this.mappers['mmc'+rom.mapperType];
				//Load the rom data.
				this.mmc.loadROM();
				//Set the ppu mirroring from the rom.
				if(rom.fourScreen){
					//Set fourscreen mirroring.
					this.ppu.setMirroring(2);
				}
				else if(rom.mirroring === 0){
					//Set horizontal mirroring.
					this.ppu.setMirroring(1);
				}
				else{
					//Set vertical mirroring.
					this.ppu.setMirroring(0);
				}
				//Start the emulator.
				this.start();
				//Return true.
				return true;
			}
			//Rom requires an unknown mapper.
			//Set the status.
			this.status = 'Error loading rom('+src+'), rom uses a mapper currently unsupported by jsnes.';
			//Return false.
			return false;
		}
		//Rom is not valid.
		//Set the status.
		this.status = 'Error loading rom('+src+'), rom file does not appear to be a valid NES rom.';
		//Return false.
		return false;
	},

	/**
	 * Loads the save file for the current rom if it exists.
	 */

	loadBatteryRam:function nes_loadBatteryRam(){
		//Check if the rom has batteryRAM.
		if(nes.rom.hasBatteryRam){
			//Check if the save file exists.
			if(this.hasSave(this.rom.name)){
				//Get the save data.
				var data = this.getSave(this.rom.name);
				//Check the length of the data is valid.
				if(data.length === 8192){
					//Loop through the characters in the data.
					for(var i=0;i++;i<8192){
						//Set the corresponding address in memory as the character code minus 100.
						nes.cpu.mem[0x6000+i] = data.charCodeAt(i)-100;
					}
				}
			}
		}
	},

	/**
	 * Saves the save file for the current rom.
	 */

	saveBatteryRam:function nes_saveBatteryRam(){
		//Check if the rom has battery ram.
		if(nes.rom.hasBatteryRam){
			//Create a string for storing the battery ram in the window.name property.
			var batteryRam = '';
			//Loop through the battery ram data.
			for(var i=0x6000;i<0x8000;i++){
				//Add the battery ram data into the string by using characters to encode the numbers.
				//The extra value is added to keep odd characters from being used, as well as the semicolon which would skewer the data.
				batteryRam += String.fromCharCode(nes.cpu.mem[i]+100);
			}
			//Set the save data.
			this.setSave(this.rom.name,batteryRam);
		}
	},

	/**
	 * Returns whether or not save data exists for the specified name.
	 * @type Boolean
	 * @param {String} name
	 */

	hasSave:function nes_hasSave(name){
		//Return whether the name is in the divided window.name data.
		return (window.name.split(';').indexOf(name) !== -1);
	},

	/**
	 * Sets the sent data to the name in the browser's window.name property, overwriting the old save data if it exists.
	 * @param {String} name
	 * @param {String} value
	 */

	setSave:function nes_setSave(name,value){
		//Check if the name exists in the save data.
		if(this.hasSave(name)){
			//Get the save data.
			var data = window.name.split(';');
			//Remove the extra element added by split().
			data.pop();
			//Clear the window.name property.
			window.name = '';
			//Replace the old data associated with the name.
			data[data.indexOf(name)+1] = value;
			//Loop through the data elements and add them back into window.name property.
			for(var i=0;i<data.length;i++){
				window.name += data[i]+';';
			}
		}
		else{
			//Else add the save data to the window.name property.
			window.name += name+';'+value+';';
		}
	},

	/**
	 * Returns the save data associated with the specified name
	 * @returns {String}
	 * @param {String} name
	 */

	getSave:function nes_getSave(name){
		//Check if the name exists in the save data.
		if(this.hasSave(name)){
			//Get the save data.
			var data = window.name.split(';');
			//Return the element right after the name, the data.
			return data[data.indexOf(name)+1];
		}
		//Name not in the save data, return null.
		return null;
	},

	/**
	 * Clears the save data associated with the specified name.
	 * @param {String} name
	 */

	clearSave:function nes_clearSave(name){
		//Get the save data.
		var data = window.name.split(';');
		//Clear the window.name property.
		window.name = '';
		//Check if the name exists in the save data.
		if(data.indexOf(name)){
			//Remove the name and following element from the array.
			data.splice(data.indexOf(name),2);
		}
		//Loop through the data elements and add them back into window.name property.
		for(var i=0;i++;i<data.length){
			window.name += data[i]+';';
		}
	},

	/**
	 * Clears the browser's window.name property, deleting all the save data.
	 */

	clearSaves:function nes_clearSaves(){
		//Clear the window.name property.
		window.name = '';
	},

	/**
	 * Copies a variable number of elements from one array into another.
	 * @param {Array} srcArray The array to copy the elements from.
	 * @param {Number} srcPos The position in the source array to start copying elements from.
	 * @param {Array} destArray The array to copy the elements into.
	 * @param {Number} destPos The position in the destination array to start copying elements into.
	 * @param {Number} length The number of elements to copy.
	 */

	copyArrayElements:function nes_copyArrayElements(srcArray,srcPos,destArray,destPos,length){
		//Loop through the length of elements to copy.
		for(var i=0;i<length;i++){
			//Copy the element.
			destArray[destPos+i] = srcArray[srcPos+i];
		}
	},

	/**
	 * Returns a shallow copy of the specified object, used with mapper inheritance.
	 * @returns {Object}
	 * @param {Object} object
	 */

	copyObject:function nes_copyObject(object){
		//Create a new object.
		var obj = {};
		//Loop through the items in the object.
		for(var item in object){
			//Copy the item.
			obj[item] = object[item];
		}
		//Return the new object.
		return obj;
	},

	/**
	 * Copies the members of the first object into the second one, used with mapper inheritance.
	 * @param {Object} destObject
	 * @param {Object} srcObject
	 */

	applyObject:function nes_applyObject(destObject,srcObject){
		//Loop through the items in the source object.
		for(var item in srcObject){
			//Set it into the destination object.
			destObject[item] = srcObject[item];
		}
	},

	//
	//  Screen
	//__________//

	/**
	 * @namespace An abstraction of the HTML5 Canvas element to use as the screen.
	 */

	screen:{

	//Properties

		/**
		 * The canvas element.
		 * @type Object
		 */

		canvas:null,

		/**
		 * The canvas' 2d context interface.
		 * @type Object
		 */

		context:null,

		/**
		 * A copy of the canvas' image data for manipulation.
		 * @type Object
		 */

		imageData:null,

		/**
		 * A copy of the canvas' pixel data for manipulation.
		 * @type Array
		 */

		pixelData:null,

	//Methods

		/**
		 * Initiates the nes' screen, called by nes.init().
		 * @param {Object} container The element to place the Nes's screen into.
		 */

		init:function nes_screen_init(container){
			//Create the screen.
			this.canvas = document.createElement('canvas');
			//Add the screen into the container.
			container.appendChild(this.canvas);
			//Get the 2d context.
			this.context = this.canvas.getContext('2d');
			//Set the width and height.
			this.canvas.width = 256;
			this.canvas.height = 240;
			//Set the border.
			this.canvas.style.border = '1px solid black';
		}

	},

	//
	//  Controllers
	//_______________//

	/**
	 * @namespace Holds interface's for the controllers.
	 */

	controllers:{

	//Properties

		/**
		 * The state(as if in memory) of the first controller.
		 * @type Array
		 */

		state1:[64,64,64,64,64,64,64,64,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],

		/**
		 * The state(as if in memory) of the second controller.
		 * @type Array
		 */

		state2:[64,64,64,64,64,64,64,64,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],

		/**
		 * The key bindings associated with the first controller's buttons.
		 * @type Array
		 */

		keys1:[
			88,	 //A		 X
			90,	 //B		 Z
			17,	 //Select	Right Ctrl
			13,	 //Start	 Enter
			38,	 //Up		Up
			40,	 //Down	  Down
			37,	 //Left	  Left
			39,	 //Right	 Right
		],

		/**
		 * The key bindings associated with the second controller's buttons.
		 * @type Array
		 */

		keys2:[
			103,	//A		 Numpad-7
			105,	//B		 Numpad-9
			99,	 //Select	Numpad-3
			97,	 //Start	 Numpad-1
			104,	//Up		Numpad-8
			98,	 //Down	  Numpad-2
			100,	//Left	  Numpad-4
			102,	//Right	 Numpad-6
		],

	//Methods

		/**
		 * Defines the document event handlers, called by nes.init().
		 */

		init:function nes_controller(){

			/**
			 * @ignore
			 */

			//Define the key down event handler.
			document.onkeydown = function document_onkeydown(event){
				//Loop through the key codes.
				for(var i=0;i<8;i++){
					//Check the controller 1 code.
					if(event.keyCode === nes.controllers.keys1[i]){
						//Set the controller state at that key.
						nes.controllers.state1[i] = 65;
						//Return false to interrupt the default key behavior.
						return false;
					}
					//Else check the controller 2 code.
					if(event.keyCode === nes.controllers.keys2[i]){
						//Set the controller state at that key.
						nes.controllers.state2[i] = 65;
						//Return false to interrupt the default key behavior.
						return false;
					}
				}
			}

			/**
			 * @ignore
			 */

			//Define the key up event handler.
			document.onkeyup = function document_onkeyup(event){
				//Loop through the key codes.
				for(var i=0;i<8;i++){
					//Check the controller 1 code.
					if(event.keyCode === nes.controllers.keys1[i]){
						//Set the controller state at that key.
						nes.controllers.state1[i] = 64;
						//Return false to interrupt the default key behavior.
						return false;
					}
					//Else check the controller 2 code.
					if(event.keyCode === nes.controllers.keys2[i]){
						//Set the controller state at that key.
						nes.controllers.state2[i] = 64;
						//Return false to interrupt the default key behavior.
						return false;
					}
				}
			}

		}

	}

};
