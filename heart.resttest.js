var expect = require("chai").expect;
var RestTest = require("webdrone").RestTest;

var HeartTest = require("./heart.test");

describe("api.heart", function() {
    var wrt;

    before(function(done) {
        wrt = new HeartTest({ urlbase : "localhost", port:4545 });
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