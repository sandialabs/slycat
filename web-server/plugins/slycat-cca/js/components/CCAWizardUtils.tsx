import * as React from "react";

export const useCCAWizardFooter = () => {
    const backButton = (<button key="back button" className="btn btn-light mr-auto" onClick={()=>console.log('back')}>
                            Back
                        </button>)
    const nextButton =  (<button key="continue" className="btn btn-primary" onClick={()=>console.log('click')}>
                            Continue
                        </button>)
    return React.useMemo(()=>[backButton, nextButton],[])
}