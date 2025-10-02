/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";

var module = {}; //uploader object we wish to populate and return
module.MEGABYTE = 10000000; //the number of bytes we will split large files on

/**
 *  File uploader that can either be given a file or
 *  the location of a file on a remote host and upload
 *  it to the server.
 *
 *  @param fileObject
 *    json object with the following field values
 *    {
 *      pid: project id
 *      mid: model id
 *      sids: (used for remote file) Suser session id
 *      paths: (used for remote file)paths to files on the server for upload
 *      file: (used for local files)file to be uploaded if on the local system
 *      parser: parser to be used for uploading
 *      success: function called if upload is successful
 *    }
 */
module.uploadFile = function (fileObject, useProjectData = false) {
  if (fileObject.hostname && fileObject.paths) {
    // console.log("creating remote file upload session");
    client.post_uploads({
      mid: fileObject.mid,
      input: true,
      parser: fileObject.parser,
      aids: fileObject.aids,
      success: function (uid) {
        // console.log("Upload session created.");
        uploadRemoteFile(
          fileObject.pid,
          fileObject.mid,
          uid,
          fileObject.hostname,
          fileObject.paths,
          fileObject,
        );
      },
    });
  } else {
    // console.log("creating file upload session");
    client.post_uploads({
      mid: fileObject.mid,
      input: true,
      parser: fileObject.parser,
      aids: fileObject.aids,
      success: function (uid) {
        // console.log("Upload session created.");
        uploadFile(
          fileObject.pid,
          fileObject.mid,
          uid,
          fileObject.file,
          fileObject,
          useProjectData,
        );
      },
    });
  }
};

// upload multiple files (modified from uploadFiles)
// fileObject.file is passed as a FileList, and it
// only works for local uploads.
// S. Martin (10/23/2019)
module.uploadMultipleFiles = function (fileObject) {
  // open upload session
  client.post_uploads({
    mid: fileObject.mid,
    input: true,
    parser: fileObject.parser,
    aids: fileObject.aids,
    success: function (uid) {
      var fileList = fileObject.file;

      // Make sure we actually have a file list first
      if (fileList == undefined) {
        if (fileObject.error) {
          fileObject.error();
        }
        return;
      }

      // how many files?
      var numFiles = fileList.length;

      // initially assume one slice per file
      var fileSlicesUploaded = [];
      for (var i = 0; i < numFiles; i++) {
        fileSlicesUploaded.push(1);
      }

      // set up progress bar
      var progress = {};
      progress["IncreaseInitial"] = 10.0;
      progress["Increase"] = 40.0 / numFiles;

      // check if caller has specific progress bar values
      if (fileObject.progress_increment != undefined) {
        progress["IncreaseInitial"] = fileObject.progress_increment * 0.1;
        progress["Increase"] = (fileObject.progress_increment * 0.4) / numFiles;
      }

      // set initial progress bar
      if (fileObject.progress) {
        // Setting initial progress to 10%
        fileObject.progress(fileObject.progress() + progress["IncreaseInitial"]);
      }

      // check for text on progress bar
      if (fileObject.progress_status) {
        fileObject.progress_status("Uploading...");
      }

      // upload files, starting with first in list
      uploadMultipleFiles(progress, uid, 0, fileSlicesUploaded, fileObject);
    },
  });
};

// this is the actual code that uploads the file list,
// modified from the uploadFile routine.  it calls itself
// repeatedly until all files/slices are loaded.
// S. Martin (10/28/2019)
function uploadMultipleFiles(progress, uid, fileNum, fileSlicesUploaded, fileObject) {
  // console.log("uploading file " + fileNum + ".");

  var fileList = fileObject.file;

  // compute slices per file (must add 1 if actually sliced)
  var slicesPerFile = Math.ceil(fileList[fileNum].size / module.MEGABYTE);
  if (slicesPerFile > 1) {
    slicesPerFile++;
  }

  // compute progress per slice
  progress["IncreasePerSlice"] = progress["Increase"] / slicesPerFile;

  if (fileList[fileNum].size > module.MEGABYTE) {
    // console.log("Multi-file upload initiated.");
    uploadMultipleFileSlices(progress, uid, 0, fileNum, fileSlicesUploaded, fileObject);
  } else {
    // Upload the whole file since it is small.
    // console.log("Uploading whole file.");

    client.put_upload_file_part({
      uid: uid,
      fid: fileNum,
      pid: 0,
      file: fileList[fileNum],
      success: function () {
        // console.log("File uploaded.");
        if (fileObject.progress) {
          fileObject.progress(fileObject.progress() + progress["IncreasePerSlice"]);
        }

        // check for next file
        fileNum++;
        if (fileNum < fileList.length) {
          uploadMultipleFiles(progress, uid, fileNum, fileSlicesUploaded, fileObject);
        } else {
          finishMultipleUpload(progress, uid, fileSlicesUploaded, fileObject);
        }
      },
      error: function () {
        if (fileObject.error) {
          fileObject.error();
        }
      },
    });
  }
}

