import { ModelsList } from "components/Models/ModelsList";
import ProjectsList from "components/Projects/ProjectsList";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import Icon from "components/Icons/Icon";
import { faArrowDownWideShort } from "@fortawesome/free-solid-svg-icons";
import { faArrowDownShortWide } from "@fortawesome/free-solid-svg-icons";

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
 * @param sortFields list of fields that can be used to sort
 * @param sortField current field used to sort
 * @param sortDescending sort descending (true) or ascending (false)
 * @param two_columns one or two columns
 */
export interface SearchWrapperState {
  initialItems: Item[];
  items: Item[];
  searchQuery: string;
  sortFields: Dict<string>[];
  sortField: string;
  sortDescending: boolean;
  two_columns: boolean;
}

/**
 * @param {name} string name
 * @param {description} string description
 * @param {creator} name of the creator as string
 * @param {created} string representation of date created
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
    var basicSortFields = [{key: 'created', type: 'string', label: 'Created'},
                           {key: 'creator', type: 'string', label: 'Creator'},
                           {key: 'description', type: 'string', label: 'Description'},
                           {key: 'marking', type: 'string', label: 'Marking'},
                           {key: 'model-type', type: 'string', label: 'Model Type'},
                           {key: 'name', type: 'string', label: 'Name'}];

    this.state = {
      initialItems: this.props.items,
      items: [],
      searchQuery: "",
      sortFields: basicSortFields,
      sortField: 'created',
      sortDescending: true,
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
        updatedList, this.state.sortField, this.state.sortDescending);

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
   * creates the one/two column button field
   *
   * @memberof SearchWrapper
   */
  private readonly getColumnField = (): JSX.Element | null => {
    return this.props.items.length > 0 ? (
      <button
        className="btn btn-sm bb-transparent mb-3 me-2"
        data-bs-toggle="button"
        title="Toggle between one and two column model list"
        type="button"
        onClick={() => this.changeColumnState()}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>
    ) : null;
  };

  // sort list (do not update state)
  private readonly sortState = 
    (currList: Item[], sortField: string, sortDescending: boolean): JSX.Element | null => {

    // get type of data to sort
    const sortFieldType = this.state.sortFields.find(field => field.key === sortField)['type']
  
    // sort by string
    if (sortFieldType === 'string') {
        const updatedList = [...currList].sort((a,b) => sortDescending ?
          b[sortField].localeCompare(a[sortField]) :
          a[sortField].localeCompare(b[sortField]));
        return updatedList;
  
    } else if (sortFieldType === 'numeric') {
      console.log('numeric sort');
      return currList;
    }
  };

  // sort current items
  private readonly changeSortState = 
    (newSortField: string, sortDescending: boolean): JSX.Element | null => {

    // sort list
    this.setState((prevState) => {
      const updatedList = this.sortState(prevState.items, newSortField, sortDescending);
      return { items: updatedList, sortField: newSortField, sortDescending: sortDescending };
    });

  };

  /**
   * creates the sort select field
   *
   * @memberof SearchWrapper
   */
  private readonly getSortField = (): JSX.Element | null => {

    // get fields to sort by
    var options = this.state.sortFields;

    return this.props.items.length > 0 ? (
      <div className="input-group">
        
        <select
          name="Sort"
          title="Sort models by metadata"
          className="form-select mb-3 me-2"
          onChange={(e) => this.changeSortState(e.target.value, this.state.sortDescending)}
        >
          {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
          ))}
        
        </select>

      </div>
    ) : null;
  };

  // set sort descending
  private readonly setSortDescending = (): JSX.Element | null => {
    this.changeSortState(this.state.sortField, true);
  }

  // set sort ascending
  private readonly setSortAscending = (): JSX.Element | null => {
    this.changeSortState(this.state.sortField, false);
  }

  /**
   * creates the sort ascending/descending field
   *
   * @memberof SearchWrapper
   */
  private readonly getSortDirectionField = (): JSX.Element | null => {

    return this.props.items.length > 0 ? (
      <div className="input-group">
    
        <button className={this.state.sortDescending ? 
                           "active btn btn-sm bg-transparent mb-3" :
                           "btn btn-sm bg-transparent mb-3" }
          type="button" title="Sort Descending"
          onClick={() => this.setSortDescending()}
          >
          <FontAwesomeIcon icon={faArrowDownWideShort} />
        </button>
        
        <button className={this.state.sortDescending ?
                           "btn btn-sm bg-transparent mb-3 me-2" :
                           "active btn btn-sm bg-transparent mb-3 me-2"}
          type="button" title="Sort Ascending"
          onClick={() => this.setSortAscending()}
          >
         <FontAwesomeIcon icon={faArrowDownShortWide} />
        </button>

      </div>
    ) : null;
  };

  /**
   * creates the delete button field
   *
   * @memberof SearchWrapper
   */
  private readonly getDeleteField = (): JSX.Element | null => {
    return this.props.items.length > 0 ? (
      <button
        type="button"
        className="btn btn-sm btn-outline-danger mb-3 ms-2"
        //name={id}
        //onClick={(e) => delete_model(name, id, e)}
        title="Delete selected models"
      >
        <Icon type="trash-can" />
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
              {this.props.type === "models" ? this.getSortField() : null}
              {this.props.type === "models" ? this.getSortDirectionField() : null}
              {this.props.type === "models" ? this.getColumnField() : null}
              {this.getSearchField()}
              {this.props.type === "models" ? this.getDeleteField() : null}
            </div>
          </div>
        </div>
        {this.getList()}
        {this.getMessage()}
      </div>
    );
  }
}
