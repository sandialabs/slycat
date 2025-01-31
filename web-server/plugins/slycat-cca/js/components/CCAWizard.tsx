import * as React from "react";
import { CCAModalContent}  from "./CCAWizardContent";
import { CCAWizardSteps } from "./CCAWizardSteps"
import { useCCAWizardFooter } from "./CCAWizardUtils"

export const CCAWizard = () =>{
    const cCAWizardFooter = useCCAWizardFooter();
    return (
          <CCAModalContent
            key={'slycat-wizard'}
            // slycat-wizard is the standard wizard id from knockout
            modalId={'slycat-wizard'}
            closingCallBack={()=>console.log('clean and delete model')}
            title={"New CCA Model"}
            footer={cCAWizardFooter}
          >
            <CCAWizardSteps key={'CCA Steps'}/>
            </CCAModalContent>
        );
}