/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAModalContent } from "./CCAWizardContent";
import { CCAWizardSteps } from "./CCAWizardSteps";
import { useCCAWizardFooter } from "./CCAWizardUtils";
import { useAppDispatch } from "./wizard-store/hooks";
import { resetTabTracking } from "./wizard-store/reducers/tabTrackingSlice";

export const CCAWizard = () => {
  const cCAWizardFooter = useCCAWizardFooter();
  const dispatch = useAppDispatch();
  return (
      <CCAModalContent
        key={"slycat-wizard"}
        // slycat-wizard is the standard wizard id from knockout
        modalId={"slycat-wizard"}
        closingCallBack={() => {
          console.log("clean and delete model")
          dispatch(resetTabTracking())
        }}
        title={"New CCA Model"}
        footer={cCAWizardFooter}
      >
        <CCAWizardSteps key={"CCA Steps"} />
      </CCAModalContent>
  );
};
