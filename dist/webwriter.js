;(function(){

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
  var Editor = function (lines, options) {
  
  	this.options = {
  		localStorage: "content",
  		max_line: 64,
  		padding_length: 6,
  		smartTypingPairs: true,
  		smartNewline: true
  	};
  
  	Extend(this.options, options);
  
  	this.tag_container = "p";
  	this.mark_container = "mark";
  	this.line_height = 32;
  	this.em_width = 13;
  	this.width = 832; // max_line * em_width
  	this.padding = 156; // padding_length * em_width
  	this.tab_width = 64;
  
  	this.focused = null;
  	this.lastDoubleClick =  null;
  	this.lastClick = null;
  	this.focusmode = null;
  	this.shiftSelecting = null;
  	this.textSelected = null;
  	this.textPasted = null;
  	this.previousSelection = null;
  	this.charCode = null;
  	this.inputValue = null;
  	this.from = this.to = { line: null, ch: null, x: null, y: null };
  	this.inverted = null;
  
  	this.create();
  
  	this.undomanager = new UndoManager();
  
  	this.hideCursor();
  	this.setLayout();
  	this.setTab();
  	this.addLines(lines);
  	this.addEvents();
  
  };
  /*
  
  Cursor.js
  
  */
  Extend(Editor.prototype, {
  
  	create: function () {
  
  		// Template
  		var template = 
  		'<section class="editor">' +
  			'<header></header>' +
  			'<section class="view">' +
  				'<div class="wrapper">' +
  					'<section class="body">' +
  						'<aside class="measure"></aside>' +
  						'<aside class="selection"><mark></mark><mark></mark><mark></mark></aside>' +
  						'<article class="content"></article>' +
  						'<div class="cursor"></div>' +
  						'<textarea class="input" autocorrect="off" autocapitalize="off" wrap="off"></textarea>' +
  					'</section>' +
  				'</div>' +
  			'</section>' +
  			'<footer></footer>' +
  		'</section>';
  
  		// Elements
  		var doc = document.createElement("div");
  		doc.innerHTML = template;
  		
  		var	editor = doc.firstChild,
  			header = editor.firstChild,
  			footer = editor.lastChild,
  			view = header.nextSibling,
  			wrapper = view.firstChild,
  			body = wrapper.firstChild,
  			measure = body.firstChild,
  			selection = measure.nextSibling,
  			selectionTop = selection.firstChild,
  			selectionMiddle = selectionTop.nextSibling,
  			selectionBottom = selection.lastChild,
  			content = selection.nextSibling,
  			cursor = content.nextSibling,
  			input = cursor.nextSibling;
  
  		this.editor = editor;
  		this.element = {
  			header: header,
  			footer: footer,
  			view: view,
  			wrapper: wrapper,
  			body: body,
  			measure: measure,
  			selection: selection,
  			selectionTop: selectionTop,
  			selectionMiddle: selectionMiddle,
  			selectionBottom: selectionBottom,
  			content: content,
  			cursor: cursor,
  			input: input
  		};
  
  		document.body.appendChild(this.editor);
  
  	},
  
  	setLayout: function (max_line) {
  
  		var option = this.options;
  		var measure = this.element.measure, wrapper = this.element.wrapper, content = this.element.content, tag = this.tag_container;
  		measure.innerHTML = "<" + tag + ">m</" + tag + ">";
  
  		var text = measure.firstChild;
  		option.max_line = max_line = max_line || option.max_line;
  		this.width = text.offsetWidth * max_line;
  		this.line_height = text.offsetHeight;
  		this.em_width = text.offsetWidth;
  		this.padding = option.padding_length * this.em_width;
  		this.padding_width = this.padding * 2;
  
  		wrapper.style.width = this.width + this.padding_width + "px";
  		wrapper.style.padding = this.line_height + "px 0";
  		content.style.padding = "0 " + this.padding + "px";
  
  	},
  
  	setTab: function () {
  		var measure = this.element.measure, tag = this.tag_container;
  		measure.innerHTML = "<" + tag + "><span class=\"tab\">&Tab;</span></" + tag + ">";
  		var content = measure.firstChild;
  		this.tab_width = content.offsetWidth;
  	}
  
  });
  /* 
  
  Events.js
  
  */
  Extend(Editor.prototype, {
  	addEvents: function () {
  		var el = this.element,
  				view = el.view,
  				input = el.input;
  		/* View */
  		Event.on(view, "mousedown", this.onMouseDown.bind(this));
  		Event.on(view, "selectstart", Event.preventDefault);
  		/* Textarea */
  		Event.on(input, "keyup", this.onKeyUp.bind(this));
  		Event.on(input, "input", this.onInput.bind(this));
  		Event.on(input, "keydown", this.onKeyDown.bind(this));
  		Event.on(input, "focus", this.onFocus.bind(this));
  		Event.on(input, "blur", this.onBlur.bind(this));
  		Event.on(input, "paste", this.onPaste.bind(this));
  	},
  	onFocus: function (e) {
  		if (!this.focused) {
  			this.focused = true;
  			this.editor.classList.add("focused");
  		}
  		this.blinkCursor();
  	},
  	onBlur: function (e) {
  		if (this.focused) {
  			this.focused = false;
  			this.editor.classList.remove("focused");
  		}
  		this.save();
  		this.hideCursor();
  		var self = this;
  		setTimeout(function () { if (!self.focused) self.setShift(); }, 150);
  	},
  	onMouseDown: function (e) {
  
  		var self = this, view = this.element.view.getBoundingClientRect(), line = this.from.line;
  		var y = e.y >= view.bottom - 10 ? e.y - 10 : e.y;
  		var start = this.getPosition(e.x, y), last, going;
  		
  		this.setShift(e.shiftKey);
  
  		// widget / todo
  		if (e.target.classList.contains("todo")) {
  			this.toggleToDo(start, start);
  			return Event.preventDefault(e);
  		}
  
  		if (!this.focused) this.onFocus();
  
  		/* Drag and doble click */
  		var now = +new Date();
  		if (this.lastDoubleClick && this.lastDoubleClick.time > now - 400 && Range.equal(this.lastDoubleClick.position, start)) {
  			Event.preventDefault(e);
  			return this.selectLine(start);
  		} else if (this.lastClick && this.lastClick.time > now - 400 && Range.equal(this.lastClick.position, start)) {
  			this.lastDoubleClick = { 
  				time: now,
  				position: start
  			};
  			Event.preventDefault(e);
  			return this.selectWordAt(start);
  		} else {
  			this.lastClick = { 
  				time: now,
  				position: start
  			};
  		}
  
  		Event.preventDefault(e);
  
  		this.updateCursor(start, start);
  
  		last = start;
  		start = this.shiftSelecting || start;
  		this.previousSelection = null;
  		this.updateSelection(start, last);
  
  		var mousemove = function (e) {
  
  			var end = last, element = self.element.view;
  			if (e.y <= view.top + 10) {
  
  				if (element.scrollTop !== 0) {
  					element.scrollTop -= self.line_height;
  					going = setTimeout(function (){ mousemove(e); } , 150);
  					if (element.scrollTop === 0) {
  						end = self.getPositionFromChar(1, 0);
  					} else {
  						end = self.getPosition(e.x, view.top + 10);
  					}
  				}
  				
  
  			} else if (e.y >= view.bottom - 10) {
  				
  				if (element.scrollHeight - element.offsetHeight !== element.scrollTop) {
  					element.scrollTop += self.line_height;
  					end = self.getPosition(e.x, view.bottom - 10);
  					going = setTimeout(function (){ mousemove(e); } , 150);
  				}
  				
  
  			} else if (e.x >= 0 && e.x <= window.innerWidth) {
  				end = self.getPositionFromEvent(e);
  			}
  			last = end;
  
  			self.updateSelection(start, end);
  
  		};
  
  		var move = Event.on(document.body, "mousemove", function (e) {
  
  			clearTimeout(going);
  			Event.preventDefault(e);
  			mousemove(e);
  
  		}, true);
  
  		var up = Event.on(window, "mouseup", function (e) {
  
  			clearTimeout(going);
  
  			Event.preventDefault(e);
  			if (self.focusmode) {
  				self.getLine(line).classList.remove("active");
  				self.editor.classList.add("focusmode");
  				var mouseWheel = Event.on(self.element.view, "mousewheel", function (e) {
  					self.onMouseWheel();
  					mouseWheel();
  				}, true);
  			}
  			self.updateView(self.from, self.to);
  			self.focusInput();
  
  			move();
  			up();
  		}, true);
  
  	},
  	onMouseWheel: function () {
  		this.getLine(this.selectionStart().line).classList.remove("active");
  		this.editor.classList.remove("focusmode");
  	},
  	onKeyDown: function (e) {
  		if (!this.focused) {
  			this.focusInput();
  		}
  		var code = keyBindings.keyNames[e.keyCode], bound, dropShift;
  		this.setShift(e.keyCode == 16 || e.shiftKey);
  		if (code === null || e.altGraphKey) {
  			return null;
  		}
  		if (e.altKey) {
  			code = "alt+" + code;
  		}
  		if (e.ctrlKey) {
  			code = ( mac ? "ctrl" : "super" ) + "+" + code;
  		}
  		if (e.metaKey) {
  			code = "super+" + code;
  		}
  		if (e.shiftKey && (bound = keyBindings.bind["shift+" + code])) {
  			dropShift = true;
  		} else {
  			bound = keyBindings.bind[code];
  		}
  		if (typeof bound == "string") {
  			bound = this[bound].bind(this);
  		}
  		if (!bound) {
  			return false;
  		}
  		if (dropShift) {
  			var prevShift = this.shiftSelecting;
  			this.shiftSelecting = null;
  			bound();
  			this.shiftSelecting = prevShift;
  		} else {
  			bound();
  		}
  		Event.preventDefault(e);
  	},
  	onInput: function () {
  		var self = this;
  		setTimeout(function () {
  			self.add();
  		}, 5);
  	},
  	onKeyUp: function (e) {
  		if (e.keyCode == 16) {
  			this.shiftSelecting = null;
  		} else {
  			this.textPasted = null;
  		}
  	},
  	onPaste: function (e) {
  		this.textPasted = true;
  	}
  });
  
  var keyBindings = {
  
  	bind: {
  		/* Basic */
  		"left": "goCharLeft",
  		"right": "goCharRight",
  		"up": "goLineUp",
  		"down": "goLineDown",
  		"end": "goLineEnd",
  		"home": "goDocStart",
  		"pageUp": "goPageUp",
  		"pageDown": "goPageDown",
  		"delete": "delCharRight",
  		"backspace": "delCharLeft",
  		"tab": "indentMore",
  		"shift+tab": "indentLess",
  		"enter": "newlineAndIndent", 
  		"insert": "toggleOverwrite",
  		/* Commands */
  		"super+d": "toggleFocusMode",
  		"super+a": "selectAll",
  		"super+z": "undo",
  		"shift+super+z": "redo",
  		"super+y": "redo",
  		"super+up": "goDocStart",
  		"super+end": "goDocEnd",
  		"super+down": "goDocEnd",
  		"alt+left": "goWordLeft",
  		"alt+right": "goWordRight",
  		"super+left": "goLineStart",
  		"super+right": "goLineEnd",
  		"alt+up": "goLineStart",
  		"alt+down": "goLineEnd",
  		"alt+backspace": "delWordLeft",
  		"ctrl+alt+backspace": "delWordRight",
  		"super+backspace": "deleteLine",
  		"alt+delete": "delWordRight",
  		"super+s": "save",
  		"super+g": "findNext",
  		"shift+super+g": "findPrev",
  		"super+alt+f": "replace",
  		"shift+super+alt+f": "replaceAll",
  		"super+f": "toggleFullScreen",
  		"super+b": "makeStrong",
  		"super+i": "makeEmphasis",
  		"super+u": "makeDelete",
  		"super+l": "toggleToDo",
  		// "super+tab": "toggleDocument",
  		// "super+e": "toggleWidth",
  		/* emacsy */
  		"Ctrl-F": "goCharRight",
  		"Ctrl-B": "goCharLeft",
  		"Ctrl-P": "goLineUp",
  		"Ctrl-N": "goLineDown",
  		"Alt-F": "goWordRight",
  		"Alt-B": "goWordLeft",
  		"Ctrl-A": "goLineStart",
  		"Ctrl-E": "goLineEnd",
  		"Ctrl-V": "goPageUp",
  		"Shift-Ctrl-V": "goPageDown",
  		"Ctrl-D": "delCharRight",
  		"Ctrl-H": "delCharLeft",
  		"Alt-D": "delWordRight",
  		"Alt-Backspace": "delWordLeft",
  		"Ctrl-K": "killLine",
  		"Ctrl-T": "transposeChars"
  	},
  
  	windows: {
  		"super+left": "goWordLeft", 
  		"super+right": "goWordRight", 
  		"alt+left": "goLineStart", 
  		"alt+right": "goLineEnd",
  		"super+home": "goDocStart",
  		"alt+up": "goDocStart",
  		"super+delete": "delWordRight",
  		"shift+super+f": "replace",
  		"shift+super+r": "replaceAll"
  	},
  
  	smartTypingPairs: {
  		'"' : '"',
  		"(" : ")",
  		"{" : "}",
  		"[" : "]",
  		"<" : ">",
  		"`" : "`"
  	}
  
  };
  
  if (win) {
  	for (var command in keyBindings.windows) {
  		keyBindings.bind[command] = keyBindings.windows[command];
  	}
  }
  
  var keyNames = {
  	3: "enter", 8: "backspace", 9: "tab", 13: "enter", 16: "shift", 17: "ctrl", 18: "alt",
  	19: "pause", 20: "capsLock", 27: "esc", 32: "space", 33: "pageUp", 34: "pageDown", 35: "end",
  	36: "home", 37: "left", 38: "up", 39: "right", 40: "down", 44: "printScrn", 45: "insert",
  	46: "delete", 59: ";", 91: "mod", 92: "mod", 93: "mod", 186: ";", 187: "=", 188: ",",
  	189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'", 63276: "pageUp",
  	63277: "pageDown", 63275: "end", 63273: "home", 63234: "left", 63232: "up", 63235: "right",
  	63233: "down", 63302: "insert", 63272: "delete"
  };
  keyBindings.keyNames = keyNames;
  (function () {
  	// Number keys
  	for (var i = 0; i < 10; i++) keyNames[i + 48] = String(i);
  	// Alphabetic keys
  	for (i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i).toLowerCase();
  	// Function keys
  	for (i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "f" + i;
  })();
  /*
  
  Commands.js
  
  */
  Extend(Editor.prototype, {
  
  	addLines: function (lines) {
  		lines = this.parserLines(lines);
  		this.element.content.appendChild(lines);
  	},
  
  	replaceLines: function (from, to, lines) {
  		var parent = this.element.content;
  		lines = this.parserLines(lines);
  		if (from === to) {
  			parent.replaceChild(lines, this.getLine(from));
  		} else {
  			var line = this.getLine(from), end = to - from + 1, next;
  			while (end--) {
  				next = line.nextSibling;
  				parent.removeChild(line);
  				line = next;
  			}
  			if (line) {
  				parent.insertBefore(lines, line);
  			} else {
  				parent.appendChild(lines);
  			}
  		}
  	},
  
  	updateView: function (from, to) {
  		if (this.focusmode) {
  			var line = this.getLine(this.from.line);
  			if (line) {
  				line.classList.remove("active");
  			}
  			this.getLine(from.line).classList.add("active");
  		}
  		this.updateSelection(from, to);
  		this.updateCursor(from, to);
  		this.updateInput();
  	},
  
  	getSize: function () {
  		return this.element.content.childNodes.length;
  	},
  
  	getLine: function (line) {
  		return this.element.content.childNodes[line-1];
  	},
  
  	getText: function (from, to) {
  		var line, text, i;
  
  		line = this.getLine(from);
  		text = [line.textContent];
  		if (from != to) {
  			i = from;
  			while (i < to) {
  				line = line.nextSibling;
  				text.push(line.textContent);
  				++i;
  			}
  		}
  		return text.join("\n");
  	},
  
  	getContent: function (from, to) {
  		var line, text, i, offset = 0, value;
  
  		line = this.getLine(from.line);
  		text = [line.textContent];
  		if (!Range.line(from, to)) {
  			i = from.line;
  			while (i < to.line) {
  				offset += line.textContent.length;
  				line = line.nextSibling;
  				text.push(line.textContent);
  				++i;
  			}
  		}
  
  		value = {
  			textContent: text.join("\n"),
  			selectionStart: from.ch,
  			selectionEnd: offset + to.ch + text.length - 1
  		};
  
  		value.chunk = [ value.textContent.slice(0, value.selectionStart),
  						value.textContent.slice(value.selectionStart, value.selectionEnd),
  						value.textContent.slice(value.selectionEnd) ];
  
  		return value;
  
  	},
  
  	getPositionFromPoint: function (x, y) {
  		var element = this.element, wrapper = element.wrapper, view = element.view;
  		x += wrapper.getBoundingClientRect().left;
  		y += view.getBoundingClientRect().top + 8;
  		y -= view.scrollTop - parseInt(wrapper.style.paddingTop);
  		return this.getPosition(x, y);
  	},
  
  	getPositionFromEvent: function (event) {
  		return this.getPosition(event.x, event.y);
  	},
  
  	getPositionFromChar: function (line, ch) {
  
  		var node, walker, size, range, position, x, y;
  
  		node = this.getLine(line);
  
  		walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
  		size = ch;
  
  		while (walker.nextNode()) {
  			node = walker.currentNode;
  			if (node.textContent.length >= size) {
  				break;
  			}
  			size -= node.textContent.length;
  		}
  
  		range = document.createRange();
  		range.selectNodeContents(node);
  		range.setStart(range.startContainer, size);
  		range.setEnd(range.endContainer, size);
  		
  		var positions = range.getClientRects();
  		position = positions.length > 1 ? positions[1] : positions[0];
  
  		var element = this.element, wrapper = element.wrapper, content = element.content, line_height = this.line_height;
  
  		x = position.left;
  		y = Math.floor((position.top - content.getBoundingClientRect().top)/line_height);
  
  		return {
  			line: line,
  			ch: ch,
  			x: x - wrapper.getBoundingClientRect().left,
  			y: y * line_height
  		};
  
  	},
  
  	getPosition: function (x, y) {
  		var range = document.caretRangeFromPoint(x, y);
  		range.expand('character');
  
  		var node = range.startContainer, ch = range.startOffset, tag = this.tag_container;
  		while (node) {
  			if (node.localName == tag) {
  				break;
  			}
  			if (node.previousSibling) {
  				ch += node.previousSibling.textContent.length;
  				node = node.previousSibling;
  			} else {
  				node = node.parentNode;		
  			}
  		}
  
  		var line = 0;
  		while (node) {
  			node = node.previousSibling;
  			++line;
  		}
  		var positions = range.getClientRects(), position;
  		if (positions.length > 1) {
  			position = positions[( y > positions[0].bottom ? 1 : 0 )];
  		} else {
  			position = positions[0];
  		}
  
  		var element = this.element, wrapper = element.wrapper, content = element.content, line_height = this.line_height;
  
  		x = position.left;
  		y = Math.floor((position.top - content.getBoundingClientRect().top)/line_height);
  
  		return {
  			line: line,
  			ch: ch,
  			x: x - wrapper.getBoundingClientRect().left,
  			y: y * line_height
  		};
  	},
  
  	findWord: function (position) {
        var line = this.getLine(position.line).textContent;
        var start = position.ch, end = position.ch;
        while (start > 0 && Range.isWordChar(line.charAt(start - 1))) --start;
        while (end < line.length && Range.isWordChar(line.charAt(end))) ++end;
  
        var from = this.getPositionFromChar(position.line, start);
        var to = this.getPositionFromChar(position.line, end);
  
        return {
        	from: from,
        	to: to,
        };
  	},
  
  	findPoint: function (point, dir, unit) {
  		var self = this, line = point.line, ch = point.ch, node, size = this.getSize() + 1;
  		node = this.getLine(line);
  
  		function findNextLine() {
  			for (var l = line + dir, e = dir < 0 ? 0 : size; l != e; l += dir) {
  				line = l;
  				node = self.getLine(line);
  				return true;
  			}
  		}
  
  		function moveOnce(boundToLine) {
  			if (ch == (dir < 0 ? 0 : node.textContent.length)) {
  				if (!boundToLine && findNextLine()) ch = dir < 0 ? node.textContent.length : 0;
  				else return false;
  			} else ch += dir;
  			return true;
  		}
  
  		if (unit == "char") moveOnce();
  		else if (unit == "column") moveOnce(true);
  		else if (unit == "word") {
  			var sawWord = false;
  			for (;;) {
  				if (dir < 0) if (!moveOnce()) break;
  				if (Range.isWordChar(node.textContent.charAt(ch))) sawWord = true;
  				else if (sawWord) {if (dir < 0) {dir = 1; moveOnce();} break;}
  				if (dir > 0) if (!moveOnce()) break;
  			}
  		}
  
  		return this.getPositionFromChar(line, ch, dir);
  	},
  
  	moveHorizontalPoint: function (dir, unit) {
  		var from = this.from, to = this.to, position = to;
  		if (this.shiftSelecting || Range.equal(from, to)) {
  			position = this.findPoint(position, dir, unit);
  		} else if (!Range.less(from, to)) {
  			position = dir < 0 ? to : from;
  		} else {
  			position = dir < 0 ? from : to;
  		}
  		this.updateView(this.shiftSelecting ? this.from : position, position);
  		this.previousSelection = null;
  	},
  
  	moveVerticalPoint: function (dir, unit) {
  		var distance = 0, from = this.from, to = this.to, position = to;
  		if (unit == "page") {
  			distance = scroller.clientHeight;
  		} else if (unit == "line") {
  			distance = this.line_height;
  		}
  		if (this.shiftSelecting || Range.equal(from, to)) {
  			if (this.previousSelection !== null) {
  				to.x = this.previousSelection;
  			}
  			// posicionar el cursor, coger donde esta
  			var copyCursor = Range.copy(to);
  			copyCursor.y = to.y + distance * dir;
  			this.updateCursor(copyCursor, copyCursor);
  			position = this.getPositionFromPoint(to.x, copyCursor.y);
  		} else if (!Range.less(from, to)) {
  			position = dir < 0 ? to : from;
  		} else {
  			position = dir < 0 ? from : to;
  		}
  		this.updateView(this.shiftSelecting ? this.from : position, position);
  		this.previousSelection = to.x;
  	},
  
  	removePoint: function (dir, unit) {
  		var position,
  			node,
  			del,
  			line,
  			value = this.getInputValue(true),
  			from = this.selectionStart(),
  			to = this.selectionEnd();
  		// borramos segun la dirección
  		if (!Range.equal(from, to)) {
  			del = value[1];
  			value = value[0]+value[2];
  			position = from;
  		} else if (dir < 0) {
  			position = this.findPoint(from, dir, unit);
  			from = position;
  			line = this.getContent(from, to);
  			node = line.textContent;
  			del = node.slice(line.selectionStart, line.selectionEnd);
  			value = node.slice(0, line.selectionStart) + value[2];
  		} else {
  			position = this.findPoint(from, dir, unit);
  			to = position;
  			line = this.getContent(from, to);
  			node = line.textContent;
  			del = node.slice(line.selectionStart, line.selectionEnd);
  			value = value[0] + node.slice(line.selectionEnd);
  		}
  		// eliminamos lineas y actualizamos
  		this.replaceLines(from.line, to.line, value);
  		// calcular de nuevo por si cambia la posición del caracter
  		position = this.getPositionFromChar(position.line, position.ch);
  		this.addHistory({
  			add: "",
  			del: del,
  			textSelected: this.textSelected ? to : null,
  			from: from,
  			to: position
  		});
  		if (this.focusmode) {
  			var newScrollH = this.element.content.offsetHeight,
  					scrollH = this.element.content.offsetHeight, scrollT = this.element.view.scrollTop;
  			if (scrollH != newScrollH) {
  				this.element.view.scrollTop = scrollT + newScrollH - scrollH;
  			}
  		}
  		this.updateView(position, position);
  	},
  
  	goCharLeft: function () {
  		this.moveHorizontalPoint(-1, "char");
  	},
  
  	goCharRight: function () {
  		this.moveHorizontalPoint(1, "char");
  	},
  
  	goLineUp: function () {
  		this.moveVerticalPoint(-1, "line");
  	},
  	goLineDown: function () {
  		this.moveVerticalPoint(1, "line");
  	},
  	goLineStart: function () {
  		var start = this.selectionStart(), position;
  		position = this.getPositionFromPoint(-this.padding, start.y);
  		this.updateView(this.shiftSelecting ? this.from : position, position);
  	},
  	goLineEnd: function () {
  		var start = this.selectionStart(), position;
  		position = this.getPositionFromPoint(this.width, start.y);
  		this.updateView(this.shiftSelecting ? this.from : position, position);
  	},
  	goLineStartSmart: function () {
  		
  	},
  	goPageUp: function () {
  
  	},
  	goPageDown: function () {
  		
  	},
  	goDocStart: function () {
  		var position = this.getPositionFromChar(1, 0);
  		this.updateView(this.shiftSelecting ? this.from : position, position);
  	},
  	goDocEnd: function () {
  		var position, line, size = this.getSize();
  		line = this.getLine(size); 
  		position = this.getPositionFromChar(size, line.textContent.length);
  		this.updateView(this.shiftSelecting ? this.from : position, position);
  	},
  	goWordLeft: function () {
  		this.moveHorizontalPoint(-1, "word");
  	},
  	goWordRight: function () {
  		this.moveHorizontalPoint(1, "word");
  	},
  	delCharRight: function () {
  		this.removePoint(1, "char");
  	},
  	delCharLeft: function () {
  		this.removePoint(-1, "char");
  	},
  	delWordLeft: function () {
  		this.removePoint(-1, "word");
  	},
  	delWordRight: function () {
  		this.removePoint(1, "word");
  	},
  	deleteLine: function () {
  		
  	},
  
  	indent: function (dir, from, to, noHistory) {
  		var start = dir, end = dir;
  
  		var line = this.getLine(from.line), i = to.line - from.line + 1, lines = [];
  		while (i--) {
  			if (dir < 0) {
  				lines.push(line.textContent.replace(/^\t/, ""));
  			} else {
  				lines.push("\t"+line.textContent);
  			}
  			line = line.nextSibling;
  		}
  
  		if (dir < 0) {
  			start = this.getLine(from.line).textContent === lines[0] ? 0 : dir;
  			end = this.getLine(to.line).textContent === lines[lines.length - 1] ? 0 : dir;
  		}
  
  		this.replaceLines(from.line, to.line, lines);
  		if (Range.equal(from, to)) {
  			from = to = this.getPositionFromChar(this.from.line, this.from.ch + start);
  		} else {
  			from = this.getPositionFromChar(this.from.line, this.from.ch + start);
  			to = this.getPositionFromChar(this.to.line, this.to.ch + end);
  		}
  		if(!noHistory && start !== 0 && end !== 0) {
  			this.addHistory({
  				action: "indent",
  				dir: dir,
  				from: from,
  				to: to
  			});
  		}
  		this.updateView(from, to);
  	},
  
  	indentMore: function () {
  		var from = this.selectionStart(), to = this.selectionEnd();
  		this.indent(1, from, to);
  	},
  
  	indentLess: function () {
  		var from = this.selectionStart(), to = this.selectionEnd();
  		this.indent(-1, from, to);
  	},
  
  	newlineAndIndent: function () {
  		var value = this.inputValue.chunk, node, from = this.selectionStart(), to = this.selectionEnd(), line = from.line + 1, ch = 0, start, add = "\n", del = this.textSelected, position;
  		
  		value.splice(1,1);
  		if (this.options.smartNewline) {
  			start = Parser.newline(value[0]);
  			if (start[0] && !this.shiftSelecting) {
  				if (value[0] == start[0] && !(value[1] || this.textSelected)) {
  					value = "";
  					line = from.line;
  					del = start[0];
  					this.replaceLines(line, to.line, value);
  					position = this.getPositionFromChar(line, 0);
  					this.addHistory({
  						action: "newline",
  						add: "",
  						del: del,
  						textSelected: null,
  						from: position,
  						to: to
  					});
  					this.updateView(position, position);
  					return;
  				} else {
  					value[1] = start[1] + value[1];
  					ch = start[1].length;
  					add += start[1];
  				}
  			}
  		}
  
  		this.replaceLines(from.line, to.line, value);
  		position = this.getPositionFromChar(line, ch);
  		this.addHistory({
  			action: "newline",
  			add: add,
  			del: del,
  			textSelected: this.textSelected ? to : null,
  			from: from,
  			to: position
  		});
  		if (this.focusmode) {
  			this.element.view.scrollTop = this.element.view.scrollTop + this.line_height;
  		}
  		this.updateView(position, position);
  	},
  
  	add: function () {
  		var add,
  		value = this.getInputValue(), 
  		from = this.selectionStart(),
  		to = this.selectionEnd(),
  		line = from.line,
  		ch = this.element.input.selectionEnd,
  		textPasted = false;
  		if (this.textPasted) {
  			textPasted = true;
  			add = value.slice(this.inputValue.chunk[0].length, ch);
  			value = value.split(/\r?\n/);
  			line = line + value.length - 1;
  			ch = value[value.length - 1].length - this.inputValue.chunk[2].length;
  		} else if (this.options.smartTypingPairs) {
  			add = value.slice(from.ch, ch);
  			var end = keyBindings.smartTypingPairs[add];
  			if (end) {
  				return this.smartTyping(from, to, add, end, false);
  			}
  		} else {
  			add = value.slice(from.ch, ch);
  		}
  		this.replaceLines(from.line, to.line, value);
  		var position = this.getPositionFromChar(line, ch);
  		this.addHistory({
  			add: add,
  			del: this.textSelected,
  			textSelected: this.textSelected ? to : null,
  			from: from,
  			to: position
  		});
  		if (this.focusmode) {
  			var newScrollH = this.element.content.offsetHeight,
  					scrollH = this.element.content.offsetHeight, scrollT = this.element.view.scrollTop;
  			if (scrollH != newScrollH) {
  				this.element.view.scrollTop = scrollT + newScrollH - scrollH;
  			}
  		}
  		this.updateView(position, position);
  
  	},
  
  	smartTyping: function (from, to, open, close, select, noHistory) {
  		if (this.shiftSelecting && Range.equal(from, to)) {
  			var positions = this.findWord(to);
  			from = positions.from;
  			to = positions.to;
  		}
  		var _from = Range.copy(from), _to = Range.copy(to);
  		var value = this.getContent(from, to), textSelected = value.chunk[1];
  		value = value.chunk[0] + open + value.chunk[1] + close + value.chunk[2];
  		this.replaceLines(from.line, to.line, value);
  		if (Range.equal(from, to)) {
  			from = to = this.getPositionFromChar(from.line, from.ch + open.length);
  		} else {
  			if (select) {
  				to = this.getPositionFromChar(to.line, to.ch + (Range.line(from, to) ? open.length: 0));
  				from = this.getPositionFromChar(from.line, from.ch + open.length);
  			} else {
  				from = to = this.getPositionFromChar(to.line, to.ch + (Range.line(from, to) ? open.length: 0) + close.length);
  			}
  		}
  		if(!noHistory) {
  			this.addHistory({
  				action: "smartTyping",
  				textSelected: textSelected,
  				undo: {
  					from: _from,
  					to: _to,
  				},
  				from: from,
  				to: to,
  				open: open,
  				close: close,
  				select: select
  			});
  		}
  		this.updateView(from, to);
  	},
  
  	makeStrong: function () {
  		var from = this.selectionStart(), to = this.selectionEnd();
  		this.smartTyping(from, to, "**", "**", false);
  	},
  
  	makeEmphasis: function () {
  		var from = this.selectionStart(), to = this.selectionEnd();
  		this.smartTyping(from, to, "*", "*", false);
  	},
  
  	makeDelete: function () {
  		var from = this.selectionStart(), to = this.selectionEnd();
  		this.smartTyping(from, to, "-", "-", false);
  	},
  
  	selectWordAt: function (position) {
        var positions = this.findWord(position);
        this.updateView(positions.from, positions.to);
  	},
  
  	selectLine: function (position) {
  		var from = this.getPositionFromPoint(0, position.y), to =  this.getPositionFromPoint(this.width + this.padding, position.y);
  		this.updateView(from, to);
  	},
  
  	undo: function () {
  		var undo = this.getUndo(), from, to, line, value;
  		if (undo) {
  			var action = undo.action || "";
  			if (action == "indent") {
  				this.indent(undo.dir < 0 ? 1 : -1, undo.from, undo.to, true);
  			} else if (action == "smartTyping") {
  				from = undo.from;
  				to = undo.to;
  				line = this.getContent(from, to);
  				var remove = undo.open.length + undo.close.length;
  				var word = undo.textSelected.length + remove;
  				value = line.textContent.splice(
  					line.selectionStart - (undo.textSelected ? word : undo.open.length),
  					undo.textSelected ? word : remove,
  					undo.textSelected
  					);
  				this.replaceLines(from.line, to.line, value);
  				this.updateView(undo.undo.from, undo.undo.to);	
  			} else if (action == "todo") {
  				this.toggleToDo(undo.from, undo.to, true);
  			} else if (undo.textSelected) {
  				from = undo.from;
  				to = undo.to;
  				line = this.getContent(from, to);
  				value = line.textContent.splice(line.selectionStart, undo.add.length , undo.del);
  				this.replaceLines(from.line, to.line, value);
  				this.updateView(from, undo.textSelected);
  			} else if (undo.add === "") {
  				from = undo.from;
  				to = undo.to;
  				line = this.getContent(from, from);
  				value = line.textContent.splice(line.selectionStart, "" , undo.del);
  				this.replaceLines(from.line, from.line, value);
  				this.updateView(to, to);
  			} else {
  				from = undo.from;
  				to = undo.to;
  				line = this.getContent(from, to);
  				value = line.textContent.splice(line.selectionStart, undo.add.length , "");
  				this.replaceLines(from.line, to.line, value);
  				this.updateView(from, from);
  			}
  		}
  	},
  	redo: function () {
  		var redo = this.getRedo(), from, to, line, value;
  		if (redo) {
  			var action = redo.action || "";
  			if (action == "indent") {
  				this.indent(redo.dir, redo.from, redo.to, true);
  			} else if (action == "smartTyping") {
  				this.smartTyping(redo.undo.from, redo.undo.to, redo.open, redo.close, redo.select, true);
  			} else if (action == "todo") {
  				this.toggleToDo(redo.from, redo.to, true);
  			} else if (redo.textSelected) {
  				from = redo.from;
  				to = redo.to;
  				line = this.getContent(from, redo.textSelected);
  				value = line.textContent.splice(line.selectionStart, redo.del.length , redo.add);
  				this.replaceLines(from.line, redo.textSelected.line, value);
  				this.updateView(to, to);
  			} else if (redo.add === "") {
  				// texto borrado
  				from = redo.from;
  				to = redo.to;
  				line = this.getContent(from, to);
  				value = line.textContent.splice(line.selectionStart, redo.del.length , "");
  				this.replaceLines(from.line, to.line, value);
  				this.updateView(from, from);
  			} else {
  				// texto añadido
  				from = redo.from;
  				to = redo.to;
  				line = this.getContent(from, from);
  				value = line.textContent.splice(line.selectionStart, "" , redo.add);
  				this.replaceLines(from.line, from.line, value);
  				this.updateView(to, to);
  			}
  		}
  	},
  
  	selectAll: function () {
  		
  		var size = this.getSize(),
  			line = this.getLine(size),
  			from = this.getPositionFromChar(1, 0),
  			to = this.getPositionFromChar(size, line.textContent.length);
  
  		this.updateView(from, to);
  
  	},
  
  	toggleToDo: function (from, to, noHistory) {
  
  		from = from || this.selectionStart();
  		to = to || this.selectionEnd();
  		var line = this.getLine(from.line), i = to.line - from.line + 1, lines = [], text, ch, value, replace;
  		while (i--) {
  			text = line.textContent;
  			ch = text[0];
  			value = text.slice(1);
  			if (ch == "+" || ch == "-") {
  				replace = true;
  				lines.push((ch == "+" ? "-" : "+") + value);
  			} else {
  				lines.push(text);
  			}
  			line = line.nextSibling;
  		}
  		if (replace) {
  			if(!noHistory) {
  				this.addHistory({
  					action: "todo",
  					from: from,
  					to: to
  				});
  			}
  			this.replaceLines(from.line, to.line, lines);
  			this.updateInput();
  		}
  
  	},
  
  	toggleFocusMode: function () {
  		var element = this.element, wrapper = this.element.wrapper, view = this.element.view, line_height = this.line_height;
  		if (this.focusmode) {
  			this.focusmode = null;
  			this.onMouseWheel();
  			var offsetTop = parseInt(wrapper.style.paddingTop) - line_height;
  			wrapper.style.padding = line_height + "px 0";
  			view.scrollTop = this.selectionStart().y - offsetTop;
  
  		} else {
  			this.focusmode = true;
  			this.editor.classList.add("focusmode");
  			var lines = Math.floor(view.getBoundingClientRect().height / 2 / line_height) * line_height;
  			wrapper.style.padding = lines + "px 0";
  			var from = this.selectionStart();
  			view.scrollTop = from.y;
  			var onMouseWheel = this.onMouseWheel.bind(this);
  			var mouseWheel = Event.on(view, "mousewheel", function (e) {
  				onMouseWheel();
  				mouseWheel();
  			}, true);
  
  			this.getLine(from.line).classList.add("active");
  		}
  	},
  
  	save: function () {
  		var save = this.options.localStorage;
  		localStorage[save] = this.getText(1, this.getSize());
  	}
  
  });
  /*
  
  Cursor.js
  
  */
  Extend(Editor.prototype, {
  	blinkCursor: function () {
  		var cursor = this.element.cursor.style;
  		cursor.webkitAnimationName = "none";
  		setTimeout(function () {
  			cursor.webkitAnimationName = "";
  		}, 10);
  	},
  
  	hideCursor: function () {
  		this.element.cursor.style.display = "none";
  	},
  	updateCursor: function (from, to) {
  		this.setCursor(to.x, to.y);
  		this.element.cursor.scrollIntoViewIfNeeded();
  		if(Range.equal(from, to)) {
  			this.blinkCursor();
  		} else {
  			this.hideCursor();
  		}
  	},
  	setCursor: function (x, y) {
  		var style = this.element.cursor.style, input = this.element.input;
  		style.top = y + "px";
  		style.left = (x-2) + "px";
  		style.display = "";
  		input.style.top = y + "px";
  		input.style.left = (x+1) + "px";
  	}
  });
  /*
  
  Input.js
  
  */
  Extend(Editor.prototype, {
  
  	focusInput: function () {
  		this.element.input.focus();
  	},
  	blurInput: function () {
  		this.element.input.blur();
  	},
  	updateInput: function () {
  		var from = this.selectionStart(), to = this.selectionEnd(), line;
  		this.inputValue = line = this.getContent(from, to);
  		this.element.input.value = line.textContent;
  		this.setInputSelection(line.selectionStart, line.selectionEnd);
  	},
  	setInputSelection: function (start, end) {
  		var element = this.element.input;
  		element.selectionStart = start;
  		element.selectionEnd = end;
  		this.textSelected = this.inputValue.chunk[1];
  	},
  	setInputValue: function (value) {
  		this.element.cursor.value = value;
  	},
  	getInputValue: function (chunk) {
  		var element = this.element.input, value = element.value;
  		if (chunk) {
  			return [ value.slice(0, element.selectionStart), this.textSelected, value.slice(element.selectionEnd)];
  		}
  		return value;
  	},
  	getInputValueCached: function (value) {
  		return this.inputValue;
  	},
  	setShift: function (value) {
  		if (value) {
  			this.shiftSelecting = this.shiftSelecting || this.selectionStart();
  		} else {
  			this.shiftSelecting = null;
  		}
  	},
  	hasInputSelection: function () {
  		try {
  			var element = this.element.input;
  			return element.selectionStart != element.selectionEnd;
  		} catch(e) {
  			return false;
  		}
  	}
  
  });
  /*
  
  Selection.js
  
  */
  Extend(Editor.prototype, {
  
  	selectionStart: function () {
  		return this.inverted ? this.to : this.from;
  	},
  
  	selectionEnd: function () {
  		return this.inverted ? this.from : this.to;
  	},
  
  	updateSelection: function (from, to, highlight) {
  		this.from = from;
  		this.to = to;
  		this.inverted = false;
  		if (Range.equal(from, to)) {
  			this.inverted = false;
  		} else if (from.y > to.y || (from.y === to.y && from.x > to.x)) {
  			this.inverted = true;
  		}
  		if (highlight !== false) {
  			if (this.inverted) {
  				from = this.to;
  				to = this.from;
  			}
  			this.setSelection(from, to);
  		}
      },
  
  	setSelection: function (from, to) {
  
  		var element = this.element, top = element.selectionTop.style, middle = element.selectionMiddle.style, bottom = element.selectionBottom.style,
  		line_height = this.line_height;
  		top.width = middle.width = bottom.width = 0;
  
  		if (!Range.equal(from, to)) {
  			if (from.y == to.y) {
  				top.top = from.y + "px";
  				top.left = from.x + "px";
  				top.width = Math.abs(to.x - from.x) + "px";
  				top.height = line_height + "px";
  			} else {
  				top.top = from.y + "px";
  				top.left = from.x + "px";
  				top.width = (this.width - from.x) + this.padding_width + "px";
  				top.height = line_height + "px";
  		 		// vemos cuantas lineas hay que seleccionar: 1 o más
  				var lines = (to.y - from.y)/line_height;
  				if (lines > 1) {
  					middle.top = (from.y + line_height) + "px";
  					middle.left = 0;
  					middle.width = this.width + this.padding_width + "px";
  					middle.height = (to.y - from.y - line_height) + "px";	
  				} else {
  					middle.width = 0;
  				}
  				bottom.top = to.y + "px";
  				bottom.left = 0;
  				bottom.width = to.x + "px";
  				bottom.height = line_height + "px";
  			}
  			this.hideCursor();
  		}
  	}
  
  });
  /*
  
  Parser.js
  
  */
  Editor.prototype.parserLines = function (lines) {
  	if (typeof lines == "string") lines = lines.split(/\r?\n/);
  	lines = lines.slice();
  	var fragment = document.createDocumentFragment(), line, value;
  	while (lines.length) {
  		value = lines.shift();
  		line = Parser.line(value, this.tag_container, this.tab_width, this.em_width);
  		fragment.appendChild(line);
  	}
  	return fragment;
  };
  
  var Parser = {
  
  	/* Block */
  	tab: /^(\t+)(.*)/,
  	header: /^(#{1,}\s)(.*)/,
  	blockquote: /^((>\s)+)(.*)/,
  	list: /^([*+-]\s|\d+\.\s)(.*)/,
  
  	/* Inline */
  	strong: /^(__)(?=\S)([^\0]*?\S)(__)(?!_)|^(\*\*)(?=\S)([^\0]*?\S)(\*\*)(?!\*)/,
  	em: /^(_)(?=\S)([^\0]*?\S)(_)(?!_)|^(\*)(?=\S)([^\0]*?\S)(\*)(?!\*)/,
  	del: /^(-)(?=\S)([^\0]*?\S)(-)(?!-)/,
  	text: /^[^\0]+?(?=[_*-]|$)/,
  
  	pre: document.createElement("pre"),
  
  	escape: function (str) {
  		Parser.pre.textContent = str;
  		return Parser.pre.innerHTML;
  	},
  
  	line: function (text, tag, tab_width, em_width) {
  		
  		var match, line, value, width;
  
  		line = document.createElement(tag);
  
  		match = Parser.tab.exec(text);
  		if (match) {
  			line.classList.add("code");
  			width = match[1].length * tab_width;
  			line.style.marginLeft = width+"px";
  			value = "<span class=\"tab\" style=\"margin-left:-"+width+"px;\">" + match[1] + "</span>" + Parser.inline(match[2]);
  		}
  
  		match = Parser.header.exec(text);
  		if (match) {
  			line.classList.add("header");
  			width = match[1].length * em_width;
  			value = "<span style=\"margin-left:-"+width+"px;\">" + match[1] + "</span>" + "<strong>" + Parser.inline(match[2]) + "</srong>";
  		}
  
  		match = Parser.blockquote.exec(text);
  		if (match) {
  			line.classList.add("blockquote");
  			width = match[1].length * em_width;
  			line.style.marginLeft = width+"px";
  			value = "<span style=\"margin-left:-"+width+"px;\">" + match[1] + "</span>" + Parser.inline(match[3]);
  		}
  
  		match = Parser.list.exec(text);
  		if (match) {
  			line.classList.add("list");
  			width = match[1].length * em_width;
  			var todo = match[1] == "+ " || match[1] == "- " ? "<span class=\"todo\">" + match[1][0] + "</span> " : match[1];
  			// si es "+" se marca como completado
  			if (match[1] == "+ ") {
  				value = "<span style=\"margin-left:-"+width+"px;\">" + todo + "</span><del>" + Parser.inline(match[2]) + "</del>";
  			} else {
  				value = "<span style=\"margin-left:-"+width+"px;\">" + todo + "</span>" + Parser.inline(match[2]);
  			}
  		}
  
  		if (!line.classList.length) {
  			line.classList.add("paragraph");
  			value = Parser.inline(text);
  		}
  		line.innerHTML = value;
  
  		return line;
  
  	},
  
  	inline: function (text) {
  
  		var match, line = [], value, tag;
  
  		while (text) {
  
  			match = Parser.strong.exec(text);
  			if (match) {
  				tag = match[1] || match[4];
  				value = tag + "<strong>" + Parser.escape(match[2] || match[5]) + "</strong>" + tag;
  				line.push(value);
  				text = text.slice(match[0].length);
  				continue;
  			}
  
  			match = Parser.em.exec(text);
  			if (match) {
  				tag = match[1] || match[4];
  				value = tag + "<em>" + Parser.escape(match[2] || match[5]) + "</em>" + tag;
  				line.push(value);
  				text = text.slice(match[0].length);
  				continue;
  			}
  
  			Parser.del.exec(text);
  			if (match) {
  				value = "-<del>" + Parser.escape(match[2]) + "</del>-";
  				line.push(value);
  				text = text.slice(match[0].length);
  				continue;
  			}
  
  			match = Parser.text.exec(text);
  			if (match) {
  				line.push(Parser.escape(match[0]));
  				text = text.slice(match[0].length);
  				continue;
  			}
  
  		}
  
  		return line.join("");
  
  	},
  
  	newline: function (text) {
  		
  		var match, value = "", newvalue = "";
  
  		/* Parseamos el texto */
  		match = Parser.tab.exec(text);
  		if (match) {
  			value = newvalue = match[1];
  		}
  
  		match = Parser.list.exec(text);
  		if (match) {
  			value = newvalue = match[1];
  
  			var numeric = value.split(".");
  			
  			if (numeric.length > 1) {
  				numeric[0]++;
  				newvalue = numeric.join(".");
  			}
  
  		}
  
  		return [value, newvalue];
  
  	}
  
  };
  /*
  
  Undomanager.js
  
  */
  Extend(Editor.prototype, {
  
  	addHistory: function (action) {
  		this.undomanager.add(action);
  	},
  
  	getUndo: function () {
  		return this.undomanager.undo();
  	},
  
  	getRedo: function () {
  		return this.undomanager.redo();
  	}
  
  });
  
  var UndoManager = function () {
  	this.undoStack = [];
  	this.redoStack = [];
  };
  
  UndoManager.prototype = {
  
  	add: function (action) {
  		
  		var lastAction = this.undoStack.pop() || null;
  
  		if(lastAction) {
  			var push = 
  					lastAction.action || action.action ||
  					lastAction.textSelected || action.textSelected ||
  					(action.del && lastAction.add) ||
  					(action.add && !lastAction.add) ||
  					(action.add && !Range.equal(lastAction.to, action.from)) ||
  					(action.del && !Range.equal(lastAction.from, action.to));
  			
  			if (push) {
  			  	this.undoStack.push(lastAction);
  			  	this.undoStack.push(action);
  			} else if(lastAction) {
  				var combined = this.chain(lastAction, action);
  				this.undoStack.push(combined);
  			}
  		} else {
  			this.undoStack.push(action);
  		}
  		
  		this.redoStack = [];
  	},
  
  	undo: function () {
  		var action = this.undoStack.pop() || null;
  		if (action) {
  			this.redoStack.push(action);
  		}
  		return action;
  	},
  
  	redo: function () {
  		var action = this.redoStack.pop() || null;
  		if (action) {
  			this.undoStack.push(action);
  		}
  		return action;
  	},
  
  	chain: function (action1, action2) {
  		var action = {
  			add: action1.add + action2.add,
  			del: action2.del + action1.del,
  			textPasted: null
  		};
  		action.from = action.add ? action1.from : action2.from;
  		action.to = action.add ? action2.to : action1.to;
  		return action;
  	}
  
  };

  // Setup webwriter as an amd module, if define is available
  if (typeof define !== "undefined" && typeof define === "function" && define.amd) {
    define( "webwriter", [], function () { return Editor; } );
  } else {
    window.Editor = Editor;
  }

})();