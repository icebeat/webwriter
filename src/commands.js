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