// this function replaces uploadFileSlices for multiple files.
// it returns control to uploadMultipleFiles rather than
// ending prematurely with finishUpload (now finishMultipleUpload).
// S. Martin (10/28/2019)
function uploadMultipleFileSlices(
  progress,
  uid,
  sliceNumber,
  fileNum,
  fileSlicesUploaded,
  fileObject,
) {
  // Split the file into slices.
  //TODO: add incrementing file id in upload file
  var fileList = fileObject.file;
  var fileSlice = getFileSlice(sliceNumber, fileList[fileNum]);
  var running = true;
  // Upload each part separately.
  // console.log("Uploading part", sliceNumber);
  client.put_upload_file_part({
    uid: uid,
    fid: fileNum,
    pid: sliceNumber,
    file: fileSlice,
    success: function () {
      running = sliceNumber * module.MEGABYTE <= fileList[fileNum].size;
      sliceNumber++;
      // console.log("File uploaded part:" + sliceNumber + " successfully");
      if (fileObject.progress) {
        fileObject.progress(fileObject.progress() + progress["IncreasePerSlice"]);
      }
      if (running) {
        uploadMultipleFileSlices(
          progress,
          uid,
          sliceNumber,
          fileNum,
          fileSlicesUploaded,
          fileObject,
        );
      } else {
        // check for next file
        fileSlicesUploaded[fileNum] = sliceNumber;
        fileNum++;
        if (fileNum < fileList.length) {
          uploadMultipleFiles(progress, uid, fileNum, fileSlicesUploaded, fileObject);
        } else {
          finishMultipleUpload(progress, uid, fileSlicesUploaded, fileObject);
        }
      }
    },
    error: function () {
      // console.log("File part " + sliceNumber + " failed to upload will try to re-upload at the end");
    },
  });
}

// replaces finishUpload for multiple file uploads.
// S. Martin (10/28/2019
function finishMultipleUpload(progress, uid, fileSlicesUploaded, fileObject) {
  // console.log(fileSlicesUploaded);

  client.post_upload_finished({
    uid: uid,
    uploaded: fileSlicesUploaded,
    success: function () {
      // console.log("Upload session finished.");
      if (fileObject.progress) {
        // Setting progress to half by adding 1/10th of total progress or progress_increment
        // since uploadFile() has already set it to 4/10ths
        progress["To90"] = 10;
        if (fileObject.progress_increment != undefined) {
          progress["To90"] = fileObject.progress_increment * 0.1;
        }
        fileObject.progress(fileObject.progress() + progress["To90"]);
      }
      deleteUpload(fileObject.pid, fileObject.mid, uid, fileObject);
    },
    error: function (request, status, reason_phrase) {
      if (fileObject.error) {
        fileObject.error();
      }
    },
  });
}

/**
 * used to upload a file to the server from a remote computer
 * @param pid
 *  project id
 * @param mid
 *  model id
 * @param uid
 *  unique session id
 * @param sid
 *  Suser id
 * @param path
 *  path to file on remote host
 * @param fileObject
 *  object that contains all info about the file we wish to upload to couch
 */
function uploadRemoteFile(pid, mid, uid, hostname, path, fileObject) {
  if (fileObject.progress) {
    // Setting initial progress to 10%
    fileObject.progress(10);
  }
  if (fileObject.progress_status) {
    fileObject.progress_status("Uploading...");
  }

  client.put_upload_file_part({
    uid: uid,
    fid: 0,
    pid: 0,
    path: path,
    hostname: hostname,
    success: function () {
      // console.log("File uploaded.");
      finishUpload(pid, mid, uid, null, 1, fileObject);
    },
    error: function () {
      if (fileObject.error) {
        fileObject.error();
      }
    },
  });
}

/**
 * get a file slice
 *
 * @param sliceNumber
 *  The incremental identifier for the file slice
 * @param file
 *  The file to be sliced
 * @return
 *  The slice of the file associated with the slice number
 */
