define("file_uploader_factory",["slycat-web-client"], function(client)
    {
      var module = {};
      module.MEGABYTE = 1000000;
      //module.MEGABYTE = 10000;
      /**
       *  File uploader
       *
       *  @param fileObject
       *    json object with the following field values
       *    pid: project id
       *    mid: model id
       *    file: file to be uploaded
       *    parser: parser to be used for uploading
       *    success: function called if upload is successful
       */
      module.uploadFile = function (fileObject)
      {
        client.post_uploads({
          mid: fileObject.mid,
          input: true,
          parser: fileObject.parser,
          aids: ["data-table"],
          success: function(uid)
          {
            console.log("Upload session created.");
            uploadFile(fileObject.pid, fileObject.mid, uid, fileObject.file, fileObject);
          }
        });
      };
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
      function getFileSlice(sliceNumber, file){
          var currentSliceBoundary = (sliceNumber * module.MEGABYTE);
          if((currentSliceBoundary + module.MEGABYTE) < file.size){
            return file.slice(currentSliceBoundary, currentSliceBoundary + module.MEGABYTE);
          }else{
            return file.slice(currentSliceBoundary, file.size)
          }
      }
      /**
       * Used to upload a slice of a file to the server database
       *
       * @param uid
       *  unique upload session id
       * @param sliceNumber
       *  The incremental identifier for the file slice
       * @param file
       *  file to be uploaded
       */
      function uploadFileSlice(uid, sliceNumber, file){
        // Split the file into slices.
        var fileSlice = getFileSlice(sliceNumber, file);
          // Upload each part separately.
          console.log("Uploading part", sliceNumber);
          client.put_upload_file_part({
            uid: uid,
            fid: 0,
            pid: sliceNumber,
            file: fileSlice,
            success: function()
            {
              console.log("File uploaded part:" + sliceNumber + " successfully");
            },
            error: function(){
              console.log("File part " + sliceNumber + " failed to upload will try to re-upload at the end");
            }
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
      function uploadFile(pid, mid, uid, file, fileObject)
      {
        console.log("Upload file"+ file + " \nfile size:" + File.size);
        console.log("floor size" + Math.floor(file.size / module.MEGABYTE));

        if(file.size > module.MEGABYTE){
          console.log("multi File upload initiated.");
          var running = true;
          var sliceNumber = 0;
          while(running) {
            uploadFileSlice(uid, sliceNumber, file);
            running = ((sliceNumber * module.MEGABYTE) <= file.size);
            sliceNumber ++;
          }
          finishUpload(pid, mid, uid, file, sliceNumber, fileObject);//good to go
        }else{
          // Upload the whole file since it is small.
          console.log("Uploading part whole file");
          client.put_upload_file_part({
            uid: uid,
            fid: 0,
            pid: 0,
            file: file,
            success: function()
            {
              console.log("File uploaded.");
              finishUpload(pid, mid, uid, file, 1, fileObject);
            }
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
      function finishUpload(pid, mid, uid, file, numberOfUploadedSlices, fileObject)
      {
        client.post_upload_finished({
          uid: uid,
          uploaded: [numberOfUploadedSlices],
          success: function()
          {
            console.log("Upload session finished.");
            delete_upload(pid, mid, uid, fileObject);
          },
          error: function(request, status, reason_phrase)
          {
            if(request.status == 400)
            {
              var missingElements = JSON.parse(request.responseText).missing;
              missingElements.forEach(function(missingElement){
                console.log("missing element " + missingElement[1] + " for file" + missingElement[0]);
                uploadFileSlice(uid, missingElement[1], file);
                finishUpload(pid, mid, uid, file, numberOfUploadedSlices, fileObject);
              });
            }
          }
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
      function deleteUpload(pid, mid, uid, fileObject)
      {
        client.delete_upload({
          uid: uid,
          success: function()
          {
            console.log("Upload session deleted.");
            if(fileObject.success){
              fileObject.success();
            }
          },
          error: function(request, status, reason_phrase)
          {
            if(request.status == 409)
            {
              window.setTimeout(deleteUpload.bind(null, pid, mid, uid, fileObject), 3000)
            }
          }
        });
      }

    });