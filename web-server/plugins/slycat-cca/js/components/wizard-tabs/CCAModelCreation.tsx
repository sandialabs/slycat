/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import selectable_markings from "js/slycat-selectable-markings";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  selectMarking,
  setDescription,
  setMarking,
  setName,
} from "../wizard-store/reducers/CCAWizardSlice";

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
  }, [dispatch, marking]);
  const onOptionChangeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target?.value) {
      dispatch(setMarking(event.target?.value));
    }
  };
  const onDescriptionChangeHandler = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (event.target?.value) {
      dispatch(setDescription(event.target?.value));
    }
  };
  const onNameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target?.value) {
      dispatch(setName(event.target?.value));
    }
  };
  const handleOnKey = (event: React.KeyboardEvent) => {
    if (event.code === "Enter") {
      //prevent page refresh on enter
      event.preventDefault();
      // find the continue button and trigger a click
      $("button:contains('Continue')").trigger('click');
    }
  };
  return (
    <div hidden={hidden}>
      <form id="new-cca-name-model-form" noValidate>
        <div className="mb-3 row required">
          <label className="col-sm-2 col-form-label">Name</label>
          <div className="col-sm-10">
            <input
              id="slycat-model-name"
              onChange={onNameChangeHandler}
              className="form-control"
              type="text"
              required
              onKeyDown={handleOnKey}
              onKeyUp={handleOnKey}
            />
            <div className="invalid-feedback">Please enter a model name.</div>
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">Description</label>
          <div className="col-sm-10">
            <textarea
              id="slycat-model-description"
              onChange={onDescriptionChangeHandler}
              className="form-control"
              rows={5}
            ></textarea>
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
