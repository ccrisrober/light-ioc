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

class IOCDepNotFound extends Error {
	public name = "IOCDepNotFound";
	constructor (public message?: string) {
		super(message);
	}
}

interface IIOC {
	$get(key: string): any;
	$set(key: string, value: any, check_exist?: boolean) : void;
	$inject(...args: any[]) : void;
	$invoke(args: Array<string>, fn: Function) : void;
	$call(fn: Function) : void;
	$remove(key: string) : void;
	$addList(list : { [key:string]:any; }) : void;
	
	$singleton(key: string, fn: Function);
	$provider(key: string, args: Array<any>, fn: Function);
	$factory(key: string, args: Array<any>, fn: Function);
	//has(key: string);
	//item(key: string)
	//getAll();
	//clear();
};

class IOC implements IIOC{
	private _data : { [key:string]:any; };
	protected _case_sens: boolean = false;
	constructor(case_sens: boolean = false) {
		this._data = {};
		this._case_sens = case_sens;
	}
	/**
	 * Get value from IOC container
	 * @param {string} key Name of resource
	 * @return {any} Resource
	 */
	public $get(key: string) {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		key = this.depthName(key);
		if(!this._has(key)) {
			throw new IOCDepNotFound(key);
		}
		var value = this._data[key];
		return (typeof value === "function") ? value() : value;
	}
	/**
	 * Set value from IOC container
	 * @param {string} key Name of resource
	 * @param {string} value Value of resource
	 * @param {boolean} [check_exist=false] Throw warning if
	 * 	resource already defined.
	 */
	public $set(key: string, value: any, check_exist?: boolean) {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		key = this.depthName(key);
		if((check_exist === true) && (this._has(key))) {
			console.warn("Key " + key + " is already defined ...");
		}
		this._data[key] = value;
	}
	/**
	 * Inject values from input args (last argument need to be a function)
	 * @param {array} args Array of arguments
	 */
	public $inject(...args: any[]) {
		var fn : Function = <Function>args[args.length-1];
		// Check last arg is a func
		if(typeof fn !== "function") {
			throw new TypeError("Last argument must be a function");
		}
		args.pop(); // Remove fn argument
		for(var i in args) {
			args[i] = this._item(args[i]);
		}
		return fn.apply(null, args);
	}
	/**
	 * Inject values from input args to input function
	 * @param {array} args Array of arguments
	 * @param {function} fn: Callback function
	 */
	public $invoke(args: Array<string>, fn: Function) {
		for(var i in args) {
			args[i] = this.$get(args[i]);
		}
		return fn.apply(null, args);
	}
	/**
	 * Inject argument values callback
	 * (Note): Please, not using this function if you 
	 * 		offuscated your code.
	 * @param {function} fn: Callback function
	 */
	public $call(fn: Function) {
		// Get args from function arguments definition
		var args: Array<string> = this._getArgs(fn);
		for(var i in args) {
			args[i] = this.$get(args[i]);
		}
		return fn.apply(null, args);
	}
	/**
	 * Remove resource from given key
	 * @param {string} key Name of resource
	 */
	public $remove(key: string) {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		delete this._data[key];
	}
	/**
	 * Add a list of resources
	 * @param {Object} list: Map with keys and values
	 */
	public $addList(list : { [key:string]:any; }) {
		for (var key in list) {
			this.$set(key, list[key]);
		}
	}
	/**
	 * Add a singleton object to IOC container
	 * @param {string} key Name of singleton resource
	 * @param {function} fn Callback that generate the resource
	 */
	public $singleton(key: string, fn: Function) {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		if(typeof fn !== "function") {
			throw new TypeError("key argument must be a function");
		}
		key = this.depthName(key);
		var eval_func;
		this._data[key] = function() {
			if(!eval_func) {
				eval_func = arguments.length ? fn.apply(null, arguments) : fn();
			}
			return eval_func;
		}
		return this;
	}
	
	// TODO: Documentation
	public $factory(key: string, args: Array<any>, fn: Function) {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		key = this.depthName(key);
		var self = this;
		var eval_func;
		this._data[key] = () => {
			if(!eval_func) {
				eval_func = self.$invoke(args, fn);
			}
			return eval_func;
		}
		return this;
	}
	// TODO: Documentation
	public $provider(key: string, args: Array<any>, fn: Function) {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		key = this.depthName(key);
		var self = this;
		var eval_func;
		this._data[key] = () => {
			if(!eval_func) {
				var arr = args;
				args.push(fn);
				eval_func = self.$inject.apply(self, arr);
			}
			return eval_func;
		}
		return this;
	}
	// ================= PROTECTED ================= //
	protected depthName(depth: string) : string {
		if(this._case_sens === true) {
			depth = depth.toLowerCase();
		}
		return depth;
	}
	protected _getArgs(fn: Function) : Array<string> {
		// First match everything inside the function argument parens.
		var args : string = fn.toString().match(/function\s.*?\(([^)]*)\)/)[1];
		
		// Split the arguments string into an array comma delimited.
		var mapstr : string[] = args.split(',').map((arg) => {
			// Ensure no inline comments are parsed and trim the whitespace.
			return arg.replace(/\/\*.*\*\//, '').trim();
		});
		//return mapstr;
		return mapstr.filter((arg: any) => {
			// Ensure no undefined values are added.
			return arg;
		});
	}
	public _item(key: string) : any {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		key = this.depthName(key);
		if(this._has(key)) {
			return this._data[key];
		}
		throw new IOCDepNotFound(key);
	}
	protected _has(key: string) : boolean {
		if(typeof key !== "string") {
			throw new TypeError("key argument must be a string");
		}
		key = this.depthName(key);
		return (key in this._data) === true;
	}
	protected _getAll(): { [key:string]:any; } {
		return this._data;
	}
	protected _clear() {
		// Each keys in _data dictionary
		for (var x in this._data) 
			if (this._data.hasOwnProperty(x)) 
				delete this._data[x];
	}
	protected _keys() : Array<string> {
		return Object.keys(this._data);
	}
};