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