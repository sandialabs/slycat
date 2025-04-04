/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCAModalContent } from "./CCAWizardContent";
import { CCAWizardSteps } from "./CCAWizardSteps";
import { useCCAWizardFooter } from "./CCAWizardUtils";
import { useAppDispatch, useAppSelector } from "./wizard-store/hooks";
import {
  resetCCAWizard,
  selectMid,
  selectPid,
  setMid,
  setPid,
} from "./wizard-store/reducers/cCAWizardSlice";
import client from "js/slycat-web-client";

interface CCAWizardParams {
  pid: string;
  marking?: string;
}

export const CCAWizard = (params: CCAWizardParams) => {
  const { pid, marking } = params;
  const [modalOpen, setModalOpen] = React.useState(true);
  const cCAWizardFooter = useCCAWizardFooter();
  const dispatch = useAppDispatch();
  const statePid = useAppSelector(selectPid);
  const stateMid = useAppSelector(selectMid);

  React.useEffect(() => {
    console.log("statePid, pid, selectMid", statePid, pid, stateMid);
    if (modalOpen) {
      if (!statePid) {
        dispatch(setPid(pid));
      }
      if (!stateMid && statePid) {
        // create the model on open so we have something to reference later
        client
          .post_project_models_fetch({
            pid: statePid,
            type: "cca",
            name: "",
            description: "",
            marking: marking ?? "",
          })
          .then((result) => {
            dispatch(setMid(result.id));
          });
      }
    }
  }, [dispatch, pid, statePid, stateMid]);

  return (
    <CCAModalContent
      key={"slycat-wizard"}
      // slycat-wizard is the standard wizard id from knockout
      modalId={"slycat-wizard"}
      closingCallBack={React.useCallback(() => {
        setModalOpen(false);
        if (stateMid) {
          console.log("delete");
          client.delete_model_fetch({ mid: stateMid });
        }
        dispatch(resetCCAWizard());
      }, [stateMid])}
      title={"New CCA Model"}
      footer={cCAWizardFooter}
    >
      <CCAWizardSteps key={"CCA Steps"} />
    </CCAModalContent>
  );
};
