import * as React from "react";

/**
 * @member modalId string dom id for the modal
 * @member closingCallBack callback function for cleanup when closing the modal
 * @member title test for the top of the modal
 */
export interface ModalLargeProps {
  modalId: string
  closingCallBack:Function
  title: string
  body: JSX.Element
  footer: JSX.Element
}

/**
 * not used
 */
export interface ModalLargeState {
}

/**
 * takes a list of messages to be displayed as a warning
 */
export default class ModalLarge  extends React.Component<ModalLargeProps,ModalLargeState> {
  public constructor(props:ModalLargeProps) {
    super(props);
    this.state = {
    }
  }

  /**
   *close the modal and call the cleanup function
   *
   * @memberof ModalLarge
   */
  closeModal = (e: React.MouseEvent): void =>
  {
    this.props.closingCallBack();
    ($('#' + this.props.modalId) as any).modal('hide');
  };

  render () {
    return(
      <div className='modal fade' data-bs-backdrop='false' id={this.props.modalId}>
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h3 className='modal-title'>{this.props.title}</h3>
              <button type='button' className='close' aria-label='Close' onClick={this.closeModal}>
                <span aria-hidden='true'>&times;</span>
              </button>
            </div>
            <div className='modal-body' id="slycat-wizard">
              {this.props.body}
            </div>
            <div className='modal-footer'>
              {this.props.footer}
            </div>
          </div>
        </div>
      </div>
    );
  }
}