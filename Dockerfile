# ******************************************************************************
# Argon Design Ltd. Project P8009 Alogic
# (c) Copyright 2017-8 Argon Design Ltd. All rights reserved.
#
# Module : afiddle
# Author : Steve Barlow
# $Id:$
#
# DESCRIPTION:
# Recipe for afiddle Docker image
# *******************************************************************************

# Useful websites:
# https://docs.docker.com/get-started/part2/
# https://stackoverflow.com/questions/35594987/how-to-force-docker-for-clean-build-of-an-image
# https://forums.docker.com/t/how-to-delete-cache/5753/2
# https://backports.debian.org/Instructions/
# https://www.scala-sbt.org/1.0/docs/Installing-sbt-on-Linux.html
# https://groups.google.com/forum/#!topic/grpc-io/4uuSRqfyDxY

# Attempts to reproduce package versions of afiddle running on Athene

FROM node:4.7.3
# Linux is Debian 8.7 (jessie)
# Includes nodejs, npm and git

MAINTAINER Steve Barlow <steve.barlow@argondesign.com>

RUN apt-get update

# Install JDK 8 (Java 1.8.x)
RUN echo "deb http://ftp.debian.org/debian jessie-backports main" | tee -a /etc/apt/sources.list.d/jdk.list
RUN apt-get update
RUN apt-get -t jessie-backports install -y openjdk-8-jdk

# Install sbt 1.1.0
RUN echo "deb http://dl.bintray.com/sbt/debian /" | tee -a /etc/apt/sources.list.d/sbt.list
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2EE0EA64E40A89B84B2DF73499E82A75642AC823
RUN apt-get update
RUN apt-get install -y sbt=1.1.0
RUN sbt sbtVersion

# Add afiddle files
# Uses .dockerignore to exclude files that must be re-created
ADD . /afiddle
WORKDIR /afiddle

RUN make

EXPOSE 80

# Run app.js when the container launches
CMD ["node", "app.js", "--port", "80", "--logging", "stackdriver"]
