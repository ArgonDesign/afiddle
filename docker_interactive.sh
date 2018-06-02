# ******************************************************************************
# Argon Design Ltd. Project P8009 Alogic
# (c) Copyright 2017-8 Argon Design Ltd. All rights reserved.
#
# Module : afiddle
# Author : Steve Barlow
# $Id:$
#
# DESCRIPTION:
# Shell script to start an interactive shell with an afiddle Docker container.
# Note that this must be used with source, not executed as a command.
#
# Usage: source interactive.sh
# ******************************************************************************

docker run -it afiddle /bin/bash
