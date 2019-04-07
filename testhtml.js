
function GIF() {
    this.width = 0;
    this.height = 0;
    this.nFrames = 0;
    this.buffer = [];
    this.version = "";
    this.pos = 0; // Current Pos
    this.fileSize = 0; // Stores the File Size
    this.gloColTable = []; // Global Color Table
    this.dictColor = {}; // Dictonary of colors with respective index
    this.pixelAspectRatio = 0; // Pixel aspect ratio
    this.bgIndex = 0; // Background Index
    this.delay = 0; // Delay Time
    this.transFlag = false; // Transparent Flag
    this.transIndex = 0;// Transparent Index
    this.images = [];
}

GIF.prototype.constructor = GIF;
// Function convert bits array to decimal no
GIF.prototype.bitsNum = ba => {
    console.log(ba)
    ba.reduce(function (s, n) {
        return s * 2 + n;
    }, 0);
}

// Function to convert byte to bit
GIF.prototype.byteBit = function () {
    var byt = this.buffer[this.pos], tmp = [];
    for (var i = 7; i >= 0; i--)
        tmp.push(!!(byt & 1 << i));
    this.pos += 1;
    return tmp;
}

// Function to check whether it is a valid gif
GIF.prototype.isValidFile = function () {
    this.pos += 3;
    return ((this.buffer[0] === 71 && this.buffer[1] === 73 && this.buffer[2] === 70 && this.buffer[this.buffer.length - 1] == 59));
}

// Function read unsigned int 
GIF.prototype.getUint16 = function () {
    var tmp = this.buffer[this.pos + 1] << 8 | this.buffer[this.pos];
    this.pos += 2;
    return tmp;
}
// Function read current gif version
GIF.prototype.readVersion = function () {
    this.version = String.fromCharCode(this.buffer[this.pos]);
    this.version += String.fromCharCode(this.buffer[this.pos + 1]);
    this.version += String.fromCharCode(this.buffer[this.pos + 2]);
    this.pos += 3;
}
// Read Current Byte and increase the pos
GIF.prototype.readByte = function () {
    return this.buffer[this.pos++];
}
GIF.prototype.rgbHex = function (c) {
    return '#' + c.r.toString(16) + c.g.toString(16) + c.b.toString(16);
}
// parse Color Table
GIF.prototype.parseColTable = function (tsize) {
    if (tsize == 0) return;
    var table = [];
    for (var i = 0; i < tsize; i++) {
        table.push({ r: this.buffer[this.pos], g: this.buffer[this.pos + 1], b: this.buffer[this.pos + 2] })
        this.pos += 3;
    }
    return table;
}
// Parse Graphics Control Extension
GIF.prototype.parseGrapConExt = function () {
    this.readByte(); // Block Size
    var packedField = this.byteBit();
    this.transFlag = packedField[7];
    this.delay = this.getUint16();
    this.transIndex = this.readByte();
    this.readByte(); // Block terminator
}
// Parse Image
GIF.prototype.parseImg = function () {
    // Parse The Image Descriptor First
    var left = this.getUint16();
    var top = this.getUint16();
    var w = this.getUint16();
    var h = this.getUint16();
    var packedField = this.byteBit();
    /// Parse the Local table if Exist
    var locTable = undefined;
    if (packedField[0]) {
        var tsize = (+packedField[5]) * 4 + (+packedField[6]) * 2 + (+packedField[7]);
        tsize = (1 << (tsize + 1));
        locTable = this.parseColTable(tsize);
    }
    // Parse the Image Data
    var data = this.parseImgData({ w, h });
    var transFlag = this.transFlag, delay = this.delay, transIndex = this.transIndex;
    this.images.push({
        w, h, top, left, locTable, data, transFlag, delay, transIndex
    });
}
// GIF LZW Decoder
GIF.prototype.LZWDecode = function (minCodeSize, data, shape) {
    data.shift(); // Number of Bytes
    var pos = 0;
    var readCode = function (size) {
        var code = 0;
        for (var i = 0; i < size; i++) {
            if (data[(pos >> 3)] & (1 << (pos & 7))) {
                code |= 1 << i;
            }
            pos++;
        }
        return code;
    };

    var output = [];

    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;

    var codeSize = minCodeSize + 1;

    var dict = [];

    var clear = function () {
        dict = [];
        codeSize = minCodeSize + 1;
        for (var i = 0; i < clearCode; i++) {
            dict[i] = [i];
        }
        dict[clearCode] = [];
        dict[eoiCode] = null;

    };

    var code;
    var last;

    while (true) {
        last = code;
        code = readCode(codeSize);

        if (code === clearCode) {
            clear();
            continue;
        }

        if (code === eoiCode) break;
        if (code < dict.length) {
            if (last !== clearCode) {
                dict.push(dict[last].concat(dict[code][0]));
            }
        }
        else {
            if (code !== dict.length) throw new Error('Invalid LZW code.');
            dict.push(dict[last].concat(dict[last][0]));
        }
        output.push.apply(output, dict[code]);
        if (dict.length === (1 << codeSize) && codeSize < 12) {
            codeSize++;
        }
    }

    var tmpCan = document.createElement('canvas');
    tmpCan.width = shape.w;
    tmpCan.height = shape.h;
    console.log(output.length)
    var imgData = tmpCan.getContext('2d').getImageData(0, 0, shape.w, shape.h);
    for (var i = 0; i < imgData.data.length / 4; i++) {
        imgData.data[4 * i] = this.gloColTable[output[i]].r;
        imgData.data[4 * i + 1] = this.gloColTable[output[i]].g;
        imgData.data[4 * i + 2] = this.gloColTable[output[i]].b;
        imgData.data[4 * i + 3] = 255;
    }

    tmpCan.getContext('2d').putImageData(imgData, 0, 0);
    var tmpImg = new Image();
    tmpImg.src = tmpCan.toDataURL('image/png')
    document.body.appendChild(tmpImg)
    return tmpImg;
}

