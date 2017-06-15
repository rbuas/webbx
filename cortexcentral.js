module.exports = CortexCentral;

var moment = require("moment");
var jsext = require("jsext");
var log = require("jsext").Log;

function CortexCentral (brain) {
    var self = this;
    self.brain = brain;
    self.options = brain.options || {};
}

CortexCentral.prototype.response = function(res, data, skeleton, skin, format) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!res) return reject("missing response reference");

        var error = [];

        switch(format) {
            case("json") :
                res.json(data);
                resolve();
                break;
            case("html") :
                if(!data) error.push("missing data");

                self.brain.render(data, skeleton, skin)
                .then(function(html) {
                    res.setHeader("Content-Type", "text/html; charset=utf-8");
                    res.end(html);
                    resolve();
                })
                .catch(function(error) {
                    error = error || {};
                    error.data = data;
                    res.send(error);
                    resolve();
                });
                break;
            case("text") :
                res.setHeader("Content-Type", "text/plain");
                res.setHeader("Content-Length", data && data.length);
                res.end(data);
                resolve();
                break;
            default:
                res.end("unknown format");
                resolve();
                break;
        }
    });
}

CortexCentral.prototype.errorpage = function(res, errormessage, detail) {
    var self = this;
    return self.response(res, {errormessage:errormessage, error:detail}, "master", "error", "html");
}

CortexCentral.prototype.hello = function() {
    var self = this;
    return function(req, res) {
        var hello = req.params.hello;
        var content = "hello" + (hello ? " " + hello : "");
        return self.response(res, content, null, null, "text");
    };
}

CortexCentral.prototype.synapse = function() {
    var self = this;
    return function(req, res) {
        var routes = self.brain.getRoutes();
        var routeKeys = Object.keys(routes);
        if(!routeKeys || !routeKeys.length)
            return res.send("there is no route to get here");

        routeKeys.forEach(function(routePath){
            var route = routes[routePath];
            var help = route.help ? " : \t" + route.help : "";
            res.write(routePath + "(" + route.method + ")" + help + " \r\n");
        });
        res.end();
    };
}

CortexCentral.prototype.map = function() {
    var self = this;
    return function(req, res) {
        var ref = req.params.ref;
        var map = self.brain.map(ref);
        return self.response(res, map, "sitemap", null, req.formatext || "json");
    };
}

CortexCentral.prototype.wappage = function(wapid, ref, skinop) {
    var self = this;
    return function(req, res) {
        self.brain.wap(wapid, ref)
        .then(function(wap) {
            var skin = skinop || req.params.skin || self.brain.options.defaultSkin;
            var skeleton = req.params.skeleton || self.brain.options.masterSkeleton;
            return self.response(res, {wap:wap, session:req.session}, skeleton, skin, req.formatext || "html");
        })
        .catch(function(error) {
            return self.errorpage(res, "WAP_NOTFOUND", error);
        })
    };
}

CortexCentral.prototype.wap = function() {
    var self = this;
    return function(req, res) {
        if(!req.wap) return res.redirect("/404");

        var wap = req.wap;
        var skin = null;
        var skeleton = null;
        return self.response(res, wap, skeleton, skin, req.formatext || "json");
    };
}

CortexCentral.prototype.page = function() {
    var self = this;
    return function(req, res) {
        if(!req.wap) return res.redirect("/404");

        var wap = req.wap;
        var skin = req.params.skin || self.brain.options.defaultSkin;
        var skeleton = req.params.skeleton || self.brain.options.masterSkeleton;
        return self.response(res, {wap:wap, session:req.session}, skeleton, skin, req.formatext || "html");
    };
}

CortexCentral.prototype.block = function() {
    var self = this;
    return function(req, res) {
        var wap = req.wap;
        var skin = req.params.skin;
        return self.response(res, {wap:wap, session:req.session}, null, skin, req.formatext || "html");
    };
}

CortexCentral.prototype.connect = function() {
    var self = this;
    return function(req, res) {
        var response = self.brain.viewbag({message : "SESSION_STARTED", session:req.session}, true);
        res.json(response);
    };
}

CortexCentral.prototype.disconnect = function() {
    var self = this;
    return function(req, res) {
        var when = Date.now();
        log.message("disconnection", when);
        res.json({message : "DISCONNECT"});
    };
}

CortexCentral.prototype.setlang = function() {
    var self = this;
    return function(req, res) {
        var lang = req.params.lang || "";
        req.session.lang = lang && lang.toLowerCase();
        res.json({message : "LANG_CHANGED", lang:req.session.lang, session:req.session});
    };
}

CortexCentral.prototype.resetsession = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset session", when);
        req.session.destroy();
        res.json({message : "SESSION_RESET"});
    };
}

CortexCentral.prototype.resetcache = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset cache", when);
        self.brain.resetmemory();
        res.json({message : "CACHE_RESET"});
    };
}

CortexCentral.prototype.resetskin = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset skin", when);
        self.brain.resetassets();
        res.json({message : "SKIN_RESET"});
    };
}

CortexCentral.prototype.reset = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset skin", when);
        self.brain.resetassets();
        log.message("reset cache", when);
        self.brain.resetmemory();
        log.message("reset session", when);
        req.session.destroy();
        res.json({message : "SKIN_RESET|CACHE_RESET|SESSION_RESET"});
    };
}

CortexCentral.prototype.favicon = function() {
    var self = this;
    return function(req, res) {
        var standard = "favicon.ico";
        var favicon = self.brain && self.brain.dna && self.brain.dna.SITEICON || standard;
        var iconfile = self.brain && self.brain.path(favicon) || standard;
        res.sendFile(iconfile);
    };
}