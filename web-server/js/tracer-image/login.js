function Login(grid_ref) {
  var self = this;
  this.session_cache = {};
  this.grid_ref = grid_ref;
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
