import React from "react";
import ReactDOM from "react-dom";
import RemoteFileBrowser from 'components/RemoteFileBrowser.tsx'

const onSelectTableFile = () => {
    console.log("onSelecTableFile");
}

const onReauth = () => {
    console.log("onReauth");
}

const SMBWizard= () => {
    return (
        <div>
            SMB Wizard
            <RemoteFileBrowser
              onSelectFileCallBack={onSelectTableFile}
              onReauthCallBack={onReauth}
              hostname={'localhost'}
            />
        </div>
    )
}
ReactDOM.render(
    <SMBWizard />,
    document.querySelector(".smb-wizard")
  );
