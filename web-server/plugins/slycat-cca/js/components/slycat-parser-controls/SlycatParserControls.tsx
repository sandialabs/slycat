/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import parsers from "js/slycat-parsers";
import _ from "lodash";

export const SlycatParserControls = () => {
  const filteredParsers = parsers
    .available()
    ?.filter((parser: { categories: () => string }) => _.includes(parser.categories(), "table"));
  return (
    <div className="form-group row">
      <label className="col-sm-2 col-form-label">Filetype</label>
      <div className="col-sm-10">
        <select id="slycat-model-parser" className="form-control" >
          {filteredParsers.map((parser: { type: () => string }) => {
            return <option>{parser.type()}</option>;
          })}
        </select>
      </div>
    </div>
  );
};
