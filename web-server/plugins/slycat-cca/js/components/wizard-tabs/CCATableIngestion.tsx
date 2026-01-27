/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import TableIngestion from "components/TableIngestion/TableIngestion";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import {
  selectAttributes,
  selectScaleInputs,
  setScaleInputs,
} from "../wizard-store/reducers/CCAWizardSlice";
import { useHandleTableIngestionOnChange } from "../CCAWizardUtils";

export const CCATableIngestion = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const attributes = useAppSelector(selectAttributes);
  const variance = useAppSelector(selectScaleInputs);
  const dispatch = useAppDispatch();
  const handleTableIngestionOnChange = useHandleTableIngestionOnChange(attributes);
  const axes_properties = [
    {
      name: "Axis Type",
      type: "select" as const,
      values: ["Input", "Output", "Neither"],
    },
  ];

  const stringColumns = attributes.filter((attribute) => attribute.type == "string");

  return (
    <div hidden={hidden}>
      {stringColumns.length > 0 && (
        <div className="alert alert-primary" role="alert">
          Slycat has detected non-numeric data columns in the given data table. The CCA calculation
          is only valid for numeric data so the following non-numeric columns are not displayed:
          <br />
          <strong>{stringColumns.map((attribute) => attribute.name).join(", ")}</strong>
        </div>
      )}
      <TableIngestion
        uniqueID="varOptions"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables={attributes as any}
        properties={axes_properties}
        onChange={handleTableIngestionOnChange}
        onBatchChange={handleTableIngestionOnChange}
      />
      <form role="form">
        <div className="form-group mt-3">
          <div className="form-check pl-1">
            <label>
              <input
                type="checkbox"
                checked={variance}
                onChange={(e) => {
                  dispatch(setScaleInputs(!variance));
                }}
              />
              Scale to unit variance
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
