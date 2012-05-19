/*

Cursor.js

*/
Extend(Editor.prototype, {
	blinkCursor: function (toggle) {
		clearInterval(this.blinker);
		if (toggle===false) return;
		var on = true, cursor = this.element.cursor.style;
		cursor.visibility = "";
		this.blinker = setInterval(function () {
			cursor.visibility = (on = !on) ? "" : "hidden";
		}, 650);
	},

	hideCursor: function () {
		this.element.cursor.style.display = "none";
		this.blinkCursor(false);
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