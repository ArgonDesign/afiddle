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
# Shell script to start an afiddle web server running locally that is accessible
# from http://afiddle.argondesign.com. Afiddle must have already been built with
# 'make build'.
#
# Opens a tabbed terminal window with 2 tabs - one for the server which is
# accessible at localhost:8000 and one for ngrok which is configured to tunnel
# this to the public web address.
#
# # ~/.ngrok2/ngrok.yml contains our ngrok authtoken.
# ******************************************************************************

gnome-terminal \
    --tab --title afiddle -e "node app.js --port 8000" \
    --tab --title ngrok -x ngrok http -config ~/.ngrok2/ngrok.yml -region=eu -subdomain=afiddle_dev 8000

# Access at http://afiddle.argondesign.com
