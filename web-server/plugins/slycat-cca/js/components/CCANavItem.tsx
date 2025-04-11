/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

interface CCANavItemProps {
  name: string;
  active?: boolean;
  hidden?: boolean;
}

export const CCANavItem = ({ name, active, hidden }: CCANavItemProps) => {
  const classNames = "nav-item" + (active ? " active": "");
  return (
    <li className={classNames} hidden={!!hidden}>
      <a className="nav-link">{name}</a>
    </li>
  );
};
