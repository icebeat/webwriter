Extend(Editor.prototype, {
	save: function () {
    if(this._openFile) {
      this.saveCur();
    } else {
      this.saveAs();
    }
	},

  saveCur: function() {
    var text = this.getText(1, this.getSize());

    var entry = this._openFile;
    var blob = new Blob([text], {type: 'text/plain'});
    entry.createWriter(function(writer) {
      writer.onwriteend = function() {
        writer.onwriteend = null;
        writer.write(blob);
      };
      writer.seek(writer.length);
      writer.truncate(0);
    });
  },

  saveAs: function() {
    var params = {
      type: 'saveFile'
    };

    var fun = function(entry) {
      this._openFile = entry;
      this.saveCur();
    }.bind(this);
    chrome.fileSystem.chooseEntry(params, fun);
  },

  open: function() {
    var params = {
      type: 'openWritableFile'
    };
    var fun = this.handleOpen.bind(this);
    chrome.fileSystem.chooseEntry(params, fun);
  },

  handleOpen: function(entry) {
    var self = this;

    this._openFile = entry;
    entry.file(function(file){
      var reader = new FileReader();
      reader.onloadend = function(e) {
        var text = reader.result;
        self.clearLines();
        self.addLines(text);
      };
      reader.readAsText(file);
    });
  }
});
