module.exports = Brain;

var ROOT_DIR = process.cwd() || "";

var bodyparser = require("body-parser");
var express = require("express");
var compression = require("compression");
var session = require("express-session");
var exphandlebars  = require("express-handlebars");
var http = require("http");
var path = require("path");

var jsext = require("jsext");
var log = require("jsext").Log;
var SkinSpider = require("skinspider");
var IParrot = require("iparrot");
var MemoCache = require("memocache");
var MemoDB = require("memodb");
var MediaDB = require("mediamemo").Media;
var MemoUserDB = require("memouser").User;

var DNA = require("./dna");
var CortexCentral = require("./cortexcentral");

function Brain (options) {
    var self = this;

    self.superparams = processSuperParams(self);
    self.version = jsext.loadJsonFile("version.json") || {version:""};
    self.options = Object.assign(true, {}, self.DEFAULTOPTIONS, options, self.superparams) || {};

    self.app = express();
    self.app.use(compression());
    log.assert(self.app, "BRAIN::ERROR : can not create app from express");

    self.server = http.createServer(self.app);
    log.assert(self.server, "BRAIN::ERROR : can not create server from http");

    self.name = self.options.name;
    log.message("BRAIN : " + (self.name || "") + " starting ...");

    self.dna = new DNA(self.options.dna, self.options.rootDir);

    if(self.options.skinspider) {
        var viewDir = self.path(self.options.viewsDir);
        self.app.engine(self.options.skinspider, exphandlebars({
            defaultLayout: self.options.masterSkeleton, 
            extname: "." + self.options.viewExtension, 
            partialsDir: viewDir + "/partials/",
            layoutDir: viewDir + "/layouts/"
        }));
        self.app.set("views", viewDir);
        self.app.set("view cache", true);
        self.app.set("view engine", self.options.skinspider);

        self.helpers = defaultHelpers(self, self.options.helpers);
        self.skinspider = new SkinSpider({
            path:viewDir, 
            ext:self.options.viewExtension, 
            helpers:self.helpers, 
            compression:self.options.compression && self.options.htmlcompression
        });
    }

    self.mcache = new MemoCache(self.options.mcache);
    activeMemory(self);

    self.iparrot = new IParrot(Object.assign({languages:self.dna.LANGUAGES}, self.options.iparrot));
    self.friends = new MemoUserDB(Object.assign({mcache:self.mcache}, self.options.friends, setMessanger(self)));
    self.cortex = new CortexCentral(self);

    configCore(self);

    activeRoutes(self);

    self.start();
}

Brain.prototype.USERTYPE = {
    UNKNOWN : "UNKNOWN",
    VIEWER : "VIEWER",
    VIP : "VIP",
    ADMIN : "ADMIN"
};

Brain.prototype.DEFAULTOPTIONS = {
    name : "",
    port : 5000,
    address : "localhost",
    rootDir: ROOT_DIR,
    dna: "dna.json",
    static: ["static", "ext", "skeleton"],
    viewsDir: "skeleton",
    masterSkeleton : "app",
    defaultSkin : "wappage",
    encryptkey: "secret",
    wapref:"wap",
    skinspider: "html",
    viewExtension: "html",
    mcache : {
        maxSize:5000000,
        alertRatio : 0.9,
        alertCallback : function(stats) {
            console.log("BRAIN::WARNING : memory was attempt next to the limit : ", stats);
        }
    },
    iparrot: {
        path : "./static/resource",
        filename : "message.json"
    },
    friends: {
        memopath:"./friends"
    },
    access : {
        VIP : ["/keys", "/count", "/block", "/page", "/resetsession"],
        ADMIN : ["/create", "/clone", "/update", "/remove", "/removelist", "/synapse", "/resetcache"]
    },
    vip : ["localhost"],
    loginRoute : "/",
    forbiddenRoute : "/forbidden",
    compression : true,
    htmlcompression : {
        caseSensitive:             true,
        removeComments:            true,
        collapseWhitespace:        true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes:     true,
        removeEmptyAttributes:     true,
        minifyJS:                  true
    }
};

Brain.prototype.start = function() {
    var self = this;
    var port = self.options.port || 3000;
    var address = self.options.address || "";

    return self.server.listen(port, function(request, response) {
        var message = "BRAIN : backbone " + self.name + " active at " + address;
        if(port) message = message + ":" + port;
        log.message(message);
    });
}

Brain.prototype.path = function(rel) {
    var self = this;
    return path.normalize(path.join(self.options.rootDir, rel));
}

Brain.prototype.view = function(res, ext) {
    var self = this;
    if(!res)
        return;

    var views = self.options.viewsDir || "";
    var root = self.options.rootDir || "";
    var ext =  self.options.viewExtension ? "." + self.options.viewExtension : "";

    var viewfile = path.normalize(path.join(root, views, res + ext));
    return viewfile;
}

