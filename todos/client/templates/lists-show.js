Component.define(Template.listsShow, {
  created: function () {
    this.subscribe("todos", this.args.get("_id"));

    this.state.set("selectedItem", null);
    this.state.set("editingTitle", null);

    this.list = function () {
      return Lists.findOne(this.args.get("_id"));
    };

    this.editList = function() {
      this.state.set("editingTitle", true);
      
      // force the template to redraw based on the reactive change
      Tracker.flush();
      this.$('.js-edit-form input[type=text]').focus();
    };

    this.saveList = function() {
      this.state.set("editingTitle", false);
      
      Lists.update(this.args.get("_id"),
        {$set: {name: this.$('[name=name]').val()}});
    };

    this.deleteList = function() {
      var list = this.list();

      // ensure the last public list cannot be deleted.
      if (! list.userId && Lists.find({userId: {$exists: false}}).count() === 1) {
        return alert("Sorry, you cannot delete the final public list!");
      }
      
      var message = "Are you sure you want to delete the list " + list.name + "?";
      if (confirm(message)) {
        // we must remove each item individually from the client
        Todos.find({listId: list._id}).forEach(function(todo) {
          Todos.remove(todo._id);
        });
        Lists.remove(list._id);

        Router.go('home');
        return true;
      } else {
        return false;
      }
    };

    this.toggleListPrivacy = function() {
      if (! Meteor.user()) {
        return alert("Please sign in or create an account to make private lists.");
      }

      var list = this.list();

      if (list.userId) {
        Lists.update(list._id, {$unset: {userId: true}});
      } else {
        // ensure the last public list cannot be made private
        if (Lists.find({userId: {$exists: false}}).count() === 1) {
          return alert("Sorry, you cannot make the final public list private!");
        }

        Lists.update(list._id, {$set: {userId: Meteor.userId()}});
      }
    };
  },

  rendered: function () {
    var self = this;

    if (self.list()) {
      self.find('.js-title-nav')._uihooks = {
        insertElement: function(node, next) {
          $(node)
            .hide()
            .insertBefore(next)
            .fadeIn();
        },
        removeElement: function(node) {
          $(node).fadeOut(function() {
            this.remove();
          });
        }
      };
    }
  },

  helpers: {
    selectedItem: function() {
      return this.state.get("selectedItem");
    },

    todosReady: function() {
      return this.ready();
    },

    todos: function(listId) {
      return Todos.find({listId: listId}, {sort: {createdAt : -1}});
    },

    list: function () {
      return this.list();
    }
  },

  events: {
    'click .js-cancel': function() {
      this.state.set("editingTitle", false);
    },
    
    'keydown input[type=text]': function(event) {
      // ESC
      if (27 === event.which) {
        event.preventDefault();
        $(event.target).blur();
      }
    },
    
    'blur input[type=text]': function(event, template) {
      // if we are still editing (we haven't just clicked the cancel button)
      if (this.state.get("editingTitle")) {
        this.saveList(this, template);
      }
    },

    'submit .js-edit-form': function(event, template) {
      event.preventDefault();
      this.saveList(this, template);
    },
    
    // handle mousedown otherwise the blur handler above will swallow the click
    // on iOS, we still require the click event so handle both
    'mousedown .js-cancel, click .js-cancel': function(event) {
      event.preventDefault();
      this.state.set("editingTitle", false);
    },

    'change .list-edit': function(event) {
      if ($(event.target).val() === 'edit') {
        this.editList();
      } else if ($(event.target).val() === 'delete') {
        this.deleteList();
      } else {
        this.toggleListPrivacy();
      }

      event.target.selectedIndex = 0;
    },
    
    'click .js-edit-list': function() {
      this.editList();
    },
    
    'click .js-toggle-list-privacy': function() {
      this.toggleListPrivacy();
    },
    
    'click .js-delete-list': function() {
      this.deleteList();
    },
    
    'click .js-todo-add': function() {
      this.$('.js-todo-new input').focus();
    },

    'submit .js-todo-new': function(event) {
      event.preventDefault();

      var $input = $(event.target).find('[type=text]');
      
      if (! $input.val()) {
        return;
      }
      
      Todos.insert({
        listId: this.args.get("_id"),
        text: $input.val(),
        checked: false,
        createdAt: new Date()
      });

      Lists.update(this.args.get("_id"), {$inc: {incompleteCount: 1}});
      $input.val('');
    },

    'select todosItem': function (event) {
      this.state.set("selectedItem", event._id);
    },

    'deselect todosItem': function (event) {
      if (this.state.get("selectedItem") === event._id) {
        this.state.set("selectedItem", null);
      }
    }
  }
});