function getFileSlice(sliceNumber, file) {
  var currentSliceBoundary = sliceNumber * module.MEGABYTE;
  if (currentSliceBoundary + module.MEGABYTE < file.size) {
    return file.slice(currentSliceBoundary, currentSliceBoundary + module.MEGABYTE);
  } else {
    return file.slice(currentSliceBoundary, file.size);
  }
}

/**
 * Used to upload multiple sequential slices of a file to the server database
 *
 * @param pid
 * @param mid
 * @param uid
 *  unique upload session id
 * @param sliceNumber
 *  The incremental identifier for the file slice
 * @param file
 *  file to be uploaded
 * @param fileObject
 * @param progressIncreasePerSlice
 */
function uploadFileSlices(pid, mid, uid, sliceNumber, file, fileObject, progressIncreasePerSlice) {
  // Split the file into slices.
  //TODO: add incrementing file id in upload file
  var fileSlice = getFileSlice(sliceNumber, file);
  var running = true;
  // Upload each part separately.
  // console.log("Uploading part", sliceNumber);
  client.put_upload_file_part({
    uid: uid,
    fid: 0,
    pid: sliceNumber,
    file: fileSlice,
    success: function () {
      running = sliceNumber * module.MEGABYTE <= file.size;
      sliceNumber++;
      // console.log("File uploaded part:" + sliceNumber + " successfully");
      if (fileObject && fileObject.progress && progressIncreasePerSlice) {
        fileObject.progress(fileObject.progress() + progressIncreasePerSlice);
      }
      if (running) {
        uploadFileSlices(pid, mid, uid, sliceNumber, file, fileObject, progressIncreasePerSlice);
      } else {
        finishUpload(pid, mid, uid, file, sliceNumber, fileObject); //good to go
      }
    },
    error: function () {
      // console.log("File part " + sliceNumber + " failed to upload will try to re-upload at the end");
    },
  });
}

/**
 * used to upload a single slice of a file
 * @param uid
 * @param sliceNumber
 * @param file
 */
function uploadFileSlice(uid, sliceNumber, file) {
  // Split the file into slices.
  //TODO: add incrementing file id in upload file
  var fileSlice = getFileSlice(sliceNumber, file);
  // Upload each part separately.
  // console.log("Uploading part", sliceNumber);
  client.put_upload_file_part({
    uid: uid,
    fid: 0,
    pid: sliceNumber,
    file: fileSlice,
    success: function () {
      // console.log("File uploaded part:" + sliceNumber + " successfully");
    },
    error: function () {
      // console.log("File part " + sliceNumber + " failed to upload will try to re-upload at the end");
    },
  });
}

/**
 * This function is designed to handle all file uploads and works
 * by splitting a file into 1 megabyte slices for upload to the
 * server
 *
 * @param pid
 *  project id
 * @param mid
 *  model id
 * @param uid
 *  unique id for the file upload on the server
 * @param file
 *  file to be uploaded
 * @param fileObject
 *  json object that contains the file info
 */
function uploadFile(pid, mid, uid, file, fileObject, useProjectData) {
  // Make sure we actually have a file first
  if (file == undefined) {
    if (fileObject.error) {
      fileObject.error();
    }
    return;
  }

  var progressIncreaseInitial = 10;
  var progressIncrease = 40;
  if (fileObject.progress_increment != undefined) {
    progressIncreaseInitial = fileObject.progress_increment * 0.1;
    progressIncrease = fileObject.progress_increment * 0.4;
  }

  // modified to adjust inconsistency in progress bar for large files
  // S. Martin (10/29/2019)
  var slicesPerFile = Math.ceil(file.size / module.MEGABYTE);
  if (slicesPerFile > 1) {
    slicesPerFile++;
  }
  var progressIncreasePerSlice = progressIncrease / slicesPerFile;

  // original code:
  // var progressIncreasePerSlice = (progressIncrease - progressIncreaseInitial) / Math.ceil(file.size / module.MEGABYTE);

  if (fileObject.progress) {
    // Setting initial progress to 10%
    fileObject.progress(fileObject.progress() + progressIncreaseInitial);
  }
  if (fileObject.progress_status) {
    fileObject.progress_status("Uploading...");
  }

  // console.log("Uploading file "+ file + " \nfile size:" + file.size);
  // console.log("floor size" + Math.floor(file.size / module.MEGABYTE));

  if (file.size > module.MEGABYTE) {
    // console.log("Multi-file upload initiated.");
    var running = true;
    var sliceNumber = 0;
    uploadFileSlices(pid, mid, uid, sliceNumber, file, fileObject, progressIncreasePerSlice);
  } else {
    // Upload the whole file since it is small.
    // console.log("Uploading whole file.");

    client.put_upload_file_part({
      uid: uid,
      fid: 0,
      pid: 0,
      file: file,
      success: function () {
        // console.log("File uploaded.");
        if (fileObject.progress) {
          fileObject.progress(fileObject.progress() + progressIncreasePerSlice);
        }
        finishUpload(pid, mid, uid, file, 1, fileObject, useProjectData);
      },
      error: function () {
        if (fileObject.error) {
          fileObject.error();
        }
      },
    });
  }
}

