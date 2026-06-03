import { ModelsList } from "components/Models/ModelsList";
import ProjectsList from "components/Projects/ProjectsList";
import ControlsButtonToggle from "components/ControlsButtonToggle";
import React, { type JSX } from "react";
import Icon from "components/Icons/Icon";
import { useDropdownMenuHeight } from "hooks/useDropdownMenuHeight";
import * as dialog from "js/slycat-dialog";
import client from "js/slycat-web-client.js";
import styles from "./SearchWrapper.module.scss";

const MODELS_LIST_UI_STORAGE_PREFIX = "slycat:modelsListUi:v1:";

interface PersistedModelsListUi {
  sortField: string;
  sortDescending: boolean;
  two_columns: boolean;
}

function loadPersistedModelsListUi(
  scope: string | undefined,
  validSortFieldKeys: string[],
): Partial<PersistedModelsListUi> | null {
  if (!scope || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(MODELS_LIST_UI_STORAGE_PREFIX + scope);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<PersistedModelsListUi> = {};
    if (typeof data.sortField === "string" && validSortFieldKeys.includes(data.sortField)) {
      out.sortField = data.sortField;
    }
    if (typeof data.sortDescending === "boolean") {
      out.sortDescending = data.sortDescending;
    }
    if (typeof data.two_columns === "boolean") {
      out.two_columns = data.two_columns;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function savePersistedModelsListUi(scope: string | undefined, data: PersistedModelsListUi): void {
  if (!scope || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(MODELS_LIST_UI_STORAGE_PREFIX + scope, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

interface SearchModelsSortDropdownProps {
  sortFields: Array<{ key: string; label: string }>;
  sortField: string;
  sortDescending: boolean;
  onChangeSortField: (key: string) => void;
  onChangeSortDescending: (sortDescending: boolean) => void;
}

/**
 * Sort-by field and order as a Bootstrap dropdown (toolbar), with scrollable menu height like other Slycat dropdowns.
 */
const SearchModelsSortDropdown: React.FC<SearchModelsSortDropdownProps> = ({
  sortFields,
  sortField,
  sortDescending,
  onChangeSortField,
  onChangeSortDescending,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  useDropdownMenuHeight(menuRef as React.RefObject<HTMLElement>);

  const currentLabel = sortFields.find((f) => f.key === sortField)?.label ?? "—";
  const orderWord = sortDescending ? "descending" : "ascending";

  return (
    <div className="dropdown btn-group">
      <button
        type="button"
        id="search-models-sort-dropdown"
        className="btn dropdown-toggle btn-sm btn-slycat-controls"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title={`Sort models by metadata. Current: ${currentLabel}, ${orderWord} order.`}
      >
        Sort: {currentLabel}&nbsp;
      </button>
      <div
        ref={menuRef}
        className="dropdown-menu"
        aria-labelledby="search-models-sort-dropdown"
      >
        {sortFields.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`dropdown-item${option.key === sortField ? " active" : ""}`}
            onClick={() => onChangeSortField(option.key)}
          >
            {option.label}
          </button>
        ))}
        <div className="dropdown-divider" role="separator" />
        <h6 className="dropdown-header">Order</h6>
        <button
          type="button"
          className={`dropdown-item${!sortDescending ? " active" : ""}`}
          onClick={() => onChangeSortDescending(false)}
        >
          <Icon type="arrow-down-short-wide" className="me-1" />
          Ascending
        </button>
        <button
          type="button"
          className={`dropdown-item${sortDescending ? " active" : ""}`}
          onClick={() => onChangeSortDescending(true)}
        >
          <Icon type="arrow-down-wide-short" className="me-1" />
          Descending
        </button>
      </div>
    </div>
  );
};

/**
 * @param items list of item objects
 * @param type string type
 */
export interface SearchWrapperProps {
  items: Item[];
  type: string;
  /**
   * When `type` is `"models"`, identifies where to persist sort & column layout (e.g. project id).
   */
  persistenceScope?: string;
}

/**
 * @param initialItems list of Item objects
 * @param items list of Item objects
 * @param searchQuery string to regex on
 * @param sortFields list of fields that can be used to sort
 * @param sortField current field used to sort
 * @param sortDescending sort descending (true) or ascending (false)
 * @param two_columns one or two columns
 * @param models_selected list of selected models (by id)
 */
export interface SearchWrapperState {
  initialItems: Item[];
  items: Item[];
  searchQuery: string;
  sortFields: Dict<string>[];
  sortField: string;
  sortDescending: boolean;
  two_columns: boolean;
  models_selected: string[];
}

/**
 * @param {name} string name
 * @param {description} string description
 * @param {creator} name of the creator as string
 * @param {created} string representation of date
 * @param {marking} string marking
 * @param {model_type} string type of model
 * @interface Item
 */
interface Item {
  name: string;
  description: string;
  creator: string;
  created: string;
  marking: string;
  model_type: string;
}

/**
 * class that filters on item objects and search term, switches between one and two columns
 */
// eslint-disable-next-line import/no-default-export
export default class SearchWrapper extends React.Component<SearchWrapperProps, SearchWrapperState> {
  public constructor(props: SearchWrapperProps) {
    super(props);

    // basic included sort fields (keys should all be distinct)
    const basicSortFields = [
      { key: "created", type: "string", label: "Created" },
      { key: "creator", type: "string", label: "Creator" },
      { key: "description", type: "string", label: "Description" },
      { key: "marking", type: "string", label: "Marking" },
      { key: "model-type", type: "string", label: "Model Type" },
      { key: "name", type: "string", label: "Name" },
    ];

    // check for DAC models
    var dac_model = false;
    for (let i = 0; i < this.props.items.length; i++) {
      if (this.props.items[i]["model-type"] === "DAC") {
        if ("artifact:dac-outlier-summary" in this.props.items[i]) {
          dac_model = true;
        }
      }
    }

    // if DAC models are present, add outlier field
    if (dac_model) {
      basicSortFields.push({
        key: "artifact:dac-outlier-summary",
        type: "numeric",
        label: "Outlier",
      });
    }

    const validSortFieldKeys = basicSortFields.map((f) => f.key);
    const persisted =
      props.type === "models" && props.persistenceScope
        ? loadPersistedModelsListUi(props.persistenceScope, validSortFieldKeys)
        : null;
    const sortField =
      persisted?.sortField && validSortFieldKeys.includes(persisted.sortField)
        ? persisted.sortField
        : "created";
    const sortDescending =
      typeof persisted?.sortDescending === "boolean" ? persisted.sortDescending : true;
    const two_columns = typeof persisted?.two_columns === "boolean" ? persisted.two_columns : true;

    this.state = {
      initialItems: this.props.items,
      items: [],
      searchQuery: "",
      sortFields: basicSortFields,
      sortField,
      sortDescending,
      two_columns,
      models_selected: [],
    };
  }

  public componentDidMount() {
    this.setState((prevState) => ({
      items: this.sortState(prevState.initialItems, prevState.sortField, prevState.sortDescending),
    }));
  }

  private persistModelsListUiFromState(): void {
    if (this.props.type !== "models" || !this.props.persistenceScope) {
      return;
    }
    savePersistedModelsListUi(this.props.persistenceScope, {
      sortField: this.state.sortField,
      sortDescending: this.state.sortDescending,
      two_columns: this.state.two_columns,
    });
  }

  /**
   * match two strings
   *
   * @param string
   * @param string
   * @returns boolean true if they match
   * @memberof SearchWrapper
   */
  // eslint-disable-next-line class-methods-use-this
  public matchStrings = (stringOne: string, stringTwo: string): boolean => {
    return stringOne.toLowerCase().search(stringTwo.toLowerCase()) !== -1;
  };

  /**
   * @param string that has been trimmed to use as a matcher
   *
   * @memberof SearchWrapper
   */
  private readonly filterList = (trimSearchQuery: string): void => {
    this.setState((prevState) => {
      // filter initial items
      const updatedList = prevState.initialItems.filter(
        ({ name, description, creator, created }) => {
          return (
            this.matchStrings(name, trimSearchQuery) ||
            this.matchStrings(description, trimSearchQuery) ||
            this.matchStrings(creator, trimSearchQuery) ||
            this.matchStrings(created, trimSearchQuery)
          );
        },
      );

      // sort filtered list
      const sortedUpdatedList = this.sortState(
        updatedList,
        prevState.sortField,
        prevState.sortDescending,
      );

      return { items: sortedUpdatedList, searchQuery: trimSearchQuery };
    });
  };

  /**
   * creates the search input field
   *
   * @memberof SearchWrapper
   */
  private readonly getSearchField = (): JSX.Element | null => {
    return this.props.items.length > 0 ? (
      <input
        className={`form-control form-control-sm ${styles.filterSearchInput}`}
        style={{ width: "13rem" }}
        type="search"
        placeholder={`Filter ${this.props.type}...`}
        aria-label={`Filter ${this.props.type}...`}
        onChange={(e) => this.filterList(e.target.value.trim().toLowerCase())}
      />
    ) : null;
  };

  // toggle between one and two columns (toolbar control)
  private readonly toggleTwoColumnLayout = (_event: React.MouseEvent<HTMLButtonElement>): void => {
    this.setState(
      (prevState) => ({ two_columns: !prevState.two_columns }),
      () => this.persistModelsListUiFromState(),
    );
  };

  /**
   * creates the one/two column button field
   *
   * @memberof SearchWrapper
   */
  private readonly getColumnField = (): JSX.Element | null => {
    return this.props.items.length > 0 ? (
      <>
        <ControlsButtonToggle
          button_style="btn-slycat-controls"
          active={this.state.two_columns}
          id="search-models-column-toggle-two"
          title="Two-column model list"
          iconType="text-columns"
          toggle_active_state={this.toggleTwoColumnLayout}
        />
        <ControlsButtonToggle
          button_style="btn-slycat-controls"
          active={!this.state.two_columns}
          id="search-models-column-toggle"
          title="Single-column model list"
          iconType="layout-three-columns"
          rotation={90}
          toggle_active_state={this.toggleTwoColumnLayout}
        />
      </>
    ) : null;
  };

  // sort list (do not update state)
  private readonly sortState = (
    currList: Item[],
    sortField: string,
    sortDescending: boolean,
  ): Item[] => {
    // get type of data to sort
    const sortFieldType = this.state.sortFields.find((field) => field.key === sortField)["type"];

    // sort by string
    if (sortFieldType === "string") {
      const updatedList = [...currList].sort((a, b) =>
        sortDescending
          ? b[sortField].localeCompare(a[sortField])
          : a[sortField].localeCompare(b[sortField]),
      );
      return updatedList;
    }
    if (sortFieldType === "numeric") {
      const updatedList = [...currList].sort((a, b) =>
        sortDescending
          ? (sortField in b ? b[sortField] : 0) - (sortField in a ? a[sortField] : 0)
          : (sortField in a ? a[sortField] : 0) - (sortField in b ? b[sortField] : 0),
      );
      return updatedList;
    }
    return currList;
  };

  // sort current items
  private readonly changeSortState = (newSortField: string, sortDescending: boolean): void => {
    this.setState(
      (prevState) => {
        const updatedList = this.sortState(prevState.items, newSortField, sortDescending);
        return { items: updatedList, sortField: newSortField, sortDescending };
      },
      () => this.persistModelsListUiFromState(),
    );
  };

  /**
   * Sort-by field (Bootstrap dropdown)
   *
   * @memberof SearchWrapper
   */
  private readonly getSortField = (): JSX.Element | null => {
    return this.props.items.length > 0 ? (
      <SearchModelsSortDropdown
        sortFields={this.state.sortFields as Array<{ key: string; label: string }>}
        sortField={this.state.sortField}
        sortDescending={this.state.sortDescending}
        onChangeSortField={(key) => this.changeSortState(key, this.state.sortDescending)}
        onChangeSortDescending={(desc) => this.changeSortState(this.state.sortField, desc)}
      />
    ) : null;
  };

  // select a model
  private selectModel(mid: string, e: React.SyntheticEvent) {
    e.stopPropagation();

    // check if model is already selected
    if (this.isModelSelected(mid)) {
      // if so, unselect model
      this.setState((prevState) => {
        const updatedSelection = prevState.models_selected.filter((id) => id !== mid);
        return { models_selected: updatedSelection };
      });
    } else {
      // add to selected models and re-render
      this.setState((prevState) => {
        const updatedSelection = [...prevState.models_selected, mid];
        return { models_selected: updatedSelection };
      });
    }
  }

  // check if model is already selected
  private isModelSelected(mid: string) {
    return this.state.models_selected.indexOf(mid) > -1;
  }

  // delete models selected
  private delete_models() {
    const models_selected = this.state.models_selected;
    const n = models_selected.length;
    if (n === 0) {
      return;
    }

    dialog.dialog({
      title: `Delete ${n} Selected ${n === 1 ? "Model" : "Models"}?`,
      message:
        n === 1
          ? "The selected model will be deleted immediately. This action cannot be undone."
          : `The ${n} selected models will be deleted immediately. This action cannot be undone.`,
      buttons: [
        { className: "btn-light", label: "Cancel" },
        { className: "btn-danger", label: "Delete" },
      ],
      callback(button: any) {
        if (button?.label !== "Delete") {
          return;
        }
        const deleteNext = (index: number) => {
          if (index >= models_selected.length) {
            location.reload();
            return;
          }
          client.delete_model({
            mid: models_selected[index],
            success: () => {
              deleteNext(index + 1);
            },
            error: () => {
              console.error("delete_model failed");
              dialog.dialog({
                title: "Delete failed",
                message:
                  "Deleting one or more models failed. Reload the page to see which models still exist.",
                buttons: [{ className: "btn-primary", label: "OK" }],
              });
            },
          });
        };
        deleteNext(0);
      },
    });
  }

  /**
   * creates the delete button field
   *
   * @memberof SearchWrapper
   */
  private readonly getDeleteField = (): JSX.Element | null => {
    const n = this.state.models_selected.length;
    return this.props.items.length > 0 && n > 0 ? (
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={(e) => this.delete_models()}
      >
        <Icon type="trash-can" className="me-1" />
        Delete {n} Selected {n === 1 ? "Model" : "Models"}
      </button>
    ) : null;
  };

  /**
   * populate the model or projects list depending on the type passed to props
   *
   * @memberof SearchWrapper
   */
  private readonly getList = (): JSX.Element => {
    return this.props.type === "models" ? (
      <ModelsList
        models={this.state.items}
        two_columns={this.state.two_columns}
        isSelected={this.isModelSelected.bind(this)}
        onSelect={this.selectModel.bind(this)}
      />
    ) : (
      <ProjectsList projects={this.state.items as any} />
    );
  };

  /**
   * formats the message display to display when the list are empty
   *
   * @memberof SearchWrapper
   */
  private readonly getMessage = (): JSX.Element | null => {
    let message: JSX.Element[] | null = null;
    // When there are no items returned but there are initial items
    if (this.props.items.length > 0 && this.state.items.length === 0) {
      message = [
        <p key={1}>
          No {this.props.type} match the current search - <strong>{this.state.searchQuery}</strong>
        </p>,
        <p key={2} className="mb-0">
          Clear it to see all {this.props.type}, or change it to search again.
        </p>,
      ];
    }
    // When there are no models (i.e., empty project)
    else if (this.props.items.length === 0 && this.props.type === "models") {
      message = [
        <p key={1}>There are no models in this project.</p>,
        <p key={2} className="mb-0">
          You can add a model by using the Create menu above.
        </p>,
      ];
    }
    // When there are no projects (i.e., empty site)
    else if (this.props.items.length === 0 && this.props.type === "projects") {
      message = [
        <p key={1}>There are no projects.</p>,
        <p key={2} className="mb-0">
          You can add a project by using the Create menu above.
        </p>,
      ];
    }
    return message ? (
      <div className="container">
        <div className="alert alert-warning" role="alert">
          {message}
        </div>
      </div>
    ) : null;
  };

  public render() {
    const isModels = this.props.type === "models";
    return (
      <div className="SearchWrapper">
        <div className="container mt-4">
          <div className="d-flex justify-content-between">
            <h3 className="pe-4 text-capitalize">{this.props.type}</h3>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {isModels ? (
                <>
                  {this.getDeleteField()}
                  <div className="btn-group" role="group" aria-label="Sort and column layout">
                    {this.getSortField()}
                    {this.getColumnField()}
                  </div>
                </>
              ) : null}
              {this.getSearchField()}
            </div>
          </div>
        </div>
        {this.getList()}
        {this.getMessage()}
      </div>
    );
  }
}
