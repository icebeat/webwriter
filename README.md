# WebWriter

> [iA Writer for Mac](http://www.iawriter.com/mac) ported to Javascript for WebKit.

## Philosophy behind this project

WebWriter was an experiment to port [iA Writer for Mac](http://www.iawriter.com/mac) without any Javascript Framework.

## Goals (2 years ago)

* Avoid Javascript Frameworks such jQuery or Mootools (Make everything from scratch).
* Avoid ContentEditable (Emulate every key event with a hidden textarea).
* Avoid native cursor (The key of the project [document.caretRangeFromPoint](https://developer.mozilla.org/en-US/docs/Web/API/document.caretPositionFromPoint))
* Avoid Javascript animations and use CSS3 animations (Check the cursor animation).
* Avoid render the full content with Markdown (Only parsing the affected lines).

## Why Webkit?

I had other goals for this project and make everything crossbrowser was not included (you know why). Now, should be a must.

## What is next

* ~~Use [Gulp](http://gulpjs.com/) instead of [Grunt](http://gruntjs.com/).~~
* ~~New repo structure with examples.~~
* New lib structure.
* New class constructor with more options (container support).
* Responsive support (not more fix width).
* Fonts support.
* Add an Event emitter for commands.
* Plugin system for events, commands and parsers.
* More commands (Drag & Drop support).
* Plugins (Markdown preview, doc stats, spellchecker, Dropbox + GDrive support).
* Documentation.
* Gecko support, finally.

## Related projects

* [CodeMirror](http://codemirror.net) - A versatile text editor implemented in JavaScript for the browser.
* [Dabblet](http://dabblet.com) - An interactive playground for quickly testing snippets of CSS and HTML code.
* [Marked](https://github.com/chjj/marked) - A markdown parser and compiler. Built for speed.
