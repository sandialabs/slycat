/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

interface CCAErrorProps {
  errorMessage?: string;
}

export const CCAError = ({ errorMessage }: CCAErrorProps) => {
  return (
    <div className="alert alert-danger slycat-big-scrolling-alert" role="alert">
      {errorMessage}
    </div>
  );
};
