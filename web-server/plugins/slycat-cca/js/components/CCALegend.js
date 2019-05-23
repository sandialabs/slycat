import React from "react";
import { Provider } from 'react-redux';

import d3 from "d3";

class CCALegend extends React.Component 
{
  constructor(props) {
    super(props);
    this.state = {
      
    };

    // Create a ref to the .cca-barplot-table
    this.cca_legend = React.createRef();
  }

  componentDidMount() 
  {
    
  }

  componentDidUpdate(prevProps, prevState, snapshot) 
  {
    
  }

  handle_mouse_down = (e) =>
  {
    
  }

  handle_mouse_move = (e) =>
  {
    
  }

  handle_mouse_up = (e) =>
  {
    
  }

  render_data = () =>
  {
    
  }

  render() {
    return (
      <React.Fragment>
        <React.StrictMode>
          <canvas id="scatterplot" 
            ref={this.cca_legend} 
            width={this.props.width} 
            height={this.props.height} 
            style={{
              width: this.props.width + 'px', 
              height: this.props.height + 'px'
            }}
            onMouseDown={this.handle_mouse_down}
            onMouseMove={this.handle_mouse_move}
            onMouseUp={this.handle_mouse_up}
            ></canvas>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCALegend
