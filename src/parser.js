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