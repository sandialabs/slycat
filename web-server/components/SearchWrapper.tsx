import { ModelsList } from "components/ModelsList";
import ProjectsList from "components/ProjectsList";
import React from "react";

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
 */
export interface SearchWrapperState {
  initialItems: Item[];
  items: Item[];
  searchQuery: string;
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
 * class that filters on item objects and search term
 */
// eslint-disable-next-line import/no-default-export
export default class SearchWrapper extends React.Component<SearchWrapperProps, SearchWrapperState> {
  public constructor(props: SearchWrapperProps) {
    super(props);
    this.state = {
      initialItems: this.props.items,
      items: [],
      searchQuery: "",
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

  /**
   * populate the model or projects list depending on the type passed to props
   *
   * @memberof SearchWrapper
   */
  private readonly getList = (): JSX.Element => {
    return this.props.type === "models" ? (
      <ModelsList models={this.state.items} />
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
        <div className="container pb-0">
          <div className="d-flex justify-content-between">
            <h3 className="pe-4 text-capitalize">{this.props.type}</h3>
            {this.getSearchField()}
          </div>
        </div>
        {this.getList()}
        {this.getMessage()}
      </div>
    );
  }
}
