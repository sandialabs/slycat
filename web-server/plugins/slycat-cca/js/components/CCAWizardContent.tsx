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
  closingCallBack: () => void;
  title: string;
  footer?: React.ReactNode[] | undefined;
}

export const CCAModalContent = (props: React.PropsWithChildren<ModalContentProps>) => {
  const { modalId, closingCallBack, title, children, footer } = props;
  const myModalEl = document.getElementById(modalId);
  /**
   *close the modal and call the cleanup function
   * @memberof ModalContent
   */
  const handleCloseModal = React.useCallback(
    (): void => {
      $("#" + modalId).modal("hide");
      closingCallBack();
      // cleanup
      myModalEl?.removeEventListener("hidden.bs.modal", handleCloseModal);
    },
    [modalId, closingCallBack, myModalEl],
  );
  myModalEl?.addEventListener("hidden.bs.modal", handleCloseModal);
  return (
    <div>
      <div className="modal-header" data-bs-keyboard="false">
        <h3 className="modal-title">{title}</h3>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          data-bs-dismiss="modal"
          onClick={handleCloseModal}
        ></button>
      </div>
      <div className="modal-body" id="modalId">
        {children}
      </div>
      <div className="modal-footer">{footer}</div>
    </div>
  );
};
