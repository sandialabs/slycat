import * as dialog from "js/slycat-dialog";
import client from "js/slycat-web-client";

export const computeVSModel = (
    modelId:string,
    workDir:string,
    logHostName:string,
    linkColumn:number,
    callBack:(progress:number, info: string, error: boolean) =>void ) => {
    return client
      .get_model_command_fetch({
        mid: modelId,
        type: "VS",
        command: "extract-links",
        parameters: ['remote', workDir, logHostName, linkColumn],
      })
      .then(() => {
        callBack(75, "Movie links extracted.", false)
        console.log("Movie links extracted.");
        return read_csv_file(modelId, workDir, logHostName, callBack).then(()=>{
        });
      }).catch(error=>{
        callBack(25, "Movie links extracted.", false)
          dialog.ajax_error("Server error while uploading computed files from the hpc: " + error)("", "", "");
          console.log("error",error)
        });
  }
  
  // read in csv file
const read_csv_file = (
    modelId:string,
    workDir:string,
    logHostName:string,
    callBack:(progress:number, info: string, error: boolean) =>void) => {
    // upload csv file
    console.log("Uploading CSV file ...");
    // update progress bar
    callBack(80, "Uploading ...", false)
    // call web server to upload csv file
    return client.get_model_command_fetch({
      mid: modelId,
      type: "VS",
      command: "read_csv",
      parameters: [workDir, logHostName]})
    .then((result)=>
      {
        // check for errors
        if (result["error"] == false) {
          // update progress bar
          callBack(85, "Uploading ...", false)
          // read next file
          read_trajectories_file(modelId, workDir, logHostName, callBack);
        } else {
          dialog.ajax_error("Server error: " + result["error_message"])("", "", "");
        }
      }).catch(() => {
        dialog.ajax_error("Server error: could not upload CSV file.")("", "", "");
      });
  }
  
  // read trajectories file
const read_trajectories_file = (
    modelId:string,
    workDir:string,
    logHostName:string,
    callBack:(progress:number, info: string, error: boolean) =>void) => {
    // upload csv file
    console.log("Uploading .trajectories file ...");
  
    // call web server to upload csv file
    client.get_model_command_fetch({
      mid: modelId,
      type: "VS",
      command: "read_mat_file",
      parameters: [workDir, logHostName, "movies.trajectories"]}).then(
      (result:any) => {
        // check for errors
        if (result["error"] === false) {
          // update progress bar
          callBack(90, "Uploading ...", false);
          // read next file
          read_xcoords_file(modelId, workDir, logHostName, callBack);
        } else {
          dialog.ajax_error("Server error: " + result["error_message"])("", "", "");
        }
      }).catch(() => {
        dialog.ajax_error("Server error: could not upload .trajectories file.")("", "", "");
      })
  }
  
  // read xcoords file
  const read_xcoords_file = (
    modelId:string,
    workDir:string,
    logHostName:string,
    callBack:(progress:number, info: string, error: boolean) =>void) => {
    // upload csv file
    console.log("Uploading .xcoords file ...");
  
    // call web server to upload csv file
    return client.get_model_command_fetch({
      mid: modelId,
      type: "VS",
      command: "read_mat_file",
      parameters: [workDir, logHostName, "movies.xcoords"]})
      .then((result:any) => {
        // check for errors
        if (result["error"] === false) {
          // update progress bar
          callBack(95, "Uploading ...", false);
          // read next file
          read_ycoords_file(modelId, workDir, logHostName, callBack);
        } else {
          dialog.ajax_error("Server error: " + result["error_message"])("", "", "");
        }
      }).catch( () => {
        dialog.ajax_error("Server error: could not upload .xcoords file.")("", "", "");
      });
  }
  
  // read ycoords file
const read_ycoords_file = (
    modelId:string,
    workDir:string,
    logHostName:string,
    callBack:(progress:number, info: string, error: boolean) =>void) => {
    // upload csv file
    console.log("Uploading .ycoords file ...");
  
    // call web server to upload csv file
    client.get_model_command_fetch({
      mid: modelId,
      type: "VS",
      command: "read_mat_file",
      parameters: [workDir, logHostName, "movies.ycoords"]})
      .then((result:any) => {
        // check for errors
        if (result["error"] === false) {
          // update progress bar (done)
          callBack(100, "Uploaded", false);
          // done -- mark model as uploaded and launch
          client.put_model_parameter({
            mid: modelId,
            aid: "vs-loading-parms",
            value: ["Uploaded"],
            success: function () {
              window.location.href = '/models/' + modelId;
            },
            error: function () {
              dialog.ajax_error("Error uploading model status.")("", "", "");
            },
          });
        } else {
          dialog.ajax_error("Server error: " + result["error_message"])("", "", "");
        }
      }).catch(() => {
        dialog.ajax_error("Server error: could not upload .ycoords file.")("", "", "");
      });
  }
