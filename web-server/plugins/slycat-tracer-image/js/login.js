/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-tracer-model-login", ["slycat-server-root"], function(server_root) {
  function Login(grid_ref) {
    var self = this;
    this.session_cache = {};
    this.grid_ref = grid_ref;
    this.image_uri = document.createElement("a");


    // Setup the login dialog ...
    self.image_login =
      $("<div>").addClass("modal fade").attr({"role": "modal", "aria-hidden": "true"}).append(
        $("<div>").addClass("modal-dialog").width(800).append(
          $("<div>").addClass("modal-content").append(
            $("<div>").addClass("popover-title").append(
              $("<button>").addClass("close").attr({"data-dismiss": "modal"}).text("x"),
              $("<h4>").addClass("modal-title").text("Remote Login")
            ),
            $("<div>").addClass("modal-body").append(
              $("<span>").attr("id", "remote-error"),
              $("<span>").attr("id", "remote-hostname"),
              $("<form>").append(
                $("<fieldset>").append(
                  $("<label>").attr("for", "remote-username").text("Username"),
                  $("<input/>").attr({id: "remote-username", type: "text"}),
                  $("<label>").attr("for", "remote-password").text(" Password"),
                  $("<input/>").attr({id: "remote-password", type: "password"})
                )
              )
            ),
            $("<div>").addClass("modal-footer").append(
              $("<button>").addClass("btn btn-default").text("Cancel").attr({id: "cancel-login-button", type: "button", "data-dismiss": "modal"}),
              $("<button>").addClass("btn btn-primary").attr({id: "login-button", type: "button"}).text("Login")
            )
          )
        )
      )

    $("<div>").addClass("bootstrap-styles").append(self.image_login).appendTo(grid_ref);

    self.image_login.modal({backdrop: false, show: false});

    self.image_login.on('shown.bs.modal', function(){
      $($("#remote-username").text() ? "#remote-password" : "#remote-username").focus();
    });

    self.image_login.on('hidden.bs.modal', function(){
      self.shown = false;
      $("#remote-password").val("");
      self.image_login.find(".alert").remove();
      $("#login-button").off("click");
      $("#login-button").prop("disabled", false);
    });
  
    self.image_login.keypress(function(event){
      if (event.keyCode == 13 && !$("#login-button").prop("disabled")) {
        $("#login-button").trigger('click');
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
    console.debug(this.session_cache);
    if(this.hostname_for_file(file) in this.session_cache) {
      return true;
    } else {
      console.debug('not logged in');
      return false;
    }
  };

  Login.prototype.show_prompt = function(images, callback, this_arg) {
    var self = this;

    //Do nothing if called multiple times in a row:
    if(self.shown)
      return;
    self.shown = true;

    if(images.length == 0)
      return;
    var image = images[0];

    var parser = document.createElement("a");
    parser.href = image.uri.substr(0,5) == "file:" ? image.uri.substr(5) : image.uri;

    $("#remote-hostname").text("Login to retrieve " + parser.pathname + " from " + parser.hostname);
    $("#remote-error").text(image.last_error).css("display", image.last_error ? "block" : "none");

    var create_session = function(args){
      return $.ajax(
        {
          type: "POST",
          url: server_root + args.url,
          contentType : args.contentType,
          data : args.data({hostname: parser.hostname, username: $("#remote-username").val(), password: $("#remote-password").val()}),
          processData : false,
          success : function(result){
            self.session_cache[args.success] = result.sid;
            self.image_login.modal("hide");
            callback.call(this_arg, images);
          },
          error : args.error
        }
      );
    }
    
    $("#login-button").on('click', function() {
        var button = $(this);
        button.prop("disabled", true);
        create_session({
          url : "remotes",
          contentType : "application/json",
          data : JSON.stringify,
          success : parser.hostname,
          error : function(request, status, reason_phrase) {
            console.error("Error opening agent session: " + reason_phrase)
            self.image_login.find(".alert").remove();
            self.image_login.find(".modal-body").prepend($("<div>").addClass("alert alert-danger").text(reason_phrase));
            button.prop("disabled", false);
          }
        })
      });

    self.image_login.modal("show");
    console.debug("show modal")
  };

  Login.prototype.get_agent = function(image) {
    var parser = document.createElement("a");
    parser.href = image.substr(0,5) == "file:" ? image.substr(5) : image;

    return this.session_cache[parser.hostname];
  };

  return Login;
});
