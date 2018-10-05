/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import ko from "knockout";
import mapping from "knockout-mapping";
import URI from "urijs";
import slycatJobChecker from "templates/slycat-job-checker.html";

ko.components.register('slycat-job-checker', {
  viewModel: function(params) {
    var model = { _id: URI(window.location).segment(-1) };
    var vm = this;
    vm.remote = mapping.fromJS({ hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null, session_exists: false });
    vm.remote.focus.extend({ notify: 'always'  });
    vm.jid = params.jid;
    vm.output = ko.observable('Output for the current job will be posted here...');
    var iid = -1; // window.setInterval() ID
    var previous_state = '';

    vm.connect = function() {
      vm.remote.enable(false);
      vm.remote.status_type('info');
      vm.remote.status('Connecting...');
      if(vm.remote.session_exists())
      {
        vm.remote.enable(true);
        vm.remote.status_type(null);
        vm.remote.status(null);
        $('#slycat-job-checker-connect-modal').modal('hide');
        $('#slycat-job-checker-cancel').removeAttr('disabled');
        vm.checkjob();
      }
      else{
          client.post_remotes({
            hostname: vm.remote.hostname(),
            username: vm.remote.username(),
            password: vm.remote.password(),
            success: function(sid) {
              vm.remote.session_exists(true);
              vm.remote.sid(sid);
              vm.remote.enable(true);
              vm.remote.status_type(null);
              vm.remote.status(null);
              $('#slycat-job-checker-connect-modal').modal('hide');
              $('#slycat-job-checker-cancel').removeAttr('disabled');
              vm.checkjob();
            },
            error: function(request, status, reason_phrase) {
              $('#slycat-job-checker-cancel').attr('disabled');
              vm.remote.enable(true);
              vm.remote.status_type('danger');
              vm.remote.status(reason_phrase);
              vm.remote.focus('password');
            }
          });
      }
    };

    vm.cancel = function() {
      vm.remote.password('');
      $('#slycat-job-checker-connect-modal').modal('hide');
      vm.output(vm.output() + '\n' + 'Please reload the page to check job ' + vm.jid() + '\'s status.');
    };

    vm.cancel_pull = function() {
      vm.remote.password('');
      console.log("cancel");
      $('#slycat-pull-job-connect-modal').modal('hide');
      vm.output(vm.output() + '\n' + 'Please reload the page to check job ' + vm.jid() + '\'s status.');
    };
    var get_job_output = function() {
      vm.output(vm.output() + '\n\n' + 'Please reload to view model.');
      window.location.reload(true);
    };

    var repeated_state = function(state) {
      return previous_state === state ? true : false;
    };

    var routine = function(jid) {
  client.get_checkjob({
        hostname: vm.remote.hostname(),
        jid: vm.jid(),
        success: function(results) {
          if (results.errors) {
            vm.output(vm.output() + '\n' + '[Error] Could not check job iD=' + vm.jid() + ' status: ' + results.errors);
            return void 0;
          }

          var s = results.status.state;

          if (!repeated_state(s))
            vm.output(vm.output() + '\n' + 'Job ID=' + vm.jid() + ' is ' + s);
          else
            vm.output(vm.output() + '.');

          if (s === 'COMPLETED' || s === 'FAILED') {
            clearInterval(iid);
            get_job_output();
            previous_state = '';
          }

          if (s === 'CANCELLED' || s === 'REMOVED') {
            clearInterval(iid);
            previous_state = '';
          }

          previous_state = s;
        },
        error: function(request, status, reason_phrase) {
          vm.output(vm.output() + '\n' + '[Error] Could not check job status: ' + status + ' :' + reason_phrase);
        }
      });
    };

    vm.pullDataFromHpc = function() {
      console.log("1");
      vm.remote.enable(false);
      vm.remote.status_type('info');
      vm.remote.status('Connecting...');
      if(vm.remote.session_exists())
      {
        console.log("got session");
        vm.remote.enable(true);
        vm.remote.status_type(null);
        vm.remote.status(null);
        $('#slycat-pull-job-connect-modal').modal('hide');
        vm.pullHPCData();
      }
      else{
          client.post_remotes({
            hostname: vm.remote.hostname(),
            username: vm.remote.username(),
            password: vm.remote.password(),
            success: function(sid) {
              vm.remote.session_exists(true);
              vm.remote.sid(sid);
              vm.remote.enable(true);
              vm.remote.status_type(null);
              vm.remote.status(null);
              $('#slycat-pull-job-connect-modal').modal('hide');
              vm.checkjob();
            },
            error: function(request, status, reason_phrase) {
              $('#slycat-job-checker-cancel').attr('disabled');
              vm.remote.enable(true);
              vm.remote.status_type('danger');
              vm.remote.status(reason_phrase);
              vm.remote.focus('password');
            }
          });
      }
    };
    vm.pullHPCData = function() {
      console.log("2");
  client.get_model_command({
        mid: model._id,
        type: "timeseries",
        command: "pull_data",
        success: function(results) {
          vm.output(vm.output() + '\n' + 'started pull status :' + results.errors);
        },
        error: function(request, status, reason_phrase) {
          vm.output(vm.output() + '\n' + 'pull status: ' + status + ' :' + reason_phrase);
        }
      });
    };

    vm.checkjob = function() {
      previous_state = '';
      iid = setInterval(routine, 1000);
    };

    vm.set_jid = function(jid) {
      vm.jid(jid);
    };

    $('#slycat-job-checker-connect').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      $('#slycat-job-checker-connect-modal').modal();
    });

    $('#slycat-job-pull').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      $('#slycat-pull-job-connect-modal').modal();
    });

  $('#slycat-job-checker-clear').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      vm.output('');
    });

    $('#slycat-job-checker-cancel').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      client.delete_job({
        hostname: vm.remote.hostname(),
        jid: vm.jid()
      });
    });
  },
  template: slycatJobChecker
})