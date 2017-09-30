#!/bin/bash
# ******************************************************************************
# Argon Design Ltd. Project P8009 Alogic
# (c) Copyright 2017 Argon Design Ltd. All rights reserved.
#
# Module : afiddle
# Author : Steve Barlow
# $Id:$
#
# DESCRIPTION:
# Shell script to start an afiddle web server that is accessible from
# http://afiddle.argondesign.com.
#
# Opens a tabbed terminal window with 2 tabs - one for the server which
# is accessible at localhost:8000 and one for ngrok which is configured to
# tunnel this to the public web address.
# ******************************************************************************

gnome-terminal \
    --tab --title afiddle -e "node app.js" \
    --tab --title ngrok -x ngrok http -config ~/.ngrok2/ngrok.yml -region=eu -hostname=afiddle.argondesign.com 8000
