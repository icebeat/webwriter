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