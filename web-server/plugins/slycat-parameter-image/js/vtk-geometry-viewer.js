import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkXMLPolyDataReader from 'vtk.js/Sources/IO/XML/XMLPolyDataReader';
import HttpDataAccessHelper from 'vtk.js/Sources/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';

import { addCamera, } from './vtk-camera-synchronizer';

var vtkstartinteraction_event = new Event('vtkstartinteraction');

export function load(container, buffer) {
  // lut
  const lutName = 'erdc_rainbow_bright';

  // ----------------------------------------------------------------------------
  // Standard rendering code setup
  // ----------------------------------------------------------------------------

  const renderWindow = vtkRenderWindow.newInstance();
  const renderer = vtkRenderer.newInstance({
    // Set the background to black
    background: [0, 0, 0] 
  });
  renderWindow.addRenderer(renderer);

  // ----------------------------------------------------------------------------
  // Simple pipeline VTP reader Source --> Mapper --> Actor
  // ----------------------------------------------------------------------------

  const vtpReader = vtkXMLPolyDataReader.newInstance();
  vtpReader.parseAsArrayBuffer(buffer);

  const lookupTable = vtkColorTransferFunction.newInstance();
  const source = vtpReader.getOutputData(0);
  const mapper = vtkMapper.newInstance({
    interpolateScalarsBeforeMapping: false,
    useLookupTableScalarRange: true,
    lookupTable,
    scalarVisibility: false,
  });
  mapper.setInputData(source);
  const actor = vtkActor.newInstance();
  const scalars = source.getPointData().getScalars();
  const dataRange = [].concat(scalars ? scalars.getRange() : [0, 1]);
  let activeArray = vtkDataArray;
  actor.setMapper(mapper);

  // --------------------------------------------------------------------
  // Color handling
  // --------------------------------------------------------------------

  function applyPreset() {
    // const preset = vtkColorMaps.getPresetByName(presetSelector.value);
    const preset = vtkColorMaps.getPresetByName(lutName);
    lookupTable.applyColorMap(preset);
    lookupTable.setMappingRange(dataRange[0], dataRange[1]);
    lookupTable.updateRange();
  }
  applyPreset();

  // ----------------------------------------------------------------------------
  // Add the actor to the renderer and set the camera based on it
  // ----------------------------------------------------------------------------

  renderer.addActor(actor);
  renderer.resetCamera();

  // ----------------------------------------------------------------------------
  // Use OpenGL as the backend to view the all this
  // ----------------------------------------------------------------------------

  const openglRenderWindow = vtkOpenGLRenderWindow.newInstance();
  renderWindow.addView(openglRenderWindow);

  // ----------------------------------------------------------------------------
  // Set the container for the OpenGL renderer
  // ----------------------------------------------------------------------------
  openglRenderWindow.setContainer(container);

  // ----------------------------------------------------------------------------
  // Capture size of the container and set it to the renderWindow
  // ----------------------------------------------------------------------------

  function setSize() {
    const { width, height } = container.getBoundingClientRect();
    openglRenderWindow.setSize(width, height);
  }

  setSize();

  // Listen for the resize event and reset the size
  container.addEventListener('vtkresize', (e) => { 
    // console.log('vtk resized');
    setSize();
    interactor.render();
  }, false);

  // ----------------------------------------------------------------------------
  // Setup an interactor to handle mouse events
  // ----------------------------------------------------------------------------

  const interactor = vtkRenderWindowInteractor.newInstance();
  interactor.setView(openglRenderWindow);
  interactor.initialize();
  interactor.bindEvents(container);

  // ----------------------------------------------------------------------------
  // Setup interactor style to use
  // ----------------------------------------------------------------------------

  const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
  interactor.setInteractorStyle(interactorStyle);

  // Dispatching a vtk start interaction event when someone starts interacting with this 
  // 3d model. It's used by the scatterplot to select the model's frame.
  interactorStyle.onStartInteractionEvent(() => {
    // console.log('interactorStyle.onStartInteractionEvent');
    container.dispatchEvent(vtkstartinteraction_event);
  });

  // Get the active camera and pass it to camera synchronizer
  let camera = renderer.getActiveCamera();
  addCamera(camera, container, interactor);
}