Brain.prototype.route = function(route) {
    var self = this;
    if(!route || !route.path || !route.cb)
        return log.warning("BRAIN::WARNING : missing parameters in routes table", route);

    if(self.routes[route.path])
        return log.error("BRAIN : double route");

    var method = route.method || "get";
    var valid = false;
    switch(method) {
        case "post": // POST METHOD
            log.message("BRAIN : synapse (post): " + route.path);
            self.app.post(route.path, route.cb);
            valid = true;
        break;

        case "get": // GET METHOD
            log.message("BRAIN : synapse (get): " + route.path);
            self.app.get(route.path, route.cb);
            valid = true;
        break;

        case "usocket": //SOCKET METHOD
            log.message("BRAIN : synapse (user socket): " + route.path);
            self.usermanager.on(route.path, route.cb);
            valid = true;
        break;
    }

    if(valid)
        self.routes[route.path] = route;
}

Brain.prototype.getRoutes = function () {
    var self = this;
    return self.routes;
}

Brain.prototype.map = function (wapref) {
    var self = this;
    var memodb = self.memory[ref || self.options.wapref];
    if(!memddb) return;

    return memodb.keys();
}

Brain.prototype.wap = function(wapid, wapref) {
    var self = this;
    return new Promise(function(resolve, reject) {
        wapref = wapref || self.options.wapref;
        var memodb = self.memory[wapref];
        if(!memodb) return reject("Can not found the wap momodb ref " + wapref);

        return memodb.get(wapid).then(resolve, reject);
    });
}

Brain.prototype.post = function(path, callback, help) {
    var self = this;
    var newroute = {method:"post", path:path, cb:callback, help:help};
    self.route(newroute);
}

Brain.prototype.get = function(path, callback, help) {
    var self = this;
    var newroute = {method:"get", path:path, cb:callback, help:help};
    self.route(newroute);
}

Brain.prototype.param = function(param, callback) {
    var self = this;
    self.app.param(param, callback);
}

Brain.prototype.usocket = function(path, callback, help) {
    var self = this;
    var newroute = {method:"usocket", path:path, cb:callback, help:help};
    self.route(newroute);
}

Brain.prototype.middleware = function(callback) {
    var self = this;
    self.app.use(callback);
}

Brain.prototype.render = function(data, skeleton, skin) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!skin) return reject("missing skin parameter");

        data.skeleton = skeleton;
        data.skin = skin;

        var viewbag = self.viewbag(data);
        var result = self.skinspider.render(data.skeleton || data.skin, viewbag);
        if(!result || !result.html || result.error) return reject(result);

        return resolve(result.html);
    });
}

Brain.prototype.viewbag = function(data) {
    var self = this;
    var viewbag = Object.assign({}, {
        dna : self.dna, 
        superparams : self.superparams, 
        bagroot:true}, data);
    return viewbag;
}

Brain.prototype.version = function() {
    var self = this;
    return self.version && self.version.version;
}

Brain.prototype.passport = function(route, usertype, userref) {
    var self = this;
    if(!self.options.access) return;

    if(usertype != self.USERTYPE.ADMIN) {
        var adminList = self.options.access[self.USERTYPE.ADMIN];
        for(var i = 0; i < adminList.length; ++i) {
            var itempath = adminList[i];
            if(route.indexOf(itempath) >= 0) return {redirection:self.options.loginRoute + "?passporttype=" + usertype, code:403};
        }
    }

    if(userref != self.USERTYPE.VIP) {
        var clientList = self.options.access[self.USERTYPE.VIP];
        for(var i = 0; i < clientList.length; ++i) {
            var itempath = clientList[i];
            if(route.indexOf(itempath) >= 0) return {redirection:self.options.forbiddenRoute + "?passportref=" + userref, code:403};
        }
    }

    return {code : 200};
}

Brain.prototype.resetmemory = function() {
    var self = this;
    if(self.mcache) self.mcache.reset();
    if(self.iparrot) self.iparrot.resetcache();
    if(self.dna) self.dna.reload();
}

Brain.prototype.resetassets = function() {
    var self = this;
    if(self.skinspider) self.skinspider.reset();
}



// PRIVATE

function processSuperParams (self) {
    var args = process.argv.slice(2);
    var superparams = {};
    args.forEach(function (val) {
        var argd = val.split("=");
        var key = argd && argd.length > 0 ? argd[0] : null;
        var value = argd && argd.length > 1 ? argd[1] : null;
        superparams[key] = value;
    });
    return superparams;
}

function activeRoutes (self) {
    self.routes = {};

    var routes = self.options.routes;
    if(!routes)
        return;

    routes.forEach(function(route) {
        self.route(route);
    });
}

