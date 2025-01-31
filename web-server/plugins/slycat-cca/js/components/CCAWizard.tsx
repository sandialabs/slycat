import * as React from "react";
import { CCAModalContent}  from "./CCAWizardContent";
import { CCAWizardSteps } from "./CCAWizardSteps"

export const CCAWizard = () =>{
    return (
          <CCAModalContent
            key={'slycat-wizard'}
            // slycat-wizard is the standard wizard id from knockout
            modalId={'slycat-wizard'}
            closingCallBack={()=>console.log('clean and delete model')}
            title={"New CCA Model"}
            footer={[<div>Footer</div>]}
          >
            <CCAWizardSteps key={'CCA Steps'}></CCAWizardSteps>
            </CCAModalContent>
        );
}