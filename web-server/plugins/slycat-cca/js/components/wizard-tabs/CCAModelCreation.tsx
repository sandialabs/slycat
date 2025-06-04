/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import selectable_markings from "js/slycat-selectable-markings";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import { selectMarking, setMarking } from "../wizard-store/reducers/cCAWizardSlice";

export const CCAModelCreation = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const dispatch = useAppDispatch();
  const marking = useAppSelector(selectMarking);
  React.useEffect(() => {
    if (!marking) {
      const defaultMarking = selectable_markings?.allowed().find((marking: any) => !!marking);
      if (defaultMarking?.type()) {
        dispatch(setMarking(defaultMarking.type()));
      }
    }
  }, [selectable_markings?.allowed()]);
  const onOptionChangeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target?.value) {
      dispatch(setMarking(event.target?.value));
    }
  };
  return (
    <div hidden={hidden}>
      <form data-bind="submit: name_model" id="new-cca-name-model-form" noValidate>
        <div className="mb-3 row required">
          <label className="col-sm-2 col-form-label">Name</label>
          <div className="col-sm-10">
            <input id="slycat-model-name" className="form-control" type="text" required />
            <div className="invalid-feedback">Please enter a model name.</div>
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">Description</label>
          <div className="col-sm-10">
            <textarea id="slycat-model-description" className="form-control" rows={5}></textarea>
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">Marking</label>
          <div className="col-sm-10">
            <select
              id="slycat-model-marking"
              className="form-select"
              onChange={onOptionChangeHandler}
            >
              {selectable_markings?.allowed().map((marking: any) => {
                return (
                  <option key={marking.type()} value={marking.type()}>
                    {marking.label()}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};
