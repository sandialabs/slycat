import React from "react";
import ProjectsList from "components/ProjectsList"
import { ModelsList } from 'components/ModelsList';

class SearchWrapper extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      initialItems: this.props.items,
      items: [],
      searchQuery: '',
    };
    this.filterList = this.filterList.bind(this);
    // console.log(this.props.items);
  }

  componentWillMount() {
      this.setState({items: this.state.initialItems});
  }

  filterList(e) {
    // console.log(`filter ${this}`);
    var updatedList = this.state.initialItems;
    var trimSearchQuery = e.target.value.trim();
    var lowerTrimSearchQuery = trimSearchQuery.toLowerCase();
    updatedList = updatedList.filter(function(item){
      // console.log('item: ' + item);
      return item.name.toLowerCase().search(lowerTrimSearchQuery) !== -1
             || item.description.toLowerCase().search(lowerTrimSearchQuery) !== -1
             // Why is this line here, it's identical to the previous one? Alex commenting out for now.
             // || item.description.toLowerCase().search(e.target.value.toLowerCase()) !== -1 
             ;
    });
    this.setState({items: updatedList, searchQuery: trimSearchQuery});
  };

  render() {

    let searchField = 
      <input className="form-control mb-3" 
        style={{width: '13rem'}}
        type="search" 
        placeholder={`Filter ${this.props.type}`} 
        aria-label={`Filter ${this.props.type}`} 
        onChange={this.filterList}
      />
    ;

    let message = '';

    // When there are no items returned but there are initial items
    if(this.props.items.length > 0 && this.state.items.length == 0)
    {
      message = 
        <div className="container">
          <div className="alert alert-warning" role="alert">
            <p>No {this.props.type} match the current search - <strong>{this.state.searchQuery}</strong></p>
            <p className="mb-0">Clear it to see all {this.props.type}, or change it to search again.</p>
          </div>
        </div>
      ;
    }
    // When there are no models (i.e., empty project)
    else if (this.props.items.length == 0 && this.props.type == 'models')
    {
      message = 
        <div className="container">
          <div className="alert alert-warning" role="alert">
              <p>There are no models in this project.</p>
              <p className="mb-0">You can add a model by using the Create menu above.</p>
          </div>
        </div>
      ;
      searchField = null;
    }
    // When there are no projects (i.e., empty site)
    else if (this.props.items.length == 0 && this.props.type == 'projects')
    {
      message = 
        <div className="container">
          <div className="alert alert-warning" role="alert">
              <p>There are no projects.</p>
              <p className="mb-0">You can add a project by using the Create menu above.</p>
          </div>
        </div>
      ;
      searchField = null;
    }

    let list = <ProjectsList projects={this.state.items} />
    if(this.props.type == 'models')
    {
      list = <ModelsList models={this.state.items} />
    }

    return (
      <React.Fragment>
        <div className="container pb-0">
          <div className="d-flex justify-content-between">
            <h3 className="px-4 text-capitalize">{this.props.type}</h3>
            {searchField}
          </div>
        </div>
        {list}
        {message}
      </React.Fragment>
    );
  }
}

export default SearchWrapper;