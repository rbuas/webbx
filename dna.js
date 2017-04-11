var fs = require("fs");
var path = require("path");
var jsext = require("jsext");
var log = require("jsext").Log;

module.exports = DNA;

function DNA (file, dir) {
    var self = this;
    if(!file) throw new Error("DNA : missing params");

    dir = dir || "";
    var dnafile = path.normalize(path.join(dir, file));
    if(!jsext.fileExists(dnafile))
        return log.error("DNA : can not find the dna file", dnafile);

    var dnadata = jsext.loadJsonFile(dnafile) || {};
    if(!dnadata)
        return log.error("DNA : can not load dna file", dnafile);

    self.data = Object.assign(self, dnadata);
}

DNA.prototype.get = function(key) {
    var self = this;
    if(!key) return self.data;

    return self.data[key] || key;;
}