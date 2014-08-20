.. _Install Slycat:

Install Slycat
=================

As a convenience, we provide the Slycat Virtual Machine, a complete
virtual machine image that has Slycat and all its dependencies
preinstalled. Using the Slycat VM, you can quickly begin exploring
Slycat, try some tutorials, and run modest-size analyses on your own
data. Eventually you might want to :ref:`Setup Slycat Web Server` on your
own hardware to perform large-scale analyses.

Install the Virtual Machine
---------------------------

You will need to install a hypervisor on the host where you plan to run the
Slycat VM. The Slycat VM image is ready-to-use with `VirtualBox
<https://www.virtualbox.org>`_, an open-source hypervisor that runs well on
Windows, Linux, Mac, and most flavors of Unix. Once you've installed VirtualBox
on your host, you're ready to download the Slycat VM and get started:

-  Download the `Slycat VM image <http://sourceforge.net/projects/slycat/files/virtual-machines/slycatvm-20140820.ova/download>`__.
-  Start VirtualBox.
-  Choose *File > Import Appliance* and select the Slycat VM image you
   downloaded.
-  When prompted for "Appliance Settings", you may want to adjust the
   number of CPUs and the amount of RAM assigned to the VM, to match
   your hardware.
-  Once you are satisfied with the settings, click the *Import* button.
-  After the import is finished, a new "Slycat Virtual Machine" entry
   appears in VirtualBox Manager.

Get the Latest Slycat Source Code:
----------------------------------

The Slycat Virtual Machine doesn't change as often as Slycat itself, so
the next step is to ensure that your new VM has the latest Slycat source
code:

-  Select the Slycat Virtual Machine entry and choose *Machine > Start*
   to boot the virtual OS.
-  At the login prompt, select user "slycat" and enter password "slycat"
   when prompted.
-  In the VM desktop, choose *Applications > System Tools > Terminal* to
   open a shell window, and update the Slycat soure code to the latest
   version:

   ::

       $ cd -/src/slycat
       $ git pull

Start Slycat Web Server
-----------------------

::

        $ cd web-server
        $ python slycat-web-server.py

-  The Slycat Web Server begins running, waiting for requests on
   https://localhost:8092.
-  Leave the shell window open for the remainder of these tutorials.

Connect to Slycat with a Web Browser
------------------------------------

-  Within the VM desktop, choose *Applications > Internet > Chromium Web
   Browser* to start a web browser.
-  When the browser opens, its home page is already set to
   https://localhost:8092.
-  When prompted for a username and password, enter *slycat* for both.
-  The Slycat Projects page opens in the browser.

Next Steps
----------

-  That's it! Now that you're up-and-running, it's time to :ref:`Create a CCA Model`.

