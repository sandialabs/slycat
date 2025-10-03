/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import TableIngestion from "components/TableIngestion/TableIngestion";
import { useAppDispatch, useAppSelector } from "../wizard-store/hooks";
import { selectAttributes } from "../wizard-store/reducers/CCAWizardSlice";
import { useHandleTableIngestionOnChange } from "../CCAWizardUtils";

export const CCATableIngestion = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const attributes = useAppSelector(selectAttributes);
  const handleTableIngestionOnChange = useHandleTableIngestionOnChange(attributes);
  const axes_properties = [
    {
      name: "Axis Type",
      type: "select" as const,
      values: ["Input", "Output", "Neither"],
    },
  ];
  return (
    <div hidden={hidden}>
      <TableIngestion
        uniqueID="varOptions"
        variables={attributes}
        properties={axes_properties}
        onChange={handleTableIngestionOnChange}
        onBatchChange={handleTableIngestionOnChange}
      />
      <form role="form">
        <div className="form-group mt-3">
          <div className="form-check pl-1">
            <label>
              <input type="checkbox" /> Scale to unit variance
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
