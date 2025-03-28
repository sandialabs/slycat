/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";

/**
 * @member closingCallBack callback function for cleanup when closing the modal
 * @member title test for the top of the modal
 */
export interface ModalContentProps {
  modalId: string;
  closingCallBack: Function;
  title: string;
  footer?: React.ReactNode[] | undefined;
}

export const CCAModalContent = (props: React.PropsWithChildren<ModalContentProps>) => {
  const { modalId, closingCallBack, title, children, footer } = props;
  /**
   *close the modal and call the cleanup function
   * @memberof ModalContent
   */
  const handleCloseModal = React.useCallback(
    (e: React.MouseEvent): void => {
      ($("#" + modalId) as any).modal("hide");
      closingCallBack();
    },
    [modalId, closingCallBack],
  );

  return (
    <div>
      <div className="modal-header">
        <h3 className="modal-title">{title}</h3>
        <button type="button" className="close" aria-label="Close" onClick={handleCloseModal}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body" id="slycat-wizard">
        {children}
      </div>
      <div className="modal-footer">{footer}</div>
    </div>
  );
};
