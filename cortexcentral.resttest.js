var expect = require("chai").expect;
var RestTest = require("webdrone").RestTest;

var express = require("express");
var RestTest = require("webdrone").RestTest;
var WapModel = require("memodb").WapModel;

var Brain = require("./brain");
var CortexCentral = require("./cortexcentral");

/////////////
// TESTCLASS : CortexCentralRestTest
///////

CortexCentralRestTest.extends( RestTest );
function CortexCentralRestTest (options) {
    var self = this;
    RestTest.call(this, options);

    self.brain = new Brain({
        name: "cortexcentral.test.api",
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
    self.cortex = new CortexCentral(self.brain);
    self.app = express();
    self.router = express.Router();
    self.router.use("*.:format", function(req, res, next) {
        req.formatextext = req.params.format;
        next();
    });
    self.router.get("/h/hello/:hello?", self.cortex.hello());
    self.router.get("/h/synapse", self.cortex.synapse());
    self.router.get("/h/connect", self.cortex.connect());
    self.router.get("/h/disconnect", self.cortex.disconnect());
    self.router.get("/h/resetsession", self.cortex.resetsession());
    self.router.get("/h/resetcache", self.cortex.resetcache());
    self.router.get("/h/page/:wap/:skin?/:skeleton?", self.cortex.page());
    self.router.get("/h/block/:wap/:skin", self.cortex.block());
    self.router.get("/sitemap", self.cortex.map());
    self.router.get("/sitemap.:format?", self.cortex.map());
    self.app.use("/", self.router);
    self.server = self.app.listen(self.options.port || 3000, function() {
        console.log("Test server live at port " + (self.options.port || 3000));
    });
}

CortexCentralRestTest.prototype.hello = function (who) {
    var self = this;
    who = who || "";
    return self.request({path : "/h/hello/" + who, method : "GET"});
}

CortexCentralRestTest.prototype.page = function (wap, skin, skeleton) {
    var self = this;
    wap = wap || "";
    skin = skin || "";
    skeleton = skeleton || "";
    return self.request({path : "/h/page/" + wap + "/" + skin + "/" + skeleton, method : "GET"});
}

CortexCentralRestTest.prototype.block = function (wap, skin) {
    var self = this;
    wap = wap || "";
    skin = skin || "";
    return self.request({path : "/h/block/" + wap + "/" + skin, method : "GET"});
}



describe("api.cortex", function() {
    var wrt;

    before(function(done) {
        wrt = new CortexCentralRestTest({ urlbase : "localhost", port:4545 });
        done();
    });

    after(function(done){
        done();
    });

    describe("hello", function() {
        it("must return a text hello", function(done) {
            return wrt.hello()
            .then(function(response) {
                expect(response).to.be.ok;
                expect(response.info).to.be.ok;
                expect(response.info.duration).to.be.lessThan(1000);
                expect(response.info.statusCode).to.be.equal(200);
                expect(response.data).to.be.ok;
                expect(response.data).to.be.equal("hello");
                done();
            })
            .catch(done);
        });

        it("must return a text hello world", function(done) {
            return wrt.hello("world")
            .then(function(response) {
                expect(response).to.be.ok;
                expect(response.info).to.be.ok;
                expect(response.info.duration).to.be.lessThan(1000);
                expect(response.info.statusCode).to.be.equal(200);
                expect(response.data).to.be.ok;
                expect(response.data).to.be.equal("hello world");
                done();
            })
            .catch(done);
        });
    });

    describe("page", function() {
        it("must return an html page with head and body", function(done) {
            return wrt.page("test", "test")
            .then(
                function(response) {
                    expect(response).to.be.ok;
                    expect(response.info).to.be.ok;
                    expect(response.info.duration).to.be.lessThan(1000);
                    expect(response.info.statusCode).to.be.equal(200);
                    expect(response.data).to.be.ok;
                    //TODO
                    done();
                },
                function(error) {
                    done(error);
                }
            )
            .catch(function(err) { done(err); });
        });

        it("must return a text to a skin error", function(done) {
            return wrt.page("notest", "notest")
            .then(function(response) {
                expect(response).to.be.ok;
                expect(response.info).to.be.ok;
                expect(response.info.duration).to.be.lessThan(1000);
                expect(response.info.statusCode).to.be.equal(200);
                expect(response.data).to.be.equal("NOTEMPLATE");
                done();
            })
            .catch(done);
        });
    });

});