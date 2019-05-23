'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const RemoteFileBrowser_tsx_1 = __importDefault(require("components/RemoteFileBrowser.tsx"));
const ProgressBar_1 = __importDefault(require("components/ProgressBar"));
const controls_button_1 = __importDefault(require("./controls-button"));
require("../../css/controls-button-var-options.css");
const file_selector_1 = require("./file-selector");
const slycat_web_client_1 = __importDefault(require("js/slycat-web-client"));
const slycat_file_uploader_factory_1 = __importDefault(require("js/slycat-file-uploader-factory"));
const SlycatRemoteControls_jsx_1 = __importDefault(require("components/SlycatRemoteControls.jsx"));
const ConnectButton_tsx_1 = __importDefault(require("components/ConnectButton.tsx"));
const NavBar_tsx_1 = __importDefault(require("components/NavBar.tsx"));
let initialState = {};
const localNavBar = ['Locate Data', 'Upload Table'];
const remoteNavBar = ['Locate Data', 'Choose Host', 'Select Table'];
class ControlsButtonUpdateTable extends react_1.Component {
    constructor(props) {
        super(props);
        this.cleanup = () => {
            this.setState(initialState);
        };
        this.closeModal = (e) => {
            this.cleanup();
            $('#' + this.state.modalId).modal('hide');
        };
        this.continue = () => {
            if (this.state.visible_tab === "0" && this.state.selectedOption === "local") {
                this.setState({ visible_tab: "1", selectedNameIndex: 1 });
            }
            else if (this.state.visible_tab === "0" && this.state.selectedOption === "remote") {
                this.setState({ visible_tab: "2", selectedNameIndex: 1 });
            }
            else if (this.state.visible_tab === "2") {
                this.setState({ visible_tab: "3", selectedNameIndex: 2 });
            }
        };
        this.back = () => {
            if (this.state.visible_tab === "1") {
                this.setState({ visible_tab: "0", selectedNameIndex: 0 });
            }
            else if (this.state.visible_tab === "2") {
                this.setState({ visible_tab: "0", selectedNameIndex: 0 });
            }
            else if (this.state.visible_tab === "3") {
                this.setState({ visible_tab: "2", selectedNameIndex: 1 });
            }
        };
        this.handleFileSelection = (selectorFiles) => {
            this.setState({ files: selectorFiles, disabled: false });
        };
        this.callBack = (newHostname, newUsername, newPassword, sessionExists) => {
            this.setState({
                hostname: newHostname,
                sessionExists: sessionExists,
                username: newUsername,
                password: newPassword
            });
        };
        this.sourceSelect = (e) => {
            this.setState({ selectedOption: e.target.value });
        };
        this.uploadFile = () => {
            if (this.state.selectedOption == "local") {
                this.uploadLocalFile();
            }
            else {
                this.uploadRemoteFile();
            }
        };
        this.uploadLocalFile = () => {
            let mid = this.props.mid;
            let pid = this.props.pid;
            this.setState({ progressBarHidden: false, disabled: true });
            slycat_web_client_1.default.get_model_command_fetch({ mid: mid, type: "parameter-image", command: "delete-table" })
                .then((json) => {
                this.setState({ progressBarProgress: 33 });
                let file = this.state.files[0];
                let fileObject = {
                    pid: pid,
                    mid: mid,
                    file: file,
                    aids: [["data-table"], file.name],
                    parser: this.state.parserType,
                    success: () => {
                        this.setState({ progressBarProgress: 75 });
                        slycat_web_client_1.default.post_sensitive_model_command_fetch({
                            mid: mid,
                            type: "parameter-image",
                            command: "update-table",
                            parameters: {
                                linked_models: json["linked_models"],
                            },
                        }).then(() => {
                            this.setState({ progressBarProgress: 100 });
                            this.closeModal();
                            location.reload();
                        });
                    }
                };
                slycat_file_uploader_factory_1.default.uploadFile(fileObject);
            });
        };
        this.uploadRemoteFile = () => {
            let mid = this.props.mid;
            let pid = this.props.pid;
            this.setState({ progressBarHidden: false, disabled: true });
            slycat_web_client_1.default.get_model_command_fetch({ mid: mid, type: "parameter-image", command: "delete-table" })
                .then((json) => {
                this.setState({ progressBarProgress: 33 });
                let file = this.state.files;
                const file_name = file.name;
                let fileObject = {
                    pid: pid,
                    hostname: this.state.hostname,
                    mid: mid,
                    paths: this.state.selected_path,
                    aids: [["data-table"], file_name],
                    parser: this.state.parserType,
                    progress_final: 90,
                    success: () => {
                        this.setState({ progressBarProgress: 75 });
                        slycat_web_client_1.default.post_sensitive_model_command_fetch({
                            mid: mid,
                            type: "parameter-image",
                            command: "update-table",
                            parameters: {
                                linked_models: json["linked_models"],
                            },
                        }).then(() => {
                            this.setState({ progressBarProgress: 100 });
                            this.closeModal();
                            location.reload();
                        });
                    }
                };
                slycat_file_uploader_factory_1.default.uploadFile(fileObject);
            });
        };
        this.onSelectFile = (selectedPath, selectedPathType, file) => {
            if (selectedPathType === 'f') {
                this.setState({ files: file, disabled: false, selected_path: selectedPath });
            }
            else {
                this.setState({ disabled: true });
            }
        };
        this.onSelectParser = (type) => {
            console.log(type);
            this.setState({ parserType: type });
        };
        this.connectButtonCallBack = (sessionExistsNew, loadingDataNew) => {
            this.setState({
                sessionExists: sessionExistsNew,
                loadingData: loadingDataNew
            }, () => {
                console.log(`updating with ${this.state.sessionExists}`);
                if (this.state.sessionExists) {
                    console.log('calling continue');
                    this.continue();
                }
            });
        };
        this.getFooterJSX = () => {
            let footerJSX = [];
            if (this.state.visible_tab != "0") {
                footerJSX.push(react_1.default.createElement("button", { key: 1, type: 'button', className: 'btn btn-light mr-auto', onClick: this.back }, "Back"));
            }
            if (this.state.visible_tab === "1" || this.state.visible_tab === "3") {
                footerJSX.push(react_1.default.createElement("button", { key: 2, type: 'button', disabled: this.state.disabled, className: 'btn btn-danger', onClick: this.uploadFile }, "Update Data Table"));
            }
            if (this.state.sessionExists != true && this.state.visible_tab === "2") {
                footerJSX.push(react_1.default.createElement(ConnectButton_tsx_1.default, { key: 3, text: "Continue", loadingData: this.state.loadingData, hostname: this.state.hostname, username: this.state.username, password: this.state.password, callBack: this.connectButtonCallBack }));
            }
            else if (this.state.visible_tab != "1" && this.state.visible_tab != "3") {
                footerJSX.push(react_1.default.createElement("button", { key: 4, type: 'button', className: 'btn btn-primary', onClick: this.continue }, "Continue"));
            }
            return footerJSX;
        };
        this.state = {
            modalId: "varUpdateTableModal",
            title: "Update Table",
            files: [new File([""], "filename")],
            disabled: true,
            progressBarHidden: true,
            progressBarProgress: 0,
            hostname: "",
            username: "",
            password: "",
            selectedOption: "local",
            visible_tab: "0",
            sessionExists: null,
            selected_path: "",
            loadingData: false,
            selectedNameIndex: 0,
            parserType: "slycat-csv-parser"
        };
        initialState = { ...this.state };
    }
    render() {
        return (react_1.default.createElement("div", null,
            react_1.default.createElement("div", { className: 'modal fade', "data-backdrop": 'false', id: this.state.modalId },
                react_1.default.createElement("div", { className: 'modal-dialog modal-lg' },
                    react_1.default.createElement("div", { className: 'modal-content' },
                        react_1.default.createElement("div", { className: 'modal-header' },
                            react_1.default.createElement("h3", { className: 'modal-title' }, this.state.title),
                            react_1.default.createElement("button", { type: 'button', className: 'close', onClick: this.closeModal, "aria-label": 'Close' }, "X")),
                        react_1.default.createElement("div", { className: 'modal-body', id: "slycat-wizard" },
                            this.state.selectedOption === 'local' ?
                                react_1.default.createElement(NavBar_tsx_1.default, { navNames: localNavBar, selectedNameIndex: this.state.selectedNameIndex }) :
                                react_1.default.createElement(NavBar_tsx_1.default, { navNames: remoteNavBar, selectedNameIndex: this.state.selectedNameIndex }),
                            this.state.visible_tab === "0" ?
                                react_1.default.createElement("form", { style: { marginLeft: '16px' } },
                                    react_1.default.createElement("div", { className: "form-check" },
                                        react_1.default.createElement("label", { className: "form-check-label", style: { marginRight: '92%' }, htmlFor: "radio1" },
                                            react_1.default.createElement("input", { type: "radio", className: "form-check-input", value: 'local', checked: this.state.selectedOption === 'local', onChange: this.sourceSelect }),
                                            "Local")),
                                    react_1.default.createElement("div", { className: "form-check" },
                                        react_1.default.createElement("label", { className: "form-check-label", style: { marginRight: '89.7%' }, htmlFor: "radio2" },
                                            react_1.default.createElement("input", { type: "radio", className: "form-check-input", value: 'remote', checked: this.state.selectedOption === 'remote', onChange: this.sourceSelect }),
                                            "Remote")))
                                : null,
                            this.state.visible_tab === "1" ?
                                react_1.default.createElement("div", { className: 'tab-content' },
                                    react_1.default.createElement("div", { className: "form-horizontal" },
                                        react_1.default.createElement(file_selector_1.FileSelector, { handleChange: this.handleFileSelection }),
                                        react_1.default.createElement("div", { className: "form-group row" },
                                            react_1.default.createElement("label", { className: "col-sm-1 col-form-label" }, "Filetype"),
                                            react_1.default.createElement("div", { className: "col-sm-10" },
                                                react_1.default.createElement("select", { className: "form-control", onChange: (e) => this.onSelectParser(e.target.value) },
                                                    react_1.default.createElement("option", { value: "slycat-csv-parser" }, "Comma separated values (CSV)"),
                                                    react_1.default.createElement("option", { value: "slycat-dakota-parser" }, "Dakota tabular")))))) : null,
                            this.state.visible_tab === "2" ?
                                react_1.default.createElement(SlycatRemoteControls_jsx_1.default, { loadingData: this.state.loadingData, callBack: this.callBack })
                                : null,
                            react_1.default.createElement("div", { className: 'slycat-progress-bar' },
                                react_1.default.createElement(ProgressBar_1.default, { hidden: this.state.progressBarHidden, progress: this.state.progressBarProgress })),
                            this.state.visible_tab === "3" ?
                                react_1.default.createElement(RemoteFileBrowser_tsx_1.default, { onSelectFileCallBack: this.onSelectFile, onSelectParserCallBack: this.onSelectParser, hostname: this.state.hostname }) :
                                null,
                            react_1.default.createElement("div", { className: 'modal-footer' }, this.getFooterJSX()))))),
            react_1.default.createElement(controls_button_1.default, { label: 'Update Table', title: this.state.title, data_toggle: 'modal', data_target: '#' + this.state.modalId, button_style: this.props.button_style, id: 'controls-button-death' })));
    }
}
exports.default = ControlsButtonUpdateTable;
//# sourceMappingURL=update-table.js.map