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
		if (highlight != false) {
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