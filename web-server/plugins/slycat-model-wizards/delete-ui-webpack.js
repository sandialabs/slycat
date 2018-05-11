/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "../../js/slycat-server-root";
import client from "../../js/slycat-web-client-webpack";
import deleteUI from "./delete-ui.html";

function constructor(params)
{
  var component = {};
  component.project = params.projects()[0];
  component.model = params.models()[0];

  component.delete_model = function()
  {
    client.delete_model(
    {
      mid: component.model._id(),
      success: function()
      {
        client.get_project_references({
          pid: component.project._id(),
          success: function(result)
          {
            var outgoing = 0;
            var incoming = 0;
            for(var i=0; result.length > i; i++)
            {
              var reference = result[i];
              if( (reference.mid == component.model._id()) && reference.bid )
              {
                outgoing++;
                client.delete_reference({
                  rid: reference._id,
                  success: function(){
                    delete_reference_success();
                  }
                });
              }
              function delete_reference_success(){
                incoming++;
              }
            }
            function redirect(){
              if (outgoing != incoming){
                setTimeout(redirect,100);
              } else {
                window.location.href = server_root + "projects/" + component.project._id();
              }
            }
            redirect();
          }
        });
      }
    });
  }
  return component;
}

export default {
  viewModel: constructor,
  template: deleteUI,
};