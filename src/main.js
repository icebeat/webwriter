(function() {
var text = ["# SHORTCUTS", "", "FocusMode: Cmd + D", "SmartTyping: Type \"<\", \"\"\", \"[\", \"{\" & \"(\"", "Open: Cmd + O", "Save: Cmd + S", "Indent: Tab or Shift + Tab", "", "## Emphasis and Strong", "", "Emphasis: *example* = _example_ (or Cmd + I)", "Strong: **example** = __example__ (or Cmd + B)", "Delete: -example- (or Cmd + U)", "", "**Expand** to word: Shift + Cmd + Key", "", "## Numbered lists: type \"1.\" + space", "", "1. Ordered list item", "2. Ordered list item", "3. Ordered list item (enter to create a new item)", "", "## Bulleted lists: type \"*\" + space", "", "* Bulleted list item", "* Bulleted list item", "* Bulleted list item", "", "## ToDo lists: type \"-\" or \"+\" + space", "", "- Task (Mark as done, click on \"-\")", "+ Task Done", "", "## Indentation", "", "	This is an example of a indented paragraph.", "", "## Blockquotes", "", "> This is an example of a quoted paragraph. It stays indented over multiple lines until you hit enter.", "","@icebeat"];
if(!mac) {
  text = text.map(function(l) {
    return l.replace('Cmd +', 'Ctrl +');
  });
}

var Document = new Editor(text);
Document.goDocStart();
Document.focusInput();
})();
