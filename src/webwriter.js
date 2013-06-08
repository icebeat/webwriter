;(function(){

  //= lib.js
  //= editor.js
  //= layout.js
  //= events.js
  //= commands.js
  //= cursor.js
  //= input.js
  //= selection.js
  //= parser.js
  //= undomanager.js

  // Setup webwriter as an amd module, if define is available
  if (typeof define !== "undefined" && typeof define === "function" && define.amd) {
    define( "webwriter", [], function () { return Editor; } );
  } else {
    window.Editor = Editor;
  }

})();