function Login(grid_ref) {
  var self = this;
  this.session_cache = {};
  this.grid_ref = grid_ref;
  this.image_uri = document.createElement("a");

  // Setup the login dialog ...
  self.image_login = $("<div title='Remote Login'><p id='remote-error'><p id='remote-hostname'><form><fieldset><label for='remote-username'>Username</label><input id='remote-username' type='text'/><label for='remote-password'>Password</label><input id='remote-password' type='password'/></fieldset></form></p></div>");

  self.image_login.appendTo(grid_ref);

  self.image_login.dialog(
  {
    autoOpen: false,
    width: 700,
    height: 300,
    modal: true,
    close: function() {
      $("#remote-password").val("");
    }
  });

  $("#remote-password").keypress(function(event){ 
    if (event.keyCode == 13) { 
      $('.ui-dialog-buttonset').find('button:first').trigger('click');
    }
  });
};

Login.prototype.sid_for_file = function(file) {
  this.session_cache[this.hostname_for_file(file)];
};

Login.prototype.hostname_for_file = function(file) {
  this.image_uri.href = file.substr(0, 5) == "file:" ? file.substr(5) : file;
  return this.image_uri.hostname;
};

Login.prototype.logged_into_host_for_file = function(file) {
  console.debug("testing for login for host: " + this.hostname_for_file(file));
  console.debug("testing 2");
  console.debug(this.session_cache);
  if(this.hostname_for_file(file) in this.session_cache) {
    console.debug("already logged in");
    return true;
  } else {
    console.debug('not logged in');
    return false;
  }
  console.debug("testing 3");
};

Login.prototype.show_prompt = function() {
  console.debug("show the prompt to login");
  $("#remote-login").dialog("open");
};
