/* Utils*/

var $ = function (element) {
	return document.getElementById(element);	
};

var mac = /Mac/.test(navigator.platform);
var win = /Win/.test(navigator.platform);

var Event = {
	on: function (el, type, handler, disconnect) {
		el.addEventListener(type, handler, false);
		if (disconnect) {
			return function () { el.removeEventListener(type, handler, false); };
		}
	},
	off: function (el, type, handler) {
		el.removeEventListener(type, handler, false);
	},
	preventDefault: function (e) {
		e.preventDefault();
	},
	stopPropagation: function (e) {
		e.stopPropagation();
	},
	stop: function (e) {
		Event.preventDefault(e);
		Event.stopPropagation(e);
	}
};

String.prototype.splice = function (i, remove, add) {
	remove = +remove || 0;
	add = add || '';
	return this.slice(0,i) + add + this.slice(i + remove);
};

var Extend = function(destination, source) {
	for (var property in source) {
		destination[property] = source[property];
	}
	return destination;
};

var Range = {
	copy: function (position) {
		return { 
			line: position.line,
			ch: position.ch,
			x: position.x,
			y: position.y
		};
	},

	equal: function (from, to) {
		return from.line === to.line && from.ch === to.ch;
	},

	line: function (from, to) {
		return from.line === to.line;
	},

	less: function (from, to) {
		return from.line < to.line || (from.line == to.line && from.ch < to.ch);
	},

	isWordChar: function (ch) {
		return /\w/.test(ch) || ch.toUpperCase() != ch.toLowerCase();
	}
};