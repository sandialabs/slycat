import * as React from "react";
import { CCAModalContent}  from "./CCAWizardContent";

export const CCAWizard = () =>{
    return (
          <CCAModalContent
            modalId={'this.state.modalId'}
            closingCallBack={()=>console.log('clean')}
            title={"CCA Wizard"}
            body={<div>Body</div>}
            footer={[<div>Footer</div>]}
          />
        );
}