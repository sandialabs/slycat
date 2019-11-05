// Whether we should sync cameras
let syncCameras = true;
// An array of all the cameras. Each element is an object containing 
// a camera and its associated interactor, like so: {camera: *the camera*, interactor: *the interactor*}
let cameras = [];

let cameraOnModified = null;
// Tracks the currently or last selected camera
let selectedCamera = null;

function handleModifiedCamera(sourceCamera, allCameras) {
  // console.log('inside handleModifiedCamera: ' + sourceCamera + ', with these cameras: ' + allCameras);
  if(syncCameras)
  {
    let noMatch = true;
    for(let targetCamera of allCameras) {
      if(targetCamera.camera != sourceCamera)
      {
        // console.log('this is not the source camera');
        targetCamera.camera.setPosition(...sourceCamera.getPosition());
        targetCamera.camera.setFocalPoint(...sourceCamera.getFocalPoint());
        targetCamera.camera.setViewUp(...sourceCamera.getViewUp());
        targetCamera.interactor.render();
      }
      else
      {
        noMatch = false;
      }
    }
    if(noMatch)
    {
      console.log('we have a problem, there is no camera match in handleModifiedCamera');
    }
  }
}

export function setSyncCameras(syncCamerasBool) {
  syncCameras = syncCamerasBool;
  if(syncCameras)
  {
    handleModifiedCamera(selectedCamera, cameras);
  }
}

export function addCamera(camera, container, interactor) {
  cameras.push({camera: camera, interactor: interactor});

  // Listen for the selected event and add an onModified handler to the selected camera
  container.addEventListener('vtkselect', (e) => { 
    // console.log('vtk selected');
    selectedCamera = camera;
    cameraOnModified = camera.onModified(
      (function() {
        return function() {
          // console.log('inside handleModifiedCamera: ' + camera + ', with these cameras: ' + cameras);
          handleModifiedCamera(camera, cameras, interactor);
        }
      })()
    );
  }, false);

  // Listen for the unselected event and remove the onModified handler of the selected camera
  container.addEventListener('vtkunselect', (e) => { 
    if(cameraOnModified !== null) {
      cameraOnModified.unsubscribe();
    }
    // console.log('vtk unselected');
  }, false);

  // Listen for the close event and remove the camera from the array of all cameras
  container.addEventListener('vtkclose', (e) => {
    console.log('removing camera due to frame being closed.');
    removeCamera(camera);
  }, false);

  // console.log('added camera: ' + camera);
}

export function removeCamera(camera) {
  let noMatch = true;
  for (let [index, targetCamera] of cameras.entries())
  {
    if(targetCamera.camera == camera)
    {
      // console.log('closing camera ' + index);
      noMatch = false;
      cameras.splice(index, 1);
    }
  }
  if(noMatch)
  {
    console.log('we have a problem, there is no camera match in removeCamera');
  }
}