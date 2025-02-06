/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import { CCANavItem } from "./CCANavItem";

export const CCAWizardNavItems = () => {
  return (
      <ul className="nav nav-pills">
        <CCANavItem key={'Locate Data'} name={'Locate Data'} active={true}/>
        <CCANavItem key={'Upload Table'} name={'Upload Table'} hidden={true}/>
        <CCANavItem key={'Choose Host'} name={'Choose Host'} hidden={true}/>
        <CCANavItem key={'Select Table'} name={'Select Table'} hidden={true}/>
        <CCANavItem key={'Select Columns'} name={'Select Columns'} />
        <CCANavItem key={'Name Model'} name={'Name Model'} />
      </ul>
  );
};
