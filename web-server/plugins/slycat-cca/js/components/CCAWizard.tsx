/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAModalContent } from "./CCAWizardContent";
import { CCAWizardSteps } from "./CCAWizardSteps";
import { useCCAWizardFooter } from "./CCAWizardUtils";
import { useAppDispatch } from "./wizard-store/hooks";
import { resetCCAWizard, setPid } from "./wizard-store/reducers/cCAWizardSlice";

interface CCAWizardParams {
  pid: string;
}

export const CCAWizard = (params: CCAWizardParams) => {
  const { pid } = params;
  const cCAWizardFooter = useCCAWizardFooter();
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    dispatch(setPid(pid));
   }, [dispatch, pid])
  
  return (
    <CCAModalContent
      key={"slycat-wizard"}
      // slycat-wizard is the standard wizard id from knockout
      modalId={"slycat-wizard"}
      closingCallBack={() => {
        console.log("clean and delete model");
        dispatch(resetCCAWizard());
      }}
      title={"New CCA Model"}
      footer={cCAWizardFooter}
    >
      <CCAWizardSteps key={"CCA Steps"} />
    </CCAModalContent>
  );
};