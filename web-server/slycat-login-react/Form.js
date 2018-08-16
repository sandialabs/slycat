/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React, { Component } from 'react';
import URI from 'urijs';
import "css/namespaced-bootstrap.less";
import './styles.css';
import api_root from 'js/slycat-api-root';

class Form extends Component {

	constructor(props) {
		super(props);
		this.state = {credentials:
				{username: '',
				 password: ''
		}};
		this.changeUsername = this.changeUsername.bind(this);
		this.changePassword = this.changePassword.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.b64EncodeUnicode = this.b64EncodeUnicode.bind(this);
	}

	changeUsername(event) {
		const credentials = this.state.credentials;
		credentials.username = event.target.value;
		this.setState({credentials: credentials});
	}

	changePassword(event) {
		const credentials = this.state.credentials;
		credentials.password = event.target.value;
		this.setState({credentials: credentials});
	}

	b64EncodeUnicode(str) {
	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
		return String.fromCharCode('0x' + p1);
	}));
}

	handleSubmit(event) {
		console.log('Username: ' + this.state.credentials.username);
		console.log('Password: ' + this.state.credentials.password);

		var user_name = this.b64EncodeUnicode(this.state.credentials.username);
		var password = this.b64EncodeUnicode(this.state.credentials.password);

		var url = URI(api_root + "login");
		var sendInfo = JSON.stringify({
			"user_name": user_name,
			"password": password,
			"location": window.location
		});

		fetch(url, {
			credentials: 'same-origin',
			method: 'POST',
			body: sendInfo,
			headers: new Headers({
				'Content-Type': 'application/json'
			})
		}).then(res => res.json())
			.catch(error => console.error('Error:', error))
			.then(
				response => {
					console.log('response.target is ' + response.target);
					window.location.replace(response.target);
				}
			);

		event.preventDefault();
	}

	render() {
		return (
		<div className="component-login-form">
			<form className="form-signin" onSubmit={this.handleSubmit}>
				<label htmlFor="username" className="sr-only"></label>
				<input id="username" className="form-control" placeholder="Username" required type="text" value={this.state.credentials.username} onChange={this.changeUsername} />

				<label htmlFor="password" className="sr-only"></label>
				<input id="password" className="form-control" placeholder="Password" required type="password" value={this.state.credentials.password} onChange={this.changePassword} />

				<button className="btn btn-lg btn-primary btn-block" id="go" type="submit">Sign In </button>
			</form>
		</div>
		);
	}
}

export default Form;