GIF.prototype.parseImgData = function (shape) {
    var minCodeSize = this.readByte();
    var data = [];
    while (true) {
        var tmpB = this.readByte();
        if (tmpB == 0) break;
        data.push(tmpB);
    }
    return this.LZWDecode(minCodeSize, data, shape);
}
GIF.prototype.loadFile = function (filename) {
    var h = new XMLHttpRequest();
    h.overrideMimeType('text/plain; charset=x-user-defined');
    h.onload = e => {
        this.fileSize = h.responseText.length;

        for (var i = 0; i < h.responseText.length; i++)
            this.buffer.push((h.responseText.charCodeAt(i) & 0xFF));
        this.buffer = new Uint8Array(this.buffer);

        if (!this.isValidFile()) throw new Error("File is Not a Gif");
        this.readVersion();

        this.width = this.getUint16();
        this.height = this.getUint16();
        var packedField = this.byteBit();
        this.bgIndex = this.readByte();
        this.pixelAspectRatio = this.readByte(); /// (N + 15) / 64 for all N<>0.
        var tsize = (+packedField[5]) * 4 + (+packedField[6]) * 2 + (+packedField[7]);
        tsize = (1 << (tsize + 1));
        this.gloColTable = this.parseColTable(tsize);
        while (this.pos < this.fileSize) {
            var tmpBy = this.readByte();
            if (tmpBy == 59) break;
            if (tmpBy == 33 && this.readByte() == 249) this.parseGrapConExt();
            if (tmpBy == 44) {
                this.parseImg();
            }
        }
        this.show();
        console.log(this)
    };
    h.onerror = function () {
    };
    h.open('GET', filename, true);
    h.send();
}
GIF.prototype.saveOriginal = fileName => {
    var blob = new Blob([new Uint8Array(this.buffer)], { type: "image/gif" });
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}
GIF.prototype.show = function () {
    var canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    // ctx.drawImage(this.images[0].data, 0, 0);
}

function Load() {
    var g = new GIF();
    g.loadFile("sample_1.gif");
}