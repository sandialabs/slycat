import { updateThreeDCameras } from './actions';

// Whether we should sync cameras
let syncCameras = true;
// An array of all the cameras. Each element is an object containing 
// a camera and its associated interactor, like so: 
// {camera: *the camera*, interactor: *the interactor*, uid: *the uid*}
let cameras = [];

let cameraOnModified = null;
// Tracks the currently or last selected camera
let selectedCamera = null;

function handleModifiedCamera(sourceCamera, allCameras) {
  // console.log('inside handleModifiedCamera: ' + sourceCamera + ', with these cameras: ' + allCameras);
  // Make sure we have a source camera. It doesn't exist sometimes when opening new pins.
  if(sourceCamera)
  {
    for(let targetCamera of allCameras) {
      if(syncCameras && (targetCamera.camera != sourceCamera))
      {
        // console.log('we are syncing cameras and this is not the source camera, so let's set its camera same as the source');
        targetCamera.camera.setPosition(...sourceCamera.getPosition());
        targetCamera.camera.setFocalPoint(...sourceCamera.getFocalPoint());
        targetCamera.camera.setViewUp(...sourceCamera.getViewUp());
        // Trying to reset clipping range instead of setting it to see if it helps with issue #986
        // targetCamera.camera.setClippingRange(...sourceCamera.getClippingRange());
        targetCamera.renderer.resetCameraClippingRange();
        targetCamera.interactor.render();
      }
    }

    // Set state to reflect all cameras
    if(window.store)
    {
      window.store.dispatch(updateThreeDCameras(allCameras));
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

export function addCamera(camera, container, interactor, uid, renderer) {
  // When we are adding a new camera and sync is on, we need to set it up like the others
  if(syncCameras && cameras.length)
  {
    camera.setPosition(...cameras[0].camera.getPosition());
    camera.setFocalPoint(...cameras[0].camera.getFocalPoint());
    camera.setViewUp(...cameras[0].camera.getViewUp());
    // Trying to reset clipping range instead of setting it to see if it helps with issue #986
    // camera.setClippingRange(...cameras[0].camera.getClippingRange());
    renderer.resetCameraClippingRange();
    interactor.render();
    // console.log('Hurray, we set up this camera like the first one of the existing ones!!!');
  }


  cameras.push({
    camera: camera, 
    interactor: interactor, 
    uid: uid, 
    renderer: renderer,
  });

  // Listen for the selected event and add an onModified handler to the selected camera
  container.addEventListener('vtkselect', (e) => { 
    // console.log('vtk selected');
    selectedCamera = camera;
    cameraOnModified = camera.onModified(
      (function() {
        return function() {
          // console.log('inside handleModifiedCamera: ' + camera + ', with these cameras: ' + cameras);
          handleModifiedCamera(camera, cameras);
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
    // console.log('removing camera due to frame being closed.');
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