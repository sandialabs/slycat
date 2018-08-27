import React from 'react'
import { connect } from 'react-redux'
import { helloWorldAction } from '../Actions/hello-world-action.js'

let Button = ({ whatsUp, stateObject, saySomething }) => (

<div >
    <button onClick={saySomething}>
        Dispatch State
    </button>
    <button onClick={()=> console.log('Redux State:', stateObject)} >
        Inspect State
    </button>
  </div>

)

const mapStateToProps = (state) => ({
  whatsUp: state.say,
  stateObject: state
})

const mapDispatchToProps = (dispatch) => ({
  saySomething: () => { dispatch(helloWorldAction())}
})

Button = connect(
  mapStateToProps,
  mapDispatchToProps
)(Button)

export default Button;