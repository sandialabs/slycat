import React from "react";
import { createRoot } from "react-dom/client";
import SmbRemoteFileBrowser from "components/SmbRemoteFileBrowser.tsx";
import ModalContent from "components/ModalContent.tsx";
import client from "js/slycat-web-client";

let userName = "";
let password = "";

const b64EncodeUnicode = (str) => {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode("0x" + p1);
    })
  );
};

let encodedUserName = b64EncodeUnicode(userName);
let encodedPassword = b64EncodeUnicode(password);

alert("Authenticating");
client
  .post_remotes_smb_fetch({
    user_name: encodedUserName,
    password: encodedPassword,
    server: "",
    share: "",
  })
  .then(() => {
    console.log("Woot authenticated.");
  });

const onSelectTableFile = () => {
  console.log("onSelecTableFile");
};

const onReauth = () => {
  console.log("onReauth");
};

const cleanup = () => {
  console.log("Woo, cleaned.");
};

const getFooterJsx = () => {
  let footerJSX = [];
  footerJSX.push(<button>Continue</button>);
  return footerJSX;
};

const getBodyJsx = () => {
  return (
    <div>
      SMB Wizard
      <SmbRemoteFileBrowser
        onSelectFileCallBack={onSelectTableFile}
        onReauthCallBack={onReauth}
        hostname={""}
      />
    </div>
  );
};

const SMBWizard = () => {
  return (
    // <div>
    //     SMB Wizard
    //     <RemoteFileBrowser
    //       onSelectFileCallBack={onSelectTableFile}
    //       onReauthCallBack={onReauth}
    //       hostname={'localhost'}
    //     />
    // </div>
    <div id="myModal" className="modal fade">
      <div className="modal-dialog">
        <div className="modal-content">
          <ModalContent
            modalId={"slycat-wizard"}
            closingCallBack={cleanup()}
            title={"Timeseries Wizard"}
            body={getBodyJsx()}
            footer={getFooterJsx()}
          />
        </div>
      </div>
    </div>
  );
};

const smb_wizard_root = createRoot(document.querySelector(".smb-wizard"));
smb_wizard_root.render(<SMBWizard />);

// For testing purposes
$(document).ready(function () {
  $("#myModal").modal("show");
});
