#!/bin/bash
# ******************************************************************************
# Argon Design Ltd. Project P8009 Alogic
# (c) Copyright 2017-8 Argon Design Ltd. All rights reserved.
#
# Module : afiddle
# Author : Steve Barlow
# $Id:$
#
# DESCRIPTION:
# Shell script to run an afiddle Docker container locally and tunnel the web
# site to the public address http://afiddle_dev.eu.ngrok.io. The docker
# container must have already been created with 'make dockerbuild'.
#
# This is primarily for testing. The container should be run in the cloud for
# production.
#
# Opens a tabbed terminal window with 2 tabs - one for the server which is
# accessible at localhost:8001 and one for ngrok which is configured to tunnel
# this to the public address.
#
# The --init flag allows the container to be stopped with Ctrl-C in the window.
#
# Note that running in a container the app thinks it isn't connected to a TTY
# and doesn't produce logging to the console.
#
# ~/.ngrok2/ngrok.yml contains our ngrok authtoken.
# ******************************************************************************

gnome-terminal \
    --tab --title afiddle -e "docker run --init --rm -p 8001:80 afiddle" \
    --tab --title ngrok -x ngrok http -config ~/.ngrok2/ngrok.yml -region=eu -subdomain=afiddle_dev 8001

# Access at http://afiddle_dev.eu.ngrok.io
