function Login(grid_ref, server_root) {
  var self = this;
  this.session_cache = {};
  this.server_root = server_root;
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
      $('.ui-dialog-buttonset').find('button:contains(Login)').trigger('click');
    }
  });
};

Login.prototype.sid_for_file = function(file) {
  return this.session_cache[this.hostname_for_file(file)];
};

Login.prototype.hostname_for_file = function(file) {
  this.image_uri.href = file.substr(0, 5) == "file:" ? file.substr(5) : file;
  return this.image_uri.hostname;
};

Login.prototype.pathname_for_file = function(file) {
  this.image_uri.href = file.substr(0, 5) == "file:" ? file.substr(5) : file;
  return this.image_uri.pathname;
};

Login.prototype.logged_into_host_for_file = function(file) {
  console.debug("testing for login for host: " + this.hostname_for_file(file));
  console.debug("testing 2");
  console.debug(this.session_cache);
  if(this.hostname_for_file(file) in this.session_cache) {
    console.debug("a already logged in");
    return true;
  } else {
    console.debug('not logged in');
    return false;
  }
  console.debug("testing 3");
};

Login.prototype.show_prompt = function(images, callback, this_arg) {
  var self = this;

  if(images.length == 0)
    return;
  var image = images[0];

  var parser = document.createElement("a");
  parser.href = image.uri.substr(0,5) == "file:" ? image.uri.substr(5) : image.uri;

  $("#remote-hostname").text("Login to retrieve " + parser.pathname + " from " + parser.hostname);
  $("#remote-error").text(image.last_error).css("display", image.last_error ? "block" : "none");

  self.image_login.dialog(
  {
    buttons:
    {
      "Login": function()
      {
        $.ajax(
        {
          async : true,
          type : "POST",
          url : self.server_root + "remote",
          contentType : "application/json",
          data : $.toJSON({"hostname":parser.hostname, "username":$("#remote-username").val(), "password":$("#remote-password").val()}),
          processData : false,
          success : function(result)
          {
            login.session_cache[parser.hostname] = result.sid;
            self.image_login.dialog("close");
            callback.call(this_arg, images);
          },
          error : function(request, status, reason_phrase)
          {
            image.last_error = "Error opening remote session: " + reason_phrase;
            self.image_login.dialog("close");
            self.show_prompt(images, callback, this_arg);
          }
        });
      },
      Cancel: function()
      {
        $(this).dialog("close");
      }
    },
  });
  self.image_login.dialog("open");
};
