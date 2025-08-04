import * as React from "react";
import styles from "./RemoteFileBrowser.module.scss";
import { FileMetaData } from "./FileBrowserTypes";

interface FileBrowserTableProps {
  files: FileMetaData[];
  loading: boolean;
  selected: number;
  onSelectRow: (file: FileMetaData, index: number) => void;
  onDoubleClick: (file: FileMetaData) => void;
}

/**
 * Shared file table component for file browsers
 */
export default function FileBrowserTable(props: FileBrowserTableProps) {
  if (props.loading) {
    return (
      <button className="btn btn-primary" type="button" disabled>
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      </button>
    );
  }

  const fileRows = props.files.map((file, i) => (
    <tr
      className={props.selected === i ? "table-active" : ""}
      key={i}
      onClick={() => props.onSelectRow(file, i)}
      onDoubleClick={() => props.onDoubleClick(file)}
    >
      <td data-bind-fail="html:icon">
        {file.mimeType === "application/x-directory" ? (
          <span className="fa fa-folder"></span>
        ) : (
          <span className="fa fa-file-o"></span>
        )}
      </td>
      <td data-bind-fail="text:name">{file.name}</td>
      <td data-bind-fail="text:size">{file.size}</td>
      <td data-bind-fail="text:mtime">{file.mtime}</td>
    </tr>
  ));

  return (
    <div className={`${styles.fileTable} mb-3`}>
      <table className={`table table-hover table-sm ${styles.table}`}>
        <thead className="thead-light">
          <tr>
            <th></th>
            <th>Name</th>
            <th>Size</th>
            <th>Date Modified</th>
          </tr>
        </thead>
        <tbody>{fileRows}</tbody>
      </table>
    </div>
  );
}
