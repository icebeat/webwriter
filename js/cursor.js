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