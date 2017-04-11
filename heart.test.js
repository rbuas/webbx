module.exports = HeartRestTest;

var express = require("express");
var RestTest = require("webdrone").RestTest;
var WapModel = require("memodb").WapModel;

var Brain = require("./brain");
var Heart = require("./heart");

/////////////
// TESTCLASS : HeartRestTest
///////

HeartRestTest.extends( RestTest );
function HeartRestTest (options) {
    var self = this;
    RestTest.call(this, options);

    self.brain = new Brain({
        name: "heart.test.api",
        port:self.options.port + 1010,
        publicDir: "/static",
        viewsDir: "/test/views",
        wapref:"wap",
        mcache:{
            maxSize:5000000,
            alertRatio : 0.9,
            alertCallback : function(stats) {
                //TODO : use config.json to get the mail adress, maxSize and alertRatio
                //TODO : send a mail with stats
                console.log("MCACHE::WARNING: memory was attempt next to the limit : ", stats);
            }
        },
        memory: {
            wap: {memopath:ROOT_DIR + "/test/wap", type:"wap", schema:WapModel.SCHEMA, schemadefault:WapModel.SCHEMADEFAULT}
        }
    });
    self.heart = new Heart(self.brain);
    self.app = express();
    self.router = express.Router();
    self.router.use("*.:format", function(req, res, next) {
        req.formatextext = req.params.format;
        next();
    });
    self.router.get("/h/hello/:hello?", self.heart.hello());
    self.router.get("/h/synapse", self.heart.synapse());
    self.router.get("/h/connect", self.heart.connect());
    self.router.get("/h/disconnect", self.heart.disconnect());
    self.router.get("/h/resetsession", self.heart.resetsession());
    self.router.get("/h/resetcache", self.heart.resetcache());
    self.router.get("/h/page/:wap/:skin?/:skeleton?", self.heart.page());
    self.router.get("/h/block/:wap/:skin", self.heart.block());
    self.router.get("/sitemap", self.heart.map());
    self.router.get("/sitemap.:format?", self.heart.map());
    self.app.use("/", self.router);
    self.server = self.app.listen(self.options.port || 3000, function() {
        console.log("Test server live at port " + (self.options.port || 3000));
    });
}

HeartRestTest.prototype.hello = function (who) {
    var self = this;
    who = who || "";
    return self.request({path : "/h/hello/" + who, method : "GET"});
}

HeartRestTest.prototype.page = function (wap, skin, skeleton) {
    var self = this;
    wap = wap || "";
    skin = skin || "";
    skeleton = skeleton || "";
    return self.request({path : "/h/page/" + wap + "/" + skin + "/" + skeleton, method : "GET"});
}

HeartRestTest.prototype.block = function (wap, skin) {
    var self = this;
    wap = wap || "";
    skin = skin || "";
    return self.request({path : "/h/block/" + wap + "/" + skin, method : "GET"});
}