function activeMemory (self) {
    self.memory = self.memory || {};

    var memory = self.options.memory;
    if(!memory)
        return;

    var memoryKeys = Object.keys(memory);
    memoryKeys.forEach(function(key) {
        var memoConfig = Object.assign({mcache:self.mcache, supertype:"memo"}, memory[key]);
        switch(memoConfig.supertype) {
            case("media"):
                self.memory[key] = new MediaDB(memoConfig);
                break;
            case("memo"):
            default:
                self.memory[key] = new MemoDB(memoConfig);
                break;
        }
    });
}

function configCore (self) {
    //STATIC
    if(self.options.static) {
        self.options.static.forEach(function(static) {
            var publicpath = self.path(static); 
            self.app.use("/" + static, express.static(publicpath));
            log.message("BRAIN : static path : ", publicpath);
        });
    }

    //BASIC
    self.app.use(bodyparser.json());
    self.app.use(bodyparser.json({ type: 'application/vnd.api+json' })); 
    self.app.use(bodyparser.urlencoded({extended:true}));
    self.app.use(session({secret:self.options.encryptkey, resave : true, saveUninitialized : true}));

    //RESPONSE FORMAT MIDDLEWARE
    self.app.use("*.:formatext", function(req, res, next) {
        req.formatext = req.params.formatext;
        next();
    });

    //AUTHENTICATION MIDDLEWARE
    self.app.use(function(req, res, next) {
        req.user = null; //TODO
        req.userLogged = !!req.user;
        next();
    });

    //ADMIN MIDDLEWARE
    self.app.use(function(req, res, next) {
        req.useradmin = null; //TODO
        req.useradminLogged = !!req.useradmin;
        next();
    });

    //ACCESS MIDDLEWARE - TODO : to verify a possible problem with order param/use 
    self.app.use(function(req, res, next) {
        req.usertype = getUsertype(self, req.useradminLogged, req.userLogged);
        req.userref = getUserref(self, req.hostname, req.headers.referrer || req.headers.referer || req.header("Referrer") || req.header("Referer"));
        var pass = self.passport(req.url, req.usertype, req.userref);
        if(!pass || pass.code != 200)
            res.redirect(pass.redirection || "/");

        next();
    });

    //FRIEND MIDDLEWARE
    var friendsdb = self.friends;
    if(friendsdb) self.param(friendsdb.TYPE, friendsdb.router.memoParam());

    //WAP MIDDLEWARE
    var memodb = self.memory[self.options.wapref];
    if(memodb) {
        self.param(memodb.TYPE, memodb.router.memoParam());
        self.param(memodb.TYPE, function (req, res, next) {
            if(req.wap) req.wap = translateWap(self, req.wap, req.lang);
            next();
        });
    }
}

function getUsertype (self, adminLogged, userLogged, referrer) {
    return adminLogged && self.USERTYPE.ADMIN || userLogged && self.USERTYPE.VIEWER || self.USERTYPE.UNKNOWN;
}

function getUserref (self, hostname, referrer) {
    if(!referrer) return self.USERTYPE.UNKNOWN;

    if(self.options.vip) {
        if(self.options.vip.indexOf(referrer) >= 0) return self.USERTYPE.VIP;
    }

    return (hostname == referrer) ? self.USERTYPE.VIP : self.USERTYPE.UNKNOWN;
}

function getRootContext (context) {
    if(!context || context.bagroot) return context;

    return context && context.data && context.data.root;
}

function defaultHelpers (self, additionals) {
    return Object.assign({}, {
        i : function(t, context) {
            var root = getRootContext(context);
            if(!root) return;

            var lang = root.session && root.session.lang;
            var itext = self.iparrot && self.iparrot.text(t, lang);
            return itext;
        },
        xsv : function(values, options) {
            if(!values) return;
            
            var x = options && options.separator || ", ";

            return values.join(x);
        },
        waptitle : function(context) {
            var root = getRootContext(context);
            if(!root) return;

            var titleBuilder = [];
            var siteName = root.dna.SITENAME;
            if(siteName) titleBuilder.push(siteName);

            var wapTitle = root.wap && root.wap.title;
            if(wapTitle && wapTitle != siteName) titleBuilder.push(wapTitle);

            return titleBuilder.join(" | ");
        },
        wapauthor : function(context) {
            var root = getRootContext(context);
            if(!root) return;

            if(root.wap && root.wap.author) return root.wap.author

            return root.dna.AUTHOR;
        }
    }, additionals);
}

function setMessanger (self) {
    return {
        message : function(userbadge, message) {
            console.log("Friends message : " , message, userbadge);
            //TODO
        }
    }
}

function translateWap (self, wap, lang) {
    if(!self || !wap) return;

    var wo = Object.assign({}, wap);
    if(wo.metadecription) wo.metadecription = IParrot.translate(wo.metadecription, lang, self.dna.LANGUAGES);
    if(wo.resume) wo.resume = IParrot.translate(wo.resume, lang, self.dna.LANGUAGES);
    if(wo.content) wo.content = IParrot.translate(wo.content, lang, self.dna.LANGUAGES);
    return wo;
}