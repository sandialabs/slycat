/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
import ko from "knockout";
import video_swarm from './js/vs-wizard.js';
import scrubber from './js/slycat-scrubber.js';

ko.components.register('VS', video_swarm);
ko.components.register('slycat-scrubber', scrubber);
