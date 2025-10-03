/* eslint-disable no-underscore-dangle */
import React from "react";

import client from "js/slycat-web-client.js";
import Model from "./Model";
import Spinner from "../Spinner";

/**
 * @param items list of item objects
 * @param type string type
 */
export interface ModelsListProps {
  models: any[];
}
/**
 * @param markings
 */
export interface ModelsListState {
  markings: any;
}

export class ModelsList extends React.Component<ModelsListProps, ModelsListState> {
  private _asyncRequest: any | null | undefined;

  public constructor(props: ModelsListProps) {
    super(props);
    this.state = {
      markings: null,
    };
  }

  public componentDidMount() {
    // For testing purposes, to simulate a slow network, uncomment this setTimeout
    // setTimeout( () => {
    this._asyncRequest = client
      .get_configuration_markings_fetch()
      .then((markings: any) => {
        this._asyncRequest = null;
        this.setState({ markings });
      })
      .catch((e: any) => {
        console.log(e);
      });
    // For testing purposes, to simulate a slow network, uncomment this setTimeout
    // }, 10000);
  }

  public componentWillUnmount() {
    if (this._asyncRequest) {
      this._asyncRequest.cancel();
    }
  }

  public render() {
    if (this.state.markings === null) {
      // Render loading state ...
      return <Spinner />;
    }
    // Render real UI ...
    const models = this.props.models.map((model) => {
      return (
        <Model
          name={model.name}
          key={model._id}
          id={model._id}
          description={model.description}
          created={model.created}
          creator={model.creator}
          model_type={model["model-type"]}
          marking={model.marking}
          markings={this.state.markings}
          message={model.message}
          result={model.result}
        />
      );
    });

    if (models.length > 0) {
      return (
        <div className="container pt-0">
          <div className="row row-cols-2 g-5">{models}</div>
        </div>
      );
    }
    return null;
  }
}
