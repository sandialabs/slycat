import server_root from '../../js/slycat-server-root';
import URI from "urijs";
import client from '../../js/slycat-web-client-webpack';

var test_script_json = {
      "scripts": [
          {
              "name": "test",
              "parameters": [
                  {
                      "name": "--number",
                      "value": 2
                  }
              ]
          }
      ],
      "hpc": {
          "is_hpc_job": false,
          "parameters": {
              wckey : "test1",
              nnodes : "1",
              partition : "mypartition",
              ntasks_per_node : "1",
              time_hours : "01",
              time_minutes : "30",
              time_seconds : "30",
              working_dir : "slycat"
          }
      }
};

var computer_time_series_script_json = {
      "scripts": [
          {
              "name": "compute_timeseries",
              "parameters": [
                  {
                      "name": "--directory",
                      "value": "/home/slycat/src/slycat/web-client/500-times-series"
                  },
                  {
                      "name": "--cluster-sample-count",
                      "value": 50
                  },
                  {
                      "name": "--cluster-sample-type",
                      "value": "uniform-paa"
                  },
                  {
                      "name": "--cluster-type",
                      "value": "average"
                  },
                  {
                      "name": "--cluster-metric",
                      "value": "euclidean"
                  },
                  {
                      "name": "--workdir",
                      "value": "/home/slycat/workdir"
                  },
                  {
                      "name": "--hash",
                      "value": "1a2b3c4d5e6f"
                  },
              ]
          }
      ],
      "hpc": {
          "is_hpc_job": false,
          "parameters": {
              wckey : "test1",
              nnodes : "1",
              partition : "mypartition",
              ntasks_per_node : "1",
              time_hours : "01",
              time_minutes : "30",
              time_seconds : "30",
              working_dir : "slycat"
          }
      }
  };
var timeseries_to_hdf5_script_json = {
      "scripts": [
          {
              "name": "timeseries_to_hdf5",
              "parameters": [
                  {
                      "name": "--output-directory",
                      "value": "/home/slycat/output"
                  },
                  {
                      "name": "--inputs-file",
                      "value": "/home/slycat/input"
                  },
                  {
                      "name": "--inputs-file-delimiter",
                      "value": ","
                  },
                  {
                      "name": "--force",
                      "value": ""
                  }
              ]
          }
      ],
      "hpc": {
          "is_hpc_job": false,
          "parameters": {
              wckey : "test1",
              nnodes : "1",
              partition : "mypartition",
              ntasks_per_node : "1",
              time_hours : "01",
              time_minutes : "30",
              time_seconds : "30",
              working_dir : "slycat"
          }
      }
  };
function prettyPrint() {
  try {
    var ugly = $('#command').val();
    var obj = JSON.parse(ugly);
    document.getElementById('command').value = JSON.stringify(obj, undefined, 4);

    var ugly = $('#response').val();
    var obj = JSON.parse(ugly);
    document.getElementById('response').value = JSON.stringify(obj, undefined, 4);
  } catch (e)
  {
    // no opp.
  }
}

function run_remote_command()
{
  var payload = {"command": JSON.parse($('#command').val())};
  $.ajax(
  {
    contentType: "application/json",
    type: "POST",
    url: URI(server_root + "remotes/"+$('#hostname').val()+"/post-remote-command"),
    success: function(result)
    {
      document.getElementById('response').value = JSON.stringify(result)
    },
    error: function(request, status, reason_phrase)
    {
        console.log( "status:" + request.status);
        if(request.status === 400){
            document.getElementById('response').value = "status: " + request.status + "\n\nmessage: " + request.getResponseHeader('X-Slycat-Message');
        }else {
            document.getElementById('response').value = "error response from server:\n" + "error request:"
                + JSON.stringify(request, undefined, 4) + "\n\n status: " + request.status + "\n\n reason: " + reason_phrase;
        }
    },
    data: JSON.stringify(payload)
  });

}

function post_session()
{
  client.post_remotes({
    hostname: $('#hostname').val(),
    username: $('#username').val(),
    password: $('#password').val(),
    success: function(response) {
        document.getElementById('response').value = "host session made sid:" + JSON.stringify(response, undefined, 2);
    },
    error: function(request, status, reason_phrase) {
        window.alert("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
        console.log("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
    }
  });
}

function get_session() {
  client.get_session_status(
    {
      hostname: $('#hostname').val(),
      success: function (message) {
          document.getElementById('response').value = "host session found";
      },
      error: function (request, status, reason_phrase) {
          document.getElementById('response').value = "no session found";
          post_session();
      }
    }
  );
}
function set_command(name){
    if(name === "test"){
        document.getElementById('command').value = JSON.stringify(test_script_json);
    }
    else if(name === "computer_time_series"){
        document.getElementById('command').value = JSON.stringify(computer_time_series_script_json);
    }
    else if(name === "timeseries_to_hdf5"){
        document.getElementById('command').value = JSON.stringify(timeseries_to_hdf5_script_json);
    }
    else {
        document.getElementById('command').value = "command does not match command in list of commands"
    }
}
document.getElementById("prettyPrint").addEventListener("click", prettyPrint, false);
document.getElementById("go").addEventListener("click", run_remote_command, false);
document.getElementById("getSession").addEventListener("click", get_session, false);
document.getElementById("test").addEventListener("click", function(){set_command("test")}, false);
document.getElementById("computeTimeSeries").addEventListener("click", function(){set_command("computer_time_series")}, false);
document.getElementById("timeseriesToHdf5").addEventListener("click", function(){set_command("timeseries_to_hdf5")}, false);