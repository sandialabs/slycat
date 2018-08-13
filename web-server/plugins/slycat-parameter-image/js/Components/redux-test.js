import React from 'react'
import { connect } from 'react-redux'
import { helloWorldAction } from './Actions'

let Button = ({ whatsUp, stateObject, saySomething }) => (

<div >
    <button onClick={saySomething}>
        PRESS TO DISPATCH FIRST ACTION
    </button>
    <h2>{whatsUp}</h2>
    <button onClick={()=> console.log('Redux State:',stateObject)} >
        Press to inspect STATE in console panel
    </button>
  </div>

)

const mapStateToProps = (state) => ({
  whatsUp: state.say,
  stateObject: state
})

const mapDispatchToProps = (dispatch) => ({
  saySomething: () => { dispatch(sayHello())}
})

Button = connect(
  mapStateToProps,
  mapDispatchToProps
)(Button)

export default Button;