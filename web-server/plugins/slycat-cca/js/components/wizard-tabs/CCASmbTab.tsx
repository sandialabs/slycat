/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import * as React from "react";
import SmbAuthentication from "components/SmbAuthentication";
export const CCASmbTab = (props: { hidden?: boolean }) => {
  const { hidden = false } = props;
  const setSmbAuthValues = function (
    hostname: string,
    username: string,
    password: string,
    share: string,
    domain: string,
    session_exists: boolean,
    last_key: string,
  ) {
    console.log('values');
    console.log('hostname',hostname);
    console.log('username',username);
    console.log('password',password);
    console.log('share',share);
    console.log('domain',domain);
    console.log('session_exists',session_exists);
    //If the user hits enter key, try to connect
    if (last_key === "Enter") {
      console.log("enter");
      // component.connectSMB();
    }
  };

  return (
    <div hidden={hidden}>
      <SmbAuthentication loadingData={false} callBack={setSmbAuthValues} />
      SMB
    </div>
  );
};

// component.connectSMB = function () {
//     component.remote.enable(false);
//     component.remote.status_type("info");
//     component.remote.status("Connecting ...");

//     if (component.remote.session_exists()) {
//       component.smb_wizard_browse_root.render(
//         <div>
//           <RemoteFileBrowser
//             onSelectFileCallBack={onSelectTableFile}
//             onSelectParserCallBack={onSelectParserCallBack}
//             onReauthCallBack={onReauth}
//             hostname={component.remote.hostname()}
//             useSMB={true}
//             showSelector={false}
//           />
//         </div>,
//       );
//       component.tab(3);
//       component.remote.enable(true);
//       component.remote.status_type(null);
//       component.remote.status(null);
//     } else {
//       client
//         .post_remotes_smb_fetch({
//           user_name: component.remote.username().trim(),
//           password: component.remote.password(),
//           server: component.remote.hostname().trim(),
//           share: component.remote.share().trim(),
//         })
//         .then((response) => {
//           console.log("authenticated.", response);
//           if (response.ok) {
//             component.remote.session_exists(true);
//             component.remote.enable(true);
//             component.remote.status_type(null);
//             component.remote.status(null);
//             component.tab(3);
//             const smb_wizard_browse_root = createRoot(document.querySelector(".smb-wizard-browse"));
//             smb_wizard_browse_root.render(
//               <div>
//                 <RemoteFileBrowser
//                   onSelectFileCallBack={onSelectTableFile}
//                   onReauthCallBack={onReauth}
//                   hostname={component.remote.hostname()}
//                   useSMB={true}
//                   showSelector={false}
//                 />
//               </div>,
//             );
//           } else {
//             component.remote.enable(true);
//             component.remote.status_type("danger");
//             component.remote.focus("password");
//           }
//         })
//         .catch((error) => {
//           console.log("could not connect", error);
//           component.remote.enable(true);
//           component.remote.status_type("danger");
//           component.remote.status(reason_phrase);
//           component.remote.focus("password");
//         });
//     }
//   };
