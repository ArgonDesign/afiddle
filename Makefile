# *******************************************************************************
# Argon Design Ltd. Project P8009 Alogic
# (c) Copyright 2017 Argon Design Ltd. All rights reserved.
#
# Module : afiddle
# Author : Steve Barlow
# $Id:$
#
# DESCRIPTION:
# Makefile to install and build packages required to run afiddle. Valid targets
# are:
#
# make build    (This is the default if you just run make.) Firstly, downloads and
#               installs the node.js packages used such as Express and Monaco editor.
#               These are stored in node_modules. Then downloads and installs the
#               client side Javascript libraries used using bower. These are stored
#               in bower_components. Then downloads alogic into the alogic_install
#               directory and builds it.
#
# make clean    Remove all downloaded files and the runpen and logs directories which
#               are created when running.
#
# make standard Checks that the node and client side Javascript code conforms to
#               Javascript Standard Style (as specified in https://standardjs.com/).
#
# Once built, the server can be run by executing app.js, either with ./app.js,
# node app.js or npm start. The location of the runpen and log directories is
# set by constants at the top of app.js. As currently set up, regardless of where
# the server is run from it puts its runpen and log files in the same directory as
# the code.
#
# The server operates on localhost:8000. This can also be changed with constants
# at the top of app.js. We usually expose the server to the outside world using
# ngrok. The shell script run.sh can be used to start both ngrok and the server.
#
# Things that must be already installed before building:
#
# 1. node.js and npm (http://nodejs.org/)
#    On Ubuntu/Debian try: sudo apt-get install nodejs npm
#
# 2. git (https://git-scm.com/)
#    On Ubuntu/Debian try: sudo apt-get install git
#
# 3. sbt (http://www.scala-sbt.org/)
#    This is the Scala build tool and development environment
#    On Ubuntu/Debian try: sudo apt-get install sbt
# *******************************************************************************

.PHONY: all build clean standard

default: build

build:
	npm install
	node_modules/.bin/bower --allow-root install
	./alogic update

clean:
	rm -rf alogic_install node_modules bower_components runpen logs

standard:
	node_modules/.bin/standard *.js static/js/*.js
    