/**
 * Used to tell the server that all the sliced have be PUT to the server
 *
 * @param pid
 *  project id
 * @param mid
 *  model id
 * @param uid
 *  unique session id
 * @param file
 *  file that is being loaded
 * @param numberOfUploadedSlices
 *  number of slices the file was split into when uploaded starting from 1(not 0)
 * @param fileObject
 *  json object that contains the file info
 */
function finishUpload(pid, mid, uid, file, numberOfUploadedSlices, fileObject, useProjectData) {
  client.post_upload_finished({
    uid: uid,
    uploaded: [numberOfUploadedSlices],
    useProjectData: useProjectData,
    success: function () {
      // console.log("Upload session finished.");
      if (fileObject.progress) {
        // Setting progress to half by adding 1/10th of total progress or progress_increment
        // since uploadFile() has already set it to 4/10ths
        var progressToHalf = 10;
        if (fileObject.progress_increment != undefined) {
          progressToHalf = fileObject.progress_increment * 0.1;
        }
        fileObject.progress(fileObject.progress() + progressToHalf);
      }
      deleteUpload(pid, mid, uid, fileObject);
    },
    error: function (request, status, reason_phrase) {
      console.log("request.status", request.status);
      if (request.status === 400 && !fileObject.sids && !fileObject.paths) {
        var missingElements = JSON.parse(request.responseText).missing;
        missingElements.forEach(function (missingElement) {
          console.log("missing element " + missingElement[1] + " for file" + missingElement[0]);
          uploadFileSlice(uid, missingElement[1], file);
          finishUpload(pid, mid, uid, file, numberOfUploadedSlices, fileObject, useProjectData);
        });
      } else if (request.status === 423) {
        setTimeout(function () {
          finishUpload(pid, mid, uid, file, numberOfUploadedSlices, fileObject, useProjectData);
        }, 5000);
      } else {
        if (fileObject.error) {
          fileObject.error();
        }
      }
    },
  });
}

/**
 * Used to delete a file upload session at any point during the upload
 *
 * @param pid
 *  project id
 * @param mid
 *  model id
 * @param uid
 *  unique upload session id
 * @param fileObject
 *  json object that contains the file info
 */
function deleteUpload(pid, mid, uid, fileObject, progress_increment_applied) {
  if (fileObject.progress_status) {
    fileObject.progress(80);
    fileObject.progress_status("Parsing...");
  }
  client.delete_upload({
    uid: uid,
    success: function () {
      // console.log("Upload session deleted.");
      if (fileObject.progress) {
        var progress_final = 100;
        if (fileObject.progress_final != undefined) {
          progress_final = fileObject.progress_final;
        } else if (fileObject.progress_increment != undefined) {
          var progress_increment_used =
            progress_increment_applied == undefined ? 0 : progress_increment_applied;
          progress_final =
            fileObject.progress() +
            (fileObject.progress_increment -
              fileObject.progress_increment * 0.5 -
              progress_increment_used);
        }
        fileObject.progress(progress_final);
      }
      if (fileObject.success) {
        fileObject.success();
      }
    },
    error: function (request, status, reason_phrase) {
      if (request.status == 409) {
        var progress_increment_used =
          progress_increment_applied == undefined ? 0 : progress_increment_applied;
        var progress_step = 10;
        var progress_final = 90;
        if (fileObject.progress_final != undefined) {
          progress_final = fileObject.progress_final * 0.9;
        } else if (fileObject.progress_increment != undefined) {
          progress_final =
            fileObject.progress() + fileObject.progress_increment * 0.4 - progress_increment_used;
          progress_step = fileObject.progress_increment * 0.4 * 0.25;
        }
        if (fileObject.progress && fileObject.progress() < progress_final) {
          // Setting progress to 90%
          fileObject.progress(Math.min(progress_final, fileObject.progress() + progress_step));
        }

        window.setTimeout(
          deleteUpload.bind(null, pid, mid, uid, fileObject, progress_increment_used),
          3000,
        );
      }
    },
  });
}
//return new file uploader
export default module;
