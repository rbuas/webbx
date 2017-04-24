module.exports = Heart;

var moment = require("moment");
var jsext = require("jsext");
var log = require("jsext").Log;

function Heart (brain) {
    var self = this;
    self.brain = brain;
    self.options = brain.options || {};
}

Heart.prototype.response = function(res, data, skeleton, skin, format) {
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
                    res.setHeader("Content-Length", html.length);
                    res.end(html);
                    resolve();
                })
                .catch(function(error) {
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

Heart.prototype.errorpage = function(res, errormessage, detail) {
    var self = this;
    return self.response(res, {errormessage:errormessage, error:detail}, "master", "error", "html");
}

Heart.prototype.hello = function() {
    var self = this;
    return function(req, res) {
        var hello = req.params.hello;
        var content = "hello" + (hello ? " " + hello : "");
        return self.response(res, content, null, null, "text");
    };
}

Heart.prototype.synapse = function() {
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

Heart.prototype.map = function() {
    var self = this;
    return function(req, res) {
        var ref = req.params.ref;
        var map = self.brain.map(ref);
        return self.response(res, map, "sitemap", null, req.formatext || "json");
    };
}

Heart.prototype.wappage = function(wapid, ref) {
    var self = this;
    return function(req, res) {
        self.brain.wap(wapid, ref)
        .then(function(wap) {
            var skin = req.params.skin || self.brain.options.defaultSkin;
            var skeleton = req.params.skeleton || self.brain.options.masterSkeleton;
            return self.response(res, {wap:wap, session:req.session}, skeleton, skin, req.formatext || "html");
        })
        .catch(function(error) {
            return self.errorpage(res, "WAP_NOTFOUND", error);
        })
    };
}

Heart.prototype.page = function() {
    var self = this;
    return function(req, res) {
        var wap = req.wap;
        var skin = req.params.skin || self.brain.options.defaultSkin;
        var skeleton = req.params.skeleton || self.brain.options.masterSkeleton;
        return self.response(res, {wap:wap, session:req.session}, skeleton, skin, req.formatext || "html");
    };
}

Heart.prototype.block = function() {
    var self = this;
    return function(req, res) {
        var wap = req.wap;
        var skin = req.params.skin;
        return self.response(res, {wap:wap, session:req.session}, null, skin, req.formatext || "html");
    };
}

Heart.prototype.connect = function() {
    var self = this;
    return function(req, res) {
        log.message("connection start");
        var response = self.brain.viewbag({message : "session started"}, true);
        res.json(response);
    };
}

Heart.prototype.disconnect = function() {
    var self = this;
    return function(req, res) {
        var when = Date.now();
        log.message("disconnection", when);
        res.json({message : "DISCONNECT"});
    };
}

Heart.prototype.resetsession = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset session", when);
        req.session.destroy();
        res.json({message : "SESSION_RESET"});
    };
}

Heart.prototype.resetcache = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset cache", when);
        self.brain.mcache.reset();
        res.json({message : "CACHE_RESET"});
    };
}

Heart.prototype.resetskin = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset skin", when);
        self.brain.skinspider.reset();
        res.json({message : "SKIN_RESET"});
    };
}

Heart.prototype.reset = function() {
    var self = this;
    return function(req, res) {
        var when = moment().format("YYYYMMDDHHmmss");
        log.message("reset skin", when);
        self.brain.skinspider.reset();
        log.message("reset cache", when);
        self.brain.mcache.reset();
        log.message("reset session", when);
        req.session.destroy();
        res.json({message : "SKIN_RESET|CACHE_RESET|SESSION_RESET"});
    };
}