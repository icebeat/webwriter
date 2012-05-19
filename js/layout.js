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
			editor = doc.firstChild,
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
		this.padding_width = option.padding_length * this.em_width * 2;

		wrapper.style.width = this.width + this.padding_width + "px";
		wrapper.style.padding = this.line_height + "px 0";
		content.style.padding = "0 " + (this.padding_width/2) + "px";

	},

	setTab: function () {
		var measure = this.element.measure, tag = this.tag_container;
		measure.innerHTML = "<" + tag + "><span class=\"tab\">&Tab;</span></" + tag + ">";
		var content = measure.firstChild;
		this.tab_width = content.offsetWidth;
	}

});