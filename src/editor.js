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