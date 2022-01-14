import client from "js/slycat-web-client";

/**
 * @param file Will be a File object in the case of local upload. Will be string array in the case of remote upload. 
 * @param selectedOption Selected upload type, i.e. local or remote
 * @param mid Current model ID
 */

const checkColumns = (file:any, selectedOption:String, mid:String) => {
    let column_row;
    let newColumns = ["test"]; //new columns

    /** 
    * If a local file is selected, it's a blob that requires a reader.
    * If a remote file is selected, get_remote_file_fetch returns it as a string. 
    * No reader is required in that case.
    */
    if(selectedOption === "local") {
      let reader = new FileReader();
      reader.onload = (e) => {
        /**
         * Reads in the file being selected for upload, splits on '\n' to get the first row, which contains the column names.
         * Then splits on ',' to get the individual column names.
         */
        column_row = e.target.result.split('\n');
        let csv = column_row[0].includes(","); // true if csv, false if dakota tabular
        if(csv) {
          newColumns = column_row[0].split(',');
        }
        // if not csv, then dakota tabular
        else {
          // If table is dakota tabular, the number of white spaces as the delimiter is arbitrary.
          // So split on a single white space, then filter all the white spaces out of the resulting array, leaving you with column names.
          newColumns = column_row[0].split(' ');
          newColumns = newColumns.filter(function(entry) { return entry.trim() != ''; });
        }
      };
      reader.readAsText(file);
    }
    else {
      column_row = file.split('\n');
      let csv = column_row[0].includes(","); // true if csv, false if dakota tabular
      if(csv) {
        newColumns = column_row[0].split(',');
      }
      // if not csv, then dakota tabular
      else {
        // If table is dakota tabular, the number of white spaces as the delimiter is arbitrary.
        // So split on a single white space, then filter all the white spaces out of the resulting array, leaving you with column names.
        newColumns = column_row[0].split(' ');
        newColumns = newColumns.filter(function(entry) { return entry.trim() != ''; });
      }
    }

    return client.get_model_table_metadata_fetch({mid: mid, aid: "data-table"}).then((json)=>{
      let passed = true;
      let reason = "";
      let currentColumns = json["column-names"];

      if(currentColumns.length !== newColumns.length) {
        passed = false;
        reason = "The CSV you have attempted to upload does not have the same number of columns " +
                 "as the CSV currently being used by the model.\n";
      }
      else {
        currentColumns.forEach((column, i) => {
          if (column.trim() !== newColumns[i].trim()) {
            passed = false;
            reason = "The CSV you have attempted to upload has a different order of columns " +
                     "than the CSV currently being used by the model.\n";
          }
        });
      }
      let results = {
        passed: passed,
        reason: reason
      };
      return results;
    })
  };

export default checkColumns;
