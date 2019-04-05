
function GIF() {
    this.width = 0;
    this.height = 0;
    this.nFrames = 0;
    this.buffer = [];
    this.fileSize = 0; // Stores the File Size
    this.gloColTable = []; // Global Color Table
}

GIF.prototype.constructor = GIF;
GIF.prototype.isValidFile = function () {
    return ((this.buffer[0] === 71 && this.buffer[1] === 73 && this.buffer[2] === 70 && this.buffer[this.buffer.length-1] == 59));
}
GIF.prototype.loadFile = function (filename) {
    var h = new XMLHttpRequest();
    h.overrideMimeType('text/plain; charset=x-user-defined');
    h.onload = e => {
        this.fileSize = h.responseText.length;
        for (var i = 0; i < h.responseText.length; i++)
            this.buffer.push((h.responseText.charCodeAt(i) & 0xFF));
        if (!this.isValidFile()) throw "File is Not a Gif";
        this.width = this.buffer[7] << 8 | this.buffer[6];
        this.height = this.buffer[9] << 8 | this.buffer[8];
        var packedField = this.buffer[10].toString(2);
        var tsize = (+packedField[5])*4 + (+packedField[6])*2 + (+packedField[7]); 
        tsize = (1 << (tsize + 1));
        var offset = 13;
        for (var i = 0; i < tsize; i++) {
            this.gloColTable.push({ r: this.buffer[offset + i], g: this.buffer[offset + i + 1], b: this.buffer[offset + i + 2] })
            offset += 2;
        }
        offset += 4;
        console.log(offset)
        console.log(this)
    };
    h.onerror = function () {
    };
    h.open('GET', filename, true);
    h.send();
}
GIF.prototype.saveOriginal = fileName =>{
    var blob = new Blob([new Uint8Array(this.buffer)], {type: "image/gif"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}
function Load() {
    var g = new GIF();
    g.loadFile("sample_1.gif");
}