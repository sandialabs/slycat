import ko from "knockout";

// import and register dac input wizard
import dial_a_cluster from './js/dac-wizard';
import dac_preferences_wizard from "./js/dac-preferences-wizard";
import parse_log from "./js/dac-parse-log"
import table_wizard from "./js/dac-table-wizard"

ko.components.register('DAC', dial_a_cluster);
ko.components.register('dac-preferences-wizard', dac_preferences_wizard);
ko.components.register('dac-show-parse-log', parse_log);
ko.components.register('dac-table-wizard', table_wizard)