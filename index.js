///
// Copyright (c) 2016, maldicion069 (Cristian Rodríguez) <ccrisrober@gmail.con>
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var IOCDepNotFound = (function (_super) {
    __extends(IOCDepNotFound, _super);
    function IOCDepNotFound(message) {
        _super.call(this, message);
        this.message = message;
        this.name = "IOCDepNotFound";
    }
    return IOCDepNotFound;
}(Error));
;
var IOC = (function () {
    function IOC(case_sens) {
        if (case_sens === void 0) { case_sens = false; }
        this._case_sens = false;
        this._data = {};
        this._case_sens = case_sens;
    }
    /**
     * Get value from IOC container
     * @param {string} key Name of resource
     * @return {any} Resource
     */
    IOC.prototype.$get = function (key) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        key = this.depthName(key);
        if (!this._has(key)) {
            throw new IOCDepNotFound(key);
        }
        var value = this._data[key];
        return (typeof value === "function") ? value() : value;
    };
    /**
     * Set value from IOC container
     * @param {string} key Name of resource
     * @param {string} value Value of resource
     * @param {boolean} [check_exist=false] Throw warning if
     * 	resource already defined.
     */
    IOC.prototype.$set = function (key, value, check_exist) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        key = this.depthName(key);
        if ((check_exist === true) && (this._has(key))) {
            console.warn("Key " + key + " is already defined ...");
        }
        this._data[key] = value;
    };
    /**
     * Inject values from input args (last argument need to be a function)
     * @param {array} args Array of arguments
     */
    IOC.prototype.$inject = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var fn = args[args.length - 1];
        // Check last arg is a func
        if (typeof fn !== "function") {
            throw new TypeError("Last argument must be a function");
        }
        args.pop(); // Remove fn argument
        for (var i in args) {
            args[i] = this._item(args[i]);
        }
        return fn.apply(null, args);
    };
    /**
     * Inject values from input args to input function
     * @param {array} args Array of arguments
     * @param {function} fn: Callback function
     */
    IOC.prototype.$invoke = function (args, fn) {
        for (var i in args) {
            args[i] = this.$get(args[i]);
        }
        return fn.apply(null, args);
    };
    /**
     * Inject argument values callback
     * (Note): Please, not using this function if you
     * 		offuscated your code.
     * @param {function} fn: Callback function
     */
    IOC.prototype.$call = function (fn) {
        // Get args from function arguments definition
        var args = this._getArgs(fn);
        for (var i in args) {
            args[i] = this.$get(args[i]);
        }
        return fn.apply(null, args);
    };
    /**
     * Remove resource from given key
     * @param {string} key Name of resource
     */
    IOC.prototype.$remove = function (key) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        delete this._data[key];
    };
    /**
     * Add a list of resources
     * @param {Object} list: Map with keys and values
     */
    IOC.prototype.$addList = function (list) {
        for (var key in list) {
            this.$set(key, list[key]);
        }
    };
    /**
     * Add a singleton object to IOC container
     * @param {string} key Name of singleton resource
     * @param {function} fn Callback that generate the resource
     */
    IOC.prototype.$singleton = function (key, fn) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        if (typeof fn !== "function") {
            throw new TypeError("key argument must be a function");
        }
        key = this.depthName(key);
        var eval_func;
        this._data[key] = function () {
            if (!eval_func) {
                eval_func = arguments.length ? fn.apply(null, arguments) : fn();
            }
            return eval_func;
        };
        return this;
    };
    // TODO: Documentation
    IOC.prototype.$factory = function (key, args, fn) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        key = this.depthName(key);
        var self = this;
        var eval_func;
        this._data[key] = function () {
            if (!eval_func) {
                eval_func = self.$invoke(args, fn);
            }
            return eval_func;
        };
        return this;
    };
    // TODO: Documentation
    IOC.prototype.$provider = function (key, args, fn) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        key = this.depthName(key);
        var self = this;
        var eval_func;
        this._data[key] = function () {
            if (!eval_func) {
                var arr = args;
                args.push(fn);
                eval_func = self.$inject.apply(self, arr);
            }
            return eval_func;
        };
        return this;
    };
    // ================= PROTECTED ================= //
    IOC.prototype.depthName = function (depth) {
        if (this._case_sens === true) {
            depth = depth.toLowerCase();
        }
        return depth;
    };
    IOC.prototype._getArgs = function (fn) {
        // First match everything inside the function argument parens.
        var args = fn.toString().match(/function\s.*?\(([^)]*)\)/)[1];
        // Split the arguments string into an array comma delimited.
        var mapstr = args.split(',').map(function (arg) {
            // Ensure no inline comments are parsed and trim the whitespace.
            return arg.replace(/\/\*.*\*\//, '').trim();
        });
        //return mapstr;
        return mapstr.filter(function (arg) {
            // Ensure no undefined values are added.
            return arg;
        });
    };
    IOC.prototype._item = function (key) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        key = this.depthName(key);
        if (this._has(key)) {
            return this._data[key];
        }
        throw new IOCDepNotFound(key);
    };
    IOC.prototype._has = function (key) {
        if (typeof key !== "string") {
            throw new TypeError("key argument must be a string");
        }
        key = this.depthName(key);
        return (key in this._data) === true;
    };
    IOC.prototype._getAll = function () {
        return this._data;
    };
    IOC.prototype._clear = function () {
        // Each keys in _data dictionary
        for (var x in this._data)
            if (this._data.hasOwnProperty(x))
                delete this._data[x];
    };
    IOC.prototype._keys = function () {
        return Object.keys(this._data);
    };
    return IOC;
}());
;

exports = module.exports = IOC;