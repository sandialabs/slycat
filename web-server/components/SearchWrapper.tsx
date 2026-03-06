import { ModelsList } from "components/Models/ModelsList";
import ProjectsList from "components/Projects/ProjectsList";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faColumns } from "@fortawesome/free-solid-svg-icons";

/**
 * @param items list of item objects
 * @param type string type
 */
export interface SearchWrapperProps {
  items: Item[];
  type: string;
}

/**
 * @param initialItems list of Item objects
 * @param items list of Item objects
 * @param searchQuery string to regex on
 * @param two_columns one or two columns
 */
export interface SearchWrapperState {
  initialItems: Item[];
  items: Item[];
  searchQuery: string;
  two_columns: boolean;
}
/**
 * @param {name} string name
 * @param {description} string description
 * @param {cretor} name of the creator as string
 * @param {created} string representation of date created
 * @interface Item
 */
interface Item {
  name: string;
  description: string;
  creator: string;
  created: string;
}

/**
 * class that filters on item objects and search term, switches between one and two columns
 */
// eslint-disable-next-line import/no-default-export
export default class SearchWrapper extends React.Component<SearchWrapperProps, SearchWrapperState> {
  public constructor(props: SearchWrapperProps) {
    super(props);
    this.state = {
      initialItems: this.props.items,
      items: [],
      searchQuery: "",
      two_columns: true,
    };
  }

  public componentDidMount() {
    this.setState((prevState) => ({ items: prevState.initialItems }));
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
      return { items: updatedList, searchQuery: trimSearchQuery };
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
        className="form-control mb-3"
        style={{ width: "13rem" }}
        type="search"
        placeholder={`Filter ${this.props.type}`}
        aria-label={`Filter ${this.props.type}`}
        onChange={(e) => this.filterList(e.target.value.trim().toLowerCase())}
      />
    ) : null;
  };

  // toggle between one and two columns
  private readonly changeColumnState = (): JSX.Element | null => {
    this.setState((prevState) => {return {two_columns: !prevState.two_columns}})
  }

  /**
   * creates the one/two column input field
   *
   * @memberof SearchWrapper
   */
    private readonly getColumnField = (): JSX.Element | null => {
      return this.props.items.length > 0 ? (
        <button
          className="btn btn-light mb-3 me-2"
          title="Toggle between one and two column model list."
          type="button"
          onClick={() => this.changeColumnState()}
        >
         <FontAwesomeIcon icon={faColumns} />
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
      <ModelsList models={this.state.items} two_columns={this.state.two_columns}/>
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
    return (
      <div>
        <div className="container mt-4">
          <div className="d-flex justify-content-between">
            <h3 className="pe-4 text-capitalize">{this.props.type}</h3>
            <div className="btn-toolbar me-2">
              {this.getColumnField()}
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
