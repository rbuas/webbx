var fs = require("fs");
var path = require("path");
var jsext = require("jsext");
var log = require("jsext").Log;

module.exports = DNA;

function DNA (file, dir) {
    var self = this;
    if(!file) throw new Error("DNA : missing params");

    self.file = file;
    self.dir = dir;
    self.reload();
}

DNA.prototype.get = function(key) {
    var self = this;
    if(!key) return self.data;

    return self.data[key] || key;;
}

DNA.prototype.reload = function() {
    var self = this;
    var dnafile = path.normalize(path.join(self.dir || "", self.file));
    if(!jsext.fileExists(dnafile))
        return log.error("DNA : can not find the dna file", dnafile);

    var dnadata = jsext.loadJsonFile(dnafile) || {};
    if(!dnadata)
        return log.error("DNA : can not load dna file", dnafile);

    self.data = Object.assign(self, dnadata);
}