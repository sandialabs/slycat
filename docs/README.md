# Creating the documentation

# Installing requirements to build the docs

## Python environment

- `conda create --name slycat python==3.11`
- `pip install sphinx`
- `pip install sphinx-rtd-theme`

## Install make

### Mac

Option 1:

- `xcode-select --install`

Option 2:

- `brew install make`

## Windows

Option 1, install binary:

- `https://gnuwin32.sourceforge.net/packages/make.htm`

Options 2, install WSL (linux subsystem for windows):

- `https://learn.microsoft.com/en-us/windows/wsl/install`

## Ubuntu

- `sudo apt update`
- `make -version`

If no version shows up install it with `apt`

- `sudo apt install make`

# Building the docs

From `/docs` in the slycat repo run the following command

- `make html`

This should create a `_build` directory with the resulting sphynx documentation created from the build files.

# Other build options

```bsh
$ make
Sphinx v6.1.3
Please use `make target' where target is one of
  html        to make standalone HTML files
  dirhtml     to make HTML files named index.html in directories
  singlehtml  to make a single large HTML file
  pickle      to make pickle files
  json        to make JSON files
  htmlhelp    to make HTML files and an HTML help project
  qthelp      to make HTML files and a qthelp project
  devhelp     to make HTML files and a Devhelp project
  epub        to make an epub
  latex       to make LaTeX files, you can set PAPER=a4 or PAPER=letter
  latexpdf    to make LaTeX and PDF files (default pdflatex)
  latexpdfja  to make LaTeX files and run them through platex/dvipdfmx
  text        to make text files
  man         to make manual pages
  texinfo     to make Texinfo files
  info        to make Texinfo files and run them through makeinfo
  gettext     to make PO message catalogs
  changes     to make an overview of all changed/added/deprecated items
  xml         to make Docutils-native XML files
  pseudoxml   to make pseudoxml-XML files for display purposes
  linkcheck   to check all external links for integrity
  doctest     to run all doctests embedded in the documentation (if enabled)
  coverage    to run coverage check of the documentation (if enabled)
  clean       to remove everything in the build directory
  ```

# Adding the docs to the slycat webserver build

You will need to copy the built docs from `/docs/_build` to ~TBA
