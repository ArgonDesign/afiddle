Afiddle
=======

Afiddle is a 'fiddle' for the **Alogic** mid-level hardware design language. It allows the user to enter Alogic code in a browser editor window and immediately see the Verilog that is produced by the Alogic compiler.

Alogic is a mid-level hardware design language developed by Argon Design. It sits between HLS languages like Catapult C or BlueSpec and low-level languages like Verilog and VHDL. It provides abstraction of standard data flow structures used between modules and in pipelines and simplifies writing state machines, but maintains the explicit nature of a low-level language, where the user knows exactly what is being synthesised. See the [Alogic Web Page](https://github.com/ArgonDesign/alogic).

Afiddle comprises a web server written in node.js that serves HTML and client-side Javascript for the fiddle page. The Alogic compiler, which is written in Scala runs on the server. The client uses [Golden Layout](http://golden-layout.com/) and the [Microsoft Visual Studio Monaco text editor](https://github.com/Microsoft/monaco-editor). 

![Afiddle Screenshot](screenshot.png) 

Installation and Set-up
-----------------------

Afiddle can be run either as a local server or as a Docker container on a cloud platform.

### Local

The following packages must be installed to build the server:

1. node.js and npm (http://nodejs.org/)
   <br/>On Ubuntu/Debian try: `sudo apt-get install nodejs npm`

2. git (https://git-scm.com/)
   <br/>On Ubuntu/Debian try: `sudo apt-get install git`

3. sbt (http://www.scala-sbt.org/)
   <br/>This is the Scala build tool and development environment
   <br/>On Ubuntu/Debian try: `sudo apt-get install sbt`

Then to download and install afiddle and its dependencies:

```bash
$ git clone https://github.com/ArgonDesign/afiddle
$ cd afiddle
$ make
```

Once built, the server can be run by executing **app.js**, either with `./app.js`, `node app.js` or `npm start`. With the first two methods, command line arguments are supported to set the port and the logging option. See the documentation at the top of **app.js** for details.

We usually run it using port 8000 and exposing the server to the outside world using [ngrok](https://ngrok.com/). The shell script `run.sh` can be used to start both ngrok and the server.

The server uses a directory `runpen` to temporarily store user-entered code in files for the Alogic compiler to work on. There is also a directory `logs` for log files. The locations of these directories can be set by constants at the top of the apps.js file.

### Cloud

The following packages must be installed (note the packages for local building above are not required as the Docker build process downloads and installs them in the container):

1. docker (https://www.docker.com)
   <br/>On Ubuntu see https://docs.docker.com/install/linux/docker-ce/ubuntu/ for install instructions

2. git (https://git-scm.com/)
   <br/>On Ubuntu/Debian try: `sudo apt-get install git`

Then to download afiddle and build a Docker image:

```bash
$ git clone https://github.com/ArgonDesign/afiddle
$ cd afiddle
$ make dockerbuild
```

An image named `afiddle` is created in the Docker local repository. The image is set up to serve on port 80. It outputs log information to Google Stackdriver. Stackdriver supports both AWS and Google Cloud. If running on a different cloud system, the container will work, but there won't be a recorded log.

To deploy the image in the cloud, look at `google_cloud_deploy.md` which shows the steps to run it on Google Cloud Kubernetes Engine (GKE).

Webserver Endpoints
-------------------

The main server endpoint is `/`. This serves the HTML for the page, which pulls in the CSS and Javascript code. The example code in the source window prior to editing can be set by adding a query string. `/?example=<filename>` sets it from the file `examples/<filename>`. If no query string is present then the file `examples/defaultExample.alogic` is used.  

The endpoint `/compile` is used to submit an Alogic file for compilation. The client side code POSTs to this with the Alogic source. The data type must be `text/alogic`. The server responds with text which is either the Verilog results or a list of errors. In either case the results are suitable to be directly displayed in the right-hand-side fiddle window. If the compilation generates multiple Verilog files, they are concatenated with a ==> FILENAME <== before each file, in the same way as `tail`.

The endpoint `/privacy` serves a web page with privacy information.

Tour of Files
-------------

| Directory/file              | Description |
|-----------------------------|-------------|
|examples/                    | Files that can be chosen as initial text in the source window |
|front_end/                   | Files used in front-end - i.e. on client side |
|front_end/static/            | Static files served to the client. Contains static HTML files and subdirectories for `css`, `images` and `js` files. Look particularly at the main client-side Javascript, `js/index.js` |
|front_end/views/             | Contains main page HTML template `index.mustache` |
|front_end/packgage.json      | Control file for `npm` which installs/updates client side Javascript libraries. Contains the names and version numbers of all the libraries used. Libraries are downloaded to the directory `front_end/node_modules` |
|front_end/packgage-lock.json | Control file for `npm`. Defines the exact tree that should be created |
|test/                        | Short Alogic files used in testing |
|alogic*                      | Script to run Alogic compiler. Also used as `./alogic update` to install/update Alogic from Github |
|app.js                       | Main code of afiddle server |
|docker_interactive.sh        | Shell script to start an interactive shell session with an afiddle Docker container |
|docker_run.sh                | Shell script to run an afiddle Docker container locally and tunnel it to a public web address. Used for testing only |
|google_cloud_deploy.md       | Note on how to deploy afiddle Docker container to Google Cloud Kubernetes Engine (GKE)
|LICENSE                      | Details of license for afiddle. It is licensed under the BSD 3-clause license with attribution (https://spdx.org/licenses/BSD-3-Clause-Attribution.html) | 
|Makefile                     | Build file using `make` |
|package.json                 | Control file for Node package manager `npm`. Contains the names and version numbers of all the server packages used. Packages are downloaded to the directory `node_modules` |
|packgage-lock.json           | Control file for `npm`. Defines the exact tree that should be created |
|README.md                    | This file |
|run.sh*                      | Shell script to start both the server and an `ngrok` session to tunnel it to a public web address |
|screenshot.png               | Screenshot used in this README |
|screenshot_log.png           | Screenshot used in `google_cloud_deploy.md` showing Stackdriver logging in Google Console |

Directories created during installation and in operation:

| Directory/file        | Description |
|-----------------------|-------------|
|alogic_install/        | Directory where the Alogic compiler is installed |
|front_end/node_modules | Javascript libraries used by client-side code |
|logs/                  | Server log files. Logs are stored in a 5-file rotating sequence. |
|node_modules/          | Node.js packages used by server |
|runpen/                | Directory used to store source files entered in the web page so they can be compiled by the Alogic compiler. Each compile request creates a new directory with a 4-digit number, such as `0002`; the number increments with each request. Within this the server  creates an `alogic` subdirectory and a `verilog` subdirectory. The source code is then stored as `input.alogic` in the `alogic` directory. Once the compilation is completed, the numbered directory is deleted |
