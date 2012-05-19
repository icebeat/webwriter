/*

Undomanager.js

*/
Extend(Editor.prototype, {

	addHistory: function (action) {
		this.undomanager.add(action);
	},

	getUndo: function () {
		return this.undomanager.undo();
	},

	getRedo: function () {
		return this.undomanager.redo();
	}

});

var UndoManager = function () {
	this.undoStack = [];
	this.redoStack = [];
};

UndoManager.prototype = {

	add: function (action) {
		
		var lastAction = this.undoStack.pop() || null;

		if(lastAction) {
			var push = 
					lastAction.action || action.action
					|| lastAction.textSelected || action.textSelected
					|| (action.del && lastAction.add) 
					|| (action.add && !lastAction.add)
					|| (action.add && !Range.equal(lastAction.to, action.from))
					|| (action.del && !Range.equal(lastAction.from, action.to));
			
			if (push) {
			  	this.undoStack.push(lastAction);
			  	this.undoStack.push(action);
			} else if(lastAction) {
				var combined = this.chain(lastAction, action);
				this.undoStack.push(combined);
			}
		} else {
			this.undoStack.push(action);
		}
		
		this.redoStack = [];
	},

	undo: function () {
		var action = this.undoStack.pop() || null;
		if (action) {
			this.redoStack.push(action);
		}
		return action;
	},

	redo: function () {
		var action = this.redoStack.pop() || null;
		if (action) {
			this.undoStack.push(action);
		}
		return action;
	},

	chain: function (action1, action2) {
		var action = {
			add: action1.add + action2.add,
			del: action2.del + action1.del,
			textPasted: null
		};
		action.from = action.add ? action1.from : action2.from;
		action.to = action.add ? action2.to : action1.to;
		return action;
	}

};