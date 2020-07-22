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
import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";
import {
  ColorMode,
  ScalarMode,
} from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';

import { addCamera, } from './vtk-camera-synchronizer';

import { updateThreeDColorByOptions } from './actions';

var vtkstartinteraction_event = new Event('vtkstartinteraction');

export function load(container, buffer, uri) {

  // ----------------------------------------------------------------------------
  // Standard rendering code setup
  // ----------------------------------------------------------------------------

  const renderWindow = vtkRenderWindow.newInstance();

  const rgb = window.store.getState().threeD_background_color;
  const renderer = vtkRenderer.newInstance({
    // Set the background color
    background: [
      rgb[0]/255, 
      rgb[1]/255, 
      rgb[2]/255,
    ],
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
  
  let colormap;

  function applyPreset() {
    // console.log('setting color to: ' + window.store.getState().threeDColormap);
    colormap = slycat_threeD_color_maps.vtk_color_maps[window.store.getState().threeDColormap];
    lookupTable.applyColorMap(colormap);
    lookupTable.setMappingRange(dataRange[0], dataRange[1]);
    lookupTable.updateRange();

    // Not part of VTK example, but needs to be done to get update after chaning color options
    renderWindow.render();
  }

  function applyPresetIfChanged() {
    if(slycat_threeD_color_maps.vtk_color_maps[window.store.getState().threeDColormap] != colormap)
    {
      // console.log("Colormap changed, so applying the new one.");
      applyPreset();
    }
    else{
      // console.log("Colormap did not changed, so not applying the new one.");
    }
  }

  // Set the 3D colormap to what's currently in the Redux store
  applyPreset();

  // Set the 3D colormap to what's in the Redux state
  // each time the Redux state changes.
  window.store.subscribe(applyPresetIfChanged);

  // --------------------------------------------------------------------
  // ColorBy handling
  // --------------------------------------------------------------------
  
  // Default to Solid color
  let colorBy = ":";

  const colorByOptions = [{ 
      value: ':', 
      label: 'Solid color',
    }]
    .concat(
      source
        .getPointData()
        .getArrays()
        .map((a) => ({       
          label: a.getName(),
          value: `PointData:${a.getName()}`,
          type: 'Point',
          components: a.getNumberOfComponents(),
      })),
      source
        .getCellData()
        .getArrays()
        .map((a) => ({
          label: a.getName(),
          value: `CellData:${a.getName()}`,
          type: 'Cell',
          components: a.getNumberOfComponents(),
      })
    )
  );
  // Dispatch update to available color by options to redux store
  window.store.dispatch(updateThreeDColorByOptions(uri, colorByOptions));

  function updateColorBy() {
    // Use default colorBy if we don't have a setting for it in the state
    if(window.store.getState().three_d_colorvars && window.store.getState().three_d_colorvars[uri])
    {
      colorBy = window.store.getState().three_d_colorvars[uri];
    }

    const [location, colorByArrayName, componentString] = colorBy.split(':');
    // Convert component string to integer, set to undefined if there isn't one
    const component = componentString ? parseInt(componentString, 10) : undefined;
    const interpolateScalarsBeforeMapping = location === 'PointData';
    let colorMode = ColorMode.DEFAULT;
    let scalarMode = ScalarMode.DEFAULT;
    const scalarVisibility = location.length > 0;

    // We are coloring by point or cell data
    if (scalarVisibility) 
    {
      const newArray = source[`get${location}`]().getArrayByName(
        colorByArrayName
      );
      activeArray = newArray;
      const numberOfComponents = activeArray.getNumberOfComponents();

      const newDataRange = activeArray.getRange();
      dataRange[0] = newDataRange[0];
      dataRange[1] = newDataRange[1];
      colorMode = ColorMode.MAP_SCALARS;
      scalarMode =
        location === 'PointData'
          ? ScalarMode.USE_POINT_FIELD_DATA
          : ScalarMode.USE_CELL_FIELD_DATA
      ;
      
      if(mapper.getLookupTable())
      {
        const lut = mapper.getLookupTable();
        // Use the selected component if we have one
        if(component > -1) 
        {
          lut.setVectorModeToComponent();
          lut.setVectorComponent(component);
          const componentDataRange = activeArray.getRange(component);
          dataRange[0] = componentDataRange[0];
          dataRange[1] = componentDataRange[1];
          lookupTable.setMappingRange(dataRange[0], dataRange[1]);
          lut.updateRange();
        }
        // Set the component to magnitude if we don't have one
        else
        {
          lut.setVectorModeToMagnitude();
        }
      }
    }

    mapper.set({
      colorByArrayName,
      colorMode,
      interpolateScalarsBeforeMapping,
      scalarMode,
      scalarVisibility,
    });
    applyPreset();
  }

  function updateColorByIfChanged() {
    if(window.store.getState().three_d_colorvars
       && window.store.getState().three_d_colorvars[uri]
       && window.store.getState().three_d_colorvars[uri] != colorBy)
    {
      // console.log("ColorBy changed, so applying the new one.");
      updateColorBy();
    }
    else{
      // console.log("ColorBy did not changed, so not applying the new one.");
    }
  }

  updateColorBy();

  // Set the 3D colormap to what's in the Redux state
  // each time the Redux state changes.
  window.store.subscribe(updateColorByIfChanged);

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

  // Get the active camera
  let camera = renderer.getActiveCamera();

  // Set the camera based on what's in the state
  let cameraState = window.store.getState().three_d_cameras? window.store.getState().three_d_cameras[uri] : false;
  if(cameraState)
  {
    // console.log('we have state for the camera: ' + cameraState);
    camera.setPosition(...cameraState.position);
    camera.setFocalPoint(...cameraState.focalPoint);
    camera.setViewUp(...cameraState.viewUp);
    interactor.render();
    // renderer.resetCamera();
  }

  // Pass the active camera to camera synchronizer
  addCamera(camera, container, interactor, uri);
}