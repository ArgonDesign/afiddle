# *******************************************************************************
# Argon Design Ltd. Project P8009 Alogic
# (c) Copyright 2017-8 Argon Design Ltd. All rights reserved.
#
# Module : afiddle
# Author : Steve Barlow
# $Id:$
#
# DESCRIPTION:
# Makefile to install and build packages required to run afiddle. Valid targets
# are:
#
# make build        (This is the default if you just run make.) Firstly,
#                   downloads and installs the node.js packages used such as
#                   Express and Monaco editor. These are stored in node_modules.
#                   Then downloads and installs the client side Javascript
#                   libraries used using bower. These are stored in
#                   bower_components. Then downloads alogic into the
#                   alogic_install directory and builds it.
#
#                   Once built, the server can be run by executing app.js, either
#                   with ./app.js, node app.js or npm start. See app.js for
#                   command details.
#
# make clean        Remove all downloaded files and the runpen and logs
#                   directories which are created when running.
#
# make standard     Checks that the node and client side Javascript code conforms
#                   to Javascript Standard Style (as specified in
#                   https://standardjs.com/).
#
# The Makefile also includes targets to create a Docker image that can be
# deployed in the cloud:
#
# make dockerbuild  Create a docker image named afiddle. The recipe is
#                   specified in Dockerfile. Note that this invokes make build
#                   and make build includes options to allow building as root,
#                   so it can be used in the Dockerfile. The image is build
#                   without using the cache to assure its integrity.
#
# make dockerclean  Kill all running Docker containers, remove all images and
#                   all containers. Note that this is much more invasive than
#                   just this application and affects all uses of Docker on
#                   the machine.
#
# Things that must be already installed before running a local build. Not
# required to build a Docker image:
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
#
# Things that must be already installed to build an Docker image:
#
# 1. docker (https://www.docker.com/)
#    To install on Ubuntu see https://docs.docker.com/install/linux/docker-ce/ubuntu/
# *******************************************************************************

.PHONY: all build clean standard dockerimage dockerclean

default: build

build:
	npm install
	cd front_end ; npm install
	./alogic update

clean:
	rm -rf alogic_install node_modules front_end/node_modules runpen logs

standard:
	node_modules/.bin/standard *.js front_end/static/js/*.js
    
dockerbuild:
	docker build --no-cache -t afiddle .

dockerclean:
	-docker kill $$(docker ps -q)
	-docker rm $$(docker ps --filter=status=exited --filter=status=created -q)
	-docker rmi --force $$(docker images -a -q)
