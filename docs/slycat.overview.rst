Overview
========
Slycat™ is a web-based system for performing data analysis and visualization of potentially large quantities of remote, high-dimensional data.  Slycat™ specializes in working with ensemble data.  An ensemble is a group of related data sets, which typically consists of a set of simulation runs exploring the same problem space.  An ensemble can be thought of as a set of samples within a multi-variate domain, where each sample is a vector whose value defines a point in high-dimensional space.  To understand and describe the underlying problem being modeled in the simulations, ensemble analysis looks for shared behaviors and common features across the group of runs.  Additionally, ensemble analysis tries to quantify differences found in any members that deviate from the rest of the group. 

The Slycat™ system integrates data management, scalable analysis, and visualization.  Results are viewed remotely on a user’s desktop via commodity web clients using a multi-tiered hierarchy of computation and data storage, as shown in Figure 1.  Our goal is to operate on data as close to the source as possible, thereby reducing time and storage costs associated with data movement.  Consequently, we are working to develop parallel analysis capabilities that operate on High Performance Computing (HPC) platforms, to explore approaches for reducing data size, and to implement strategies for staging computation across the Slycat™ hierarchy. 

.. image:: SystemArch.png 
**Figure 1: Slycat multi-tiered hierarchy, designed for large data analysis and exploration with minimal data movement.**

Within Slycat™, data and visual analysis are organized around projects, which are shared by a project team.  Project members are explicitly added, each with a designated set of permissions. Although users sign-in to access Slycat™, individual accounts are not maintained.  Instead, authentication is used to determine project access.  Within projects, Slycat™ models capture analysis results and enable data exploration through various visual representations.  Although for scientists each simulation run is a model of real-world phenomena given certain conditions, we use the term model to refer to our modeling of the ensemble data, not the physics.  Different model types often provide complementary perspectives on data features when analyzing the same data set.  Each model visualizes data at several levels of abstraction, allowing the user to range from viewing the ensemble holistically to accessing numeric parameter values for a single run.  Bookmarks provide a mechanism for sharing results, enabling interesting model states to be labeled and saved.

Getting Started
---------------
Slycat™ is accessed through a web browser from your desktop computer.  Slycat™ currently supports Firefox, Chrome, and Safari browsers.  We do not support Internet Explorer.    

Since multiple Slycat™ servers are already in existence, you will need to obtain the URL for the Slycat™ server that you want to use.  Enter this URL into the address bar of the browser.  If the authentication mechanism for your institution relies on username and password, you will be taken to the Slycat™ login page, shown in Figure 2, where you will be prompted for your username and password.  If your institution uses single sign-on, login will happen automatically and you will skip this step.  Once your identity has been established, you will find yourself on the main Projects page.  

.. image:: LoginPage.png
**Figure 2: Slycat login page.**

Slycat™ pages exist at one of three levels: the main Projects page, an individual project page, and an individual model page.  The main Projects page displays all projects which you are authorized to access.  This list of projects is unique to you.  Clicking on a project name will take you to that project page, which will contain a list of all models that have been generated within the project.  Clicking on a model name will take you to that model page, which will display a visualization of its data.  At any level, clicking on the Slycat™ logo will return you to the main *Projects* page.  

The first time that you access the Slycat™ website, your projects list will probably be empty, unless someone else has already created a project and added you as a project member.  Since models cannot exist outside of a project, you must first create a project (see Project Creation below) before you can create a model.  Project-specific information consists of the project name, a list of project members, a set of models, and a set of saved bookmarks for models within that project.

Slycat™ Navbar
--------------
At the top of every Slycat™ page is the Navbar.  Working from left to right, we see the Slycat™ logo, a breadcrumb navigation path, and a set of colored buttons providing dropdown lists categorized by function.  Depending on the type of page currently being viewed, the buttons and the contents of the dropdowns will vary.  As shown in Figure 3, the Navbar for the main Projects page, the only button available is the green *Create* button for creating new projects.  Since the main Projects page lies outside and above any projects, the breadcrumb navigation path points to the current page, which is simply labeled as *Slycat*.  Figure 4 shows that for Navbars within a project or model page, there can be up to five buttons, including: *Create, Edit, Info, Bookmarks,* and *Delete*.  

.. image:: Figure3.png
**Figure 3: Slycat Navbar as seen on the main Projects page.  At this level, the Navbar displays the title Slycat because we have yet to move to an individual project page.**

.. image:: Figure4.png
**Figure 4: Navbar at the individual project page level.  Here the name of the project is ‘My Project’.  Note that the Bookmarks button is hidden until at least one bookmark has been created.**

As you move between pages at various levels, the breadcrumb path in the Navbar will change to reflect your current location.  The path has the format *Project Name / Model Name*.  The path can be used to navigate within the hierarchy.  Clicking on the *Project Name* will take you to that project’s page with its list of associated models.  Hovering over the *Project Name* will display the project description, the project members, the date of creation, and who created it (Figure 5).  Similarly, hovering over the *Model Name* will display the model description, the date of creation, and who created it.

.. image:: Figure5.png
**Figure 5: Hovering over the project name will display more detailed project information.**

Projects
--------

Models
------

Bookmarks
---------

Templates
---------
