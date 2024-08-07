import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

configure({ adapter: new Adapter() });
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
import $ from "jquery";
global.$ = global.jQuery = $;
global.localStorage = localStorageMock;
// https://github.com/jefflau/jest-fetch-mock
global.fetch = require('jest-fetch-mock')
// global.fetch = require('whatwg-fetch')