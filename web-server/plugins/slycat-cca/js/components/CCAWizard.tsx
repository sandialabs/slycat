/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAModalContent } from "./CCAWizardContent";
import { CCAWizardSteps } from "./CCAWizardSteps";
import {
  useCCAWizardFooter,
  useHandleClosingCallback,
  useHandleWizardSetup,
} from "./CCAWizardUtils";
import { useAppSelector } from "./wizard-store/hooks";
import { selectMid, selectPid } from "./wizard-store/reducers/CCAWizardSlice";

interface CCAWizardParams {
  pid: string;
  marking?: string;
}

export const CCAWizard = (params: CCAWizardParams) => {
  const { pid, marking } = params;
  const [modalOpen, setModalOpen] = React.useState(true);
  const cCAWizardFooter = useCCAWizardFooter();
  const statePid = useAppSelector(selectPid);
  const stateMid = useAppSelector(selectMid);
  const handleClosingCallback = useHandleClosingCallback(setModalOpen, stateMid);
  const handleWizardSetup = useHandleWizardSetup(pid, statePid, stateMid, marking);

  React.useEffect(() => {
    if (modalOpen) {
      handleWizardSetup();
    }
  }, [pid, statePid, stateMid]);

  return (
    <CCAModalContent
      key={"slycat-wizard"}
      // slycat-wizard is the standard wizard id from knockout
      modalId={"slycat-wizard"}
      closingCallBack={handleClosingCallback}
      title={"New CCA Model"}
      footer={cCAWizardFooter}
    >
      <CCAWizardSteps key={"CCA Steps"} />
    </CCAModalContent>
  );
};
