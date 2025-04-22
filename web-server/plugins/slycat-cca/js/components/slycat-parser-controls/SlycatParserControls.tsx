/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import parsers from "js/slycat-parsers";
import _ from "lodash";
import { handleParserChange } from "../CCAWizardUtils";

export const SlycatParserControls = (props: {
  setParser: React.Dispatch<React.SetStateAction<string | undefined>>;
}) => {
  const { setParser } = props;
  const filteredParsers: [{ type: () => string }] = parsers
    .available()
    ?.filter((parser: { categories: () => string }) => _.includes(parser.categories(), "table"));
  React.useEffect(() => {
    if (filteredParsers !== undefined && filteredParsers.length > 0) {
      console.log('reset', filteredParsers[0].type());
      setParser(filteredParsers[0].type());
    }
  }, [filteredParsers.length]);
  return (
    <div className="form-group row">
      <label className="col-sm-2 col-form-label">Filetype</label>
      <div className="col-sm-10">
        <select id="slycat-model-parser" className="form-control" onChange={handleParserChange(setParser)}>
          {filteredParsers.map((parser: { type: () => string }) => {
            return <option key={parser.type()}>{parser.type()}</option>;
          })}
        </select>
      </div>
    </div>
  );
};
