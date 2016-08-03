var expect = require("chai").expect;
var assert = require("chai").assert;
var IOC = require("../index");
describe("IOCGeneration", function() {
	var ioc;
	before(function() {
		ioc = new IOC();
		ioc.$set("var1", "mr sandman");
		ioc.$set("var2", 12 * 5);
		ioc.$set("var3", "hello");
		ioc.$set("var4", "*****");
		ioc.$set("fun", function () {
			return "fun fun fun";
		});
	})
	it("$inject test", function(done) {
		ioc.$inject("var1", "var2", function (myvar, myvar2) {
			expect(myvar).to.equal("mr sandman");
			expect(myvar2).to.equal(60);
			done();
		});
	});
	it("$invoke test", function(done) {
		ioc.$invoke(["var2", "var4", "var3", "var1"],  function(name0, name1, name2, name3) {
			expect(name0).to.equal(60);
			expect(name1).to.equal("*****");
			expect(name2).to.equal(ioc.$get("var3"));
			expect(name3).to.equal("mr sandman");
			done();
		});
	});
	it("$call test", function(done) {
		ioc.$call(function(var1, var4, fun) {
			expect(var1).to.equal("mr sandman");
			expect(var4).to.equal("*****");
			expect(fun).to.equal("fun fun fun");
			done();
		});
	});
	it("$singleton simple test", function(done) {
		var time;
		ioc.$singleton("timeNow", function() {
			time = new Date().getTime();
			return time;
		});
		var tries = 5; 
		var itv = setInterval(function() {
			ioc.$invoke(["timeNow"], function(t) {
				expect(t).to.equal(time);
				if(--tries <= 0) {
					clearInterval(itv);
					done();
				}
			});
		});
	});
	it("$singleton counter test", function(done) {
		ioc.$singleton("counter", function() {
			var Counter = (function () {
				function Counter() {
					this._value = 0;
				}
				Counter.prototype.get = function () {
					return this._value;
				};
				Counter.prototype.add = function () {
					this._value += 1;
				};
				return Counter;
			}());
			return new Counter();
		});
		var tries = 0; 
		ioc.$invoke(["counter"], function(count) {
			count.add();
			expect(count.get()).to.equal(++tries);
			
			ioc.$invoke(["counter"], function(count2) {
				count2.add();
				expect(count2.get()).to.equal(++tries);
				
				ioc.$invoke(["counter"], function(count3) {
					count3.add();
					expect(count3.get()).to.equal(++tries);
					done();
				});
			});
		});
	});
	it("$provider demo", function(done) {
		var msg = "Say hello all the world";
		ioc.$set('helloProv', function() {
			return msg;
		});
		ioc.$provider('sayHelloProv', ['helloProv'], function(hello) {
			return hello();
		});
		expect(ioc.$get('sayHelloProv')).to.equal(msg);
		done();
	});
	it("$factory demo", function(done) {
		ioc.$set("hello", function () {
			return "Hello World";
		});
		ioc.$set("bye", function () {
			return "Good bye";
		});
		ioc.$factory("sayHelloServ", ["hello", "bye"], function (hello, juas) {
			return [hello, juas];
		});
		var res = [ 'Hello World', 'Good bye' ];
		var ret = ioc.$get("sayHelloServ");
		assert.isArray(ret);
		for(var i = 0; i < res.length; i++) {
			expect(res[i]).to.equal(ret[i]);
		}
		done();
	